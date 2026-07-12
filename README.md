# ocr-cam

Headless browser OCR with camera support using ONNX Runtime Web (WASM) and PaddleOCR-style DBNet/CRNN models.

Live demo: https://Duffy1001.github.io/ocr-cam/

**Client-side only.** Camera frames never leave the device.

## Features

- Explicit ONNX/WASM model loading — no side effects on import
- Camera start and stop controls with full lifecycle management
- Continuous OCR of camera frames with configurable FPS
- Two-stage pipeline: DBNet-style detection + CRNN-style recognition
- Structured OCR results with bounding boxes
- Configurable OCR crop region (normalized or source pixels)
- Optional live camera view with crop mask and bounding-box overlay
- Drawing/annotation layer
- Typed event system with unsubscribe functions
- Stale-result rejection — results arriving after stop/destroy are discarded
- ONNX Runtime pinned to `onnxruntime-web@1.21.0`

## Installation

```bash
npm install ocr-cam
```

## Browser Requirements

- Chrome 90+, Edge 90+, Firefox 79+, Safari 15.2+
- WebAssembly support
- `navigator.mediaDevices.getUserMedia()` (for camera features)
- HTTPS or localhost (required for camera access)
- Cross-origin isolation (recommended for WASM performance):
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```

## Quick Start

```ts
import { createBrowserOcr } from "ocr-cam";

const ocr = createBrowserOcr({
  engine: {
    detectorModelUrl: "/models/detector.onnx",
    recognizerModelUrl: "/models/recognizer.onnx",
    wasmPath: "/onnx/",
  },
  onResult(result) {
    console.log(result.text, result.detections);
  },
});

await ocr.load();
const session = await ocr.startCamera();
ocr.attachView(document.querySelector("#scanner"));
```

## Lifecycle / State Machine

The controller follows a strict state machine:

```
idle → loading → ready → starting-camera → running → stopping-camera → ready
                         ↓                            ↓
                       error                        error
```

States:
- **idle** — created, nothing loaded
- **loading** — `load()` called, ONNX sessions being created
- **ready** — models loaded, camera can be started
- **starting-camera** — `startCamera()` called, awaiting `getUserMedia`
- **running** — camera active, frames being processed
- **stopping-camera** — `stopCamera()` called, tracks being released
- **error** — an error occurred; `load()` can be retried
- **destroyed** — `destroy()` called; no further operations possible

## Asset Hosting

You must host these files:

1. **ONNX Runtime Web WASM files** — from `node_modules/onnxruntime-web/dist/`
2. **Detection model** — your `.onnx` text detection model
3. **Recognition model** — your `.onnx` text recognition model

Example structure:
```
public/
  onnx/
    ort-wasm.wasm
    ort-wasm-simd.wasm
  models/
    detector.onnx
    recognizer.onnx
```

### Copying WASM files

```bash
cp -r node_modules/onnxruntime-web/dist/* public/onnx/
```

## Model Assumptions

This library expects a **two-stage pipeline** with specific model architectures. Custom models must conform to these interfaces or you must provide a custom `OcrEngine`.

### Detector (DBNet-style)

| Property | Value |
|----------|-------|
| Input tensor | `[1, 3, H, W]` float32, NCHW layout |
| Input preprocessing | RGB, `[0,1]` then ImageNet mean/std: mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]` |
| Output tensor | `[1, 1, mapH, mapW]` — probability map |
| Output postprocessing | Auto-detects logits vs probabilities (applies sigmoid if any value >1 or <0) |
| Connected-component extraction | BFS flood-fill with 4-connectivity, minimum 3 pixels per component |
| NMS | IoU-based, default threshold 0.4 |

**Default input size:** 640x640 (configurable via `detectorInputWidth`/`detectorInputHeight`)

### Recognizer (CRNN-style)

| Property | Value |
|----------|-------|
| Input tensor | `[1, 3, recH, recW]` float32, NCHW layout |
| Input preprocessing | Same as detector (ImageNet normalization) |
| Output tensor | `[1, T, numClasses]` — logit sequence |
| Decoder | CTC greedy (argmax + dedup + remove blank) |
| Default input height | 32 (configurable via `recognizerInputHeight`) |
| Default input width | 320 (configurable via `recognizerInputWidth`) |

**CTC configuration:**
- Blank token index: `0` (configurable via `blankTokenIndex`)
- Default alphabet: `abcdefghijklmnopqrstuvwxyz0123456789` (36 characters)
- Alphabet indices: `0` = blank, `1` = 'a', `2` = 'b', ..., `36` = '9'

## Engine Configuration

```ts
const ocr = createBrowserOcr({
  engine: {
    // Required
    detectorModelUrl: "/models/detector.onnx",
    recognizerModelUrl: "/models/recognizer.onnx",
    wasmPath: "/onnx/",

    // Detector options
    detectorInputWidth: 640,       // default 640
    detectorInputHeight: 640,      // default 640
    detectionThreshold: 0.5,       // probability threshold
    nmsIouThreshold: 0.4,          // NMS IoU threshold
    minDetectionBoxArea: 100,      // min bounding box area (px²)

    // Recognizer options
    recognizerInputHeight: 32,     // default 32
    recognizerInputWidth: 320,     // default 320
    alphabet: "abcdefghijklmnopqrstuvwxyz0123456789",
    blankTokenIndex: 0,

    // Optional: specify tensor names (auto-detected by default)
    detectorInputName: "input",
    detectorOutputName: "output",
    recognizerInputName: "input",
    recognizerOutputName: "output",
  },
});
```

## Camera Permission Behavior

Camera permission is **only** requested when `startCamera()` is called. Importing or creating the OCR instance does not request permission.

When the camera is stopped, all tracks are released. The library does not hold camera access after `stopCamera()` resolves.

## Starting and Stopping

```ts
// Start camera
const session = await ocr.startCamera();
console.log(`Camera started: ${session.width}x${session.height}`);

// Stop camera (releases all tracks, destroys view)
await ocr.stopCamera();

// Restart is safe
await ocr.startCamera();
ocr.attachView(container);
```

## Result Structure

Each OCR result contains:

```ts
interface OcrResult {
  sessionId: number;        // incremented on each startCamera() call
  frameId: number;          // incremented per frame within a session
  timestamp: number;        // requestVideoFrameCallback timestamp
  sourceSize: { width: number; height: number };
  crop: PixelRect | null;   // resolved crop in source pixels
  detections: OcrDetection[];
  text: string;             // combined text from all detections
  inferenceDurationMs?: number;
}

interface OcrDetection {
  text: string;
  confidence: number;
  box: PixelRect;           // bounding box in source coordinates
}
```

All coordinates are in the original camera source coordinate system.

## Crop Configuration

Supports both normalized and source-pixel crop definitions:

```ts
// Source pixels (scanner-style)
ocr.setCrop({
  unit: "source-px",
  width: 300,
  height: 100,
  anchor: "center",
});

// Normalized (0-1)
ocr.setCrop({
  unit: "normalized",
  x: 0.25,
  y: 0.25,
  width: 0.5,
  height: 0.5,
});

// Remove crop (OCR full frame)
ocr.setCrop(null);
```

## Attaching and Detaching the View

The view is **opt-in**. Nothing is attached to the DOM until you call `attachView()`:

```ts
const handle = ocr.attachView(container, {
  outsideCropOpacity: 0.6,
  showBoundingBoxes: true,
  showCropBorder: true,
  showRecognizedText: false,
  drawingEnabled: false,
});

// Explicitly detach (also happens automatically on camera stop)
handle.detach();
// or
ocr.detachView();
```

The view moves the provided `<video>` element into the wrapper; it does not clone it.

## Annotation Behavior

Drawing is **disabled** by default. Enable it explicitly:

```ts
ocr.setDrawingEnabled(true);
ocr.clearDrawing();
```

Annotations are destroyed when the camera stops. Drawing coordinates are preserved in the annotation stroke data.

## Events

```ts
ocr.on("statechange", (state) => { /* OcrState */ });
ocr.on("actionschange", (actions) => { /* OcrActionState */ });
ocr.on("result", (result) => { /* OcrResult */ });
ocr.on("error", (error) => { /* OcrError */ });
ocr.on("cropchange", (crop) => { /* ResolvedCropRegion | null */ });
ocr.on("camerastart", (info) => { /* CameraSessionInfo */ });
ocr.on("camerastop", () => { /* void */ });
```

All `on()` calls return an unsubscribe function:

```ts
const unsub = ocr.on("result", handleResult);
// later:
unsub();
```

## Cleanup

```ts
await ocr.destroy();

// After destroy(), all methods throw OcrError with code "DESTROYED"
// except detachView(), setDrawingEnabled(), clearDrawing() which are safe no-ops
```

`destroy()`:
- Stops the frame scheduler
- Stops the camera and releases all tracks
- Destroys the view and drawing layer
- Removes all event listeners
- Disposes the OCR engine and frees model resources

## Privacy Guarantees

- Camera frames are processed entirely on-device
- No frames are uploaded to any server
- No analytics services are contacted
- Recognized text is not persisted or logged remotely
- The only network requests are for loading JS, WASM, and model assets you configure

## Custom Engine

You can provide a custom `OcrEngine` to use a different inference backend:

```ts
import { createBrowserOcr, type OcrEngine } from "ocr-cam";

const myEngine: OcrEngine = {
  async load() { /* initialize */ },
  async recognize(frame, context, signal) {
    // frame.imageData: ImageData
    // frame.width, frame.height: dimensions
    // context: { sessionId, frameId, timestamp, crop, sourceSize }
    return {
      detections: [{ text: "hello", confidence: 0.95, box: { x: 0, y: 0, width: 100, height: 20 } }],
      inferenceDurationMs: 12,
    };
  },
  async dispose() { /* cleanup */ },
};

const ocr = createBrowserOcr({ engine: { detectorModelUrl: "", recognizerModelUrl: "", wasmPath: "" } }, myEngine);
```

## Testing

```bash
npm test              # run all tests (unit + integration)
npm run test:watch    # watch mode
npm run typecheck     # type-check without emitting
npm run build         # production build to dist/
```

## Known Limitations

- OCR accuracy depends on the quality of the loaded models
- Real-time performance depends on device capability and model size
- WebAssembly backend only; WebGPU support may be added in the future
- At most one inference job runs at a time; backpressure uses latest-frame strategy
- The crop mask is visual only — pixels outside the crop are excluded from OCR but remain visible
