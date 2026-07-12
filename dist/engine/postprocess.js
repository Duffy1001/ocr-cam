/**
 * Detection and recognition post-processing.
 *
 * Model assumptions:
 *   - Detector outputs a single probability map of shape [1, 1, H, W]
 *     with values in [0, 1] after sigmoid.
 *   - Connected components above a threshold are extracted as text regions.
 *   - Each region is converted to a bounding box in source coordinates.
 *   - NMS removes overlapping detections.
 *
 *   - Recognizer outputs logits of shape [1, T, numClasses].
 *   - CTC greedy decoding is used (argmax + dedup + remove blank).
 *   - The blank token index is configurable (default: 0 for CTC convention).
 */
// ─── Non-Maximum Suppression ─────────────────────────────────────────────────
function computeIoU(a, b) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = a.width * a.height + b.width * b.height - inter;
    return union > 0 ? inter / union : 0;
}
export function nms(boxes, iouThreshold) {
    const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
    const keep = [];
    const suppressed = new Uint8Array(sorted.length);
    for (let i = 0; i < sorted.length; i++) {
        if (suppressed[i])
            continue;
        keep.push(sorted[i]);
        for (let j = i + 1; j < sorted.length; j++) {
            if (suppressed[j])
                continue;
            if (computeIoU(sorted[i], sorted[j]) > iouThreshold) {
                suppressed[j] = 1;
            }
        }
    }
    return keep;
}
// ─── Connected-component extraction from a probability map ────────────────────
export function extractBoxesFromProbabilityMap(prob, mapW, mapH, srcW, srcH, threshold, minBoxArea, opts) {
    const padW = opts?.padW ?? mapW;
    const padH = opts?.padH ?? mapH;
    const offsetX = opts?.offsetX ?? 0;
    const offsetY = opts?.offsetY ?? 0;
    const resizeW = opts?.resizeW ?? padW;
    const resizeH = opts?.resizeH ?? padH;
    const visited = new Uint8Array(mapW * mapH);
    const boxes = [];
    for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
            const idx = y * mapW + x;
            if (visited[idx] || prob[idx] < threshold)
                continue;
            // BFS flood fill
            let minX = x, maxX = x, minY = y, maxY = y;
            let sumConf = 0, count = 0;
            const queue = [idx];
            visited[idx] = 1;
            while (queue.length > 0) {
                const cur = queue.pop();
                const cx = cur % mapW;
                const cy = (cur - cx) / mapW;
                const val = prob[cur];
                if (val < threshold)
                    continue;
                sumConf += val;
                count++;
                if (cx < minX)
                    minX = cx;
                if (cx > maxX)
                    maxX = cx;
                if (cy < minY)
                    minY = cy;
                if (cy > maxY)
                    maxY = cy;
                // 4-connected neighbours
                if (cx > 0 && !visited[cur - 1]) {
                    visited[cur - 1] = 1;
                    queue.push(cur - 1);
                }
                if (cx < mapW - 1 && !visited[cur + 1]) {
                    visited[cur + 1] = 1;
                    queue.push(cur + 1);
                }
                if (cy > 0 && !visited[cur - mapW]) {
                    visited[cur - mapW] = 1;
                    queue.push(cur - mapW);
                }
                if (cy < mapH - 1 && !visited[cur + mapW]) {
                    visited[cur + mapW] = 1;
                    queue.push(cur + mapW);
                }
            }
            if (count < 3)
                continue;
            // Map prob-map coords → padded input coords → resized image coords → source coords.
            // We treat (min..max) bounds as inclusive pixel indices and convert to edge coordinates via (max+1).
            const mapX1 = minX;
            const mapX2 = maxX + 1;
            const mapY1 = minY;
            const mapY2 = maxY + 1;
            // prob-map pixel edges in padded-input pixel space
            const inX1 = (mapX1 / mapW) * padW;
            const inX2 = (mapX2 / mapW) * padW;
            const inY1 = (mapY1 / mapH) * padH;
            const inY2 = (mapY2 / mapH) * padH;
            // remove letterbox offset to get resized-image edges
            const rX1 = inX1 - offsetX;
            const rX2 = inX2 - offsetX;
            const rY1 = inY1 - offsetY;
            const rY2 = inY2 - offsetY;
            // map resized-image edges back to source edges
            const srcX1 = rX1 * (srcW / resizeW);
            const srcX2 = rX2 * (srcW / resizeW);
            const srcY1 = rY1 * (srcH / resizeH);
            const srcY2 = rY2 * (srcH / resizeH);
            const bx = Math.max(0, srcX1);
            const by = Math.max(0, srcY1);
            const bw = Math.max(0, Math.min(srcW, srcX2) - bx);
            const bh = Math.max(0, Math.min(srcH, srcY2) - by);
            if (bw <= 0 || bh <= 0)
                continue;
            if (bw * bh < minBoxArea)
                continue;
            boxes.push({
                x: bx,
                y: by,
                width: bw,
                height: bh,
                confidence: sumConf / count,
            });
        }
    }
    return boxes;
}
// ─── Convert DetectionBox[] to OcrDetection[] ────────────────────────────────
export function boxesToDetections(boxes) {
    return boxes.map((b) => ({
        text: "",
        confidence: b.confidence,
        box: {
            x: Math.round(b.x),
            y: Math.round(b.y),
            width: Math.round(b.width),
            height: Math.round(b.height),
        },
    }));
}
// ─── CTC greedy decoder ──────────────────────────────────────────────────────
/**
 * Decode a [T, numClasses] logit array using CTC greedy decoding.
 *
 * - `blankIndex`: CTC blank token (default 0).
 * - `charList`: array indexed by model output class. charList[blankIndex] is ignored.
 *   Example: ["", "a", "b", ..., " "] where index 0 = blank, 1 = first char, etc.
 *
 * Output: collapse consecutive identical non-blank tokens.
 */
export function ctcGreedyDecode(logits, timesteps, numClasses, charList, blankIndex) {
    const result = [];
    let prevIdx = -1;
    for (let t = 0; t < timesteps; t++) {
        let maxVal = -Infinity;
        let maxIdx = 0;
        const offset = t * numClasses;
        for (let c = 0; c < numClasses; c++) {
            const v = logits[offset + c] ?? -Infinity;
            if (v > maxVal) {
                maxVal = v;
                maxIdx = c;
            }
        }
        if (maxIdx !== blankIndex && maxIdx !== prevIdx) {
            const ch = charList[maxIdx];
            if (ch)
                result.push(ch);
        }
        prevIdx = maxIdx;
    }
    return result.join("");
}
//# sourceMappingURL=postprocess.js.map