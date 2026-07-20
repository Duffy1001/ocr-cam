# ocr-cam

An experimental, headless camera-scanning controller for browser OCR.

`ocr-cam` manages browser camera access, frame scheduling, crop regions, result events, overlays, and OCR session lifecycle. It includes an ONNX Runtime Web engine designed around DBNet-style text detection and CRNN-style text recognition models.

The OCR models and algorithms are not unique to this project. The main goal is to provide reusable browser-camera orchestration around an OCR engine.

> **Project status:** early development. The API may change, documentation is incomplete, and the package is not currently published to npm.

## What it does

* Starts and stops the browser camera safely
* Processes camera frames at a configurable rate
* Prevents multiple inference jobs from running at once
* Rejects stale results after a camera session stops
* Supports normalized and pixel-based crop regions
* Emits typed lifecycle and OCR result events
* Provides an optional camera view with crop and detection overlays
* Allows a custom OCR engine to be supplied
* Runs inference in the browser using ONNX Runtime Web

## What it does not include

* OCR model files bundled inside the JavaScript package
* Automatic selection of a model for every language or use case
* A universal interface for arbitrary ONNX OCR models
* Guaranteed real-time performance on every device
* Production stability guarantees
* A published npm package

The example application uses working model assets hosted through jsDelivr. Those assets can be used for testing, but applications should generally self-host their model, dictionary, and ONNX Runtime assets for predictable versions, caching, availability, and deployment control.

## Installation

### npm

The package is **not currently published to npm**.

This command will not work yet:

```bash
npm install ocr-cam
```

### Run from source

```bash
git clone https://github.com/TrystinDuffy/ocr-cam.git
cd ocr-cam
npm install
npm run build
```

The compiled package is written to `dist/`.

For local development in another project:

```bash
# In ocr-cam
npm link

# In your application
npm link ocr-cam
```

## Model assets

`ocr-cam` requires compatible detection and recognition models. It does not embed these large assets in the library bundle.

The included example page loads known-compatible model assets through jsDelivr, so the demo works without requiring users to find models first.

For experimentation, you can use the same URLs as the demo. For production, self-hosting is recommended so that you control:

* Model versions
* Asset availability
* Cache behavior
* Cross-origin headers
* Deployment changes
* Supply-chain dependencies

A typical self-hosted setup looks like this:

```text
public/
  onnx/
    ort-wasm.wasm
    ort-wasm-simd.wasm
  models/
    detector.onnx
    recognizer.onnx
    dict.txt
```

Configure the URLs when creating the OCR controller:

```ts
const ocr = createBrowserOcr({
  engine: {
    detectorModelUrl: "/models/detector.onnx",
    recognizerModelUrl: "/models/recognizer.onnx",
    dictUrl: "/models/dict.txt",
    wasmPath: "/onnx/",
  },
});
```

The models used by the demo are examples of known-compatible assets, not a guarantee that every DBNet or CRNN ONNX export will work. Tensor shapes, preprocessing, output formats, dictionaries, and class ordering must match the engine’s expectations.

## Project status

This project is in early development.

The browser demo is functional and demonstrates the intended camera and OCR workflow. However:

* The package is not yet published to npm
* The public API may change
* Browser and mobile testing is still limited
* Model compatibility is narrower than the architecture names alone suggest
* Production applications should pin and self-host their assets

## Basic usage

```ts
import { createBrowserOcr } from "ocr-cam";

const ocr = createBrowserOcr({
  engine: {
    detectorModelUrl: "/models/detector.onnx",
    recognizerModelUrl: "/models/recognizer.onnx",
    dictUrl: "/models/dict.txt",
    wasmPath: "/onnx/",
  },

  onResult(result) {
    console.log(result.text);
  },
});

await ocr.load();
await ocr.startCamera();

const container = document.querySelector<HTMLElement>("#scanner");

if (container) {
  ocr.attachView(container);
}
```

Camera access requires HTTPS or localhost.

## Why use this instead of calling an OCR engine directly?

The project is mainly intended to handle the browser-specific work around continuous camera OCR:

* Camera permission and media-track cleanup
* Explicit loading and running states
* Frame throttling and backpressure
* Crop coordinate conversion
* Session and frame identifiers
* Stale asynchronous result rejection
* Optional rendering and annotation layers

It is not intended to introduce a new OCR architecture.

## Model compatibility

The default engine expects a two-stage OCR pipeline:

1. A DBNet-style detector that outputs a text probability map
2. A CRNN-style recognizer that outputs CTC logits

Exact compatibility depends on tensor shapes, preprocessing, output names, class ordering, dictionary format, and whether operations such as sigmoid are included in the model graph.

See the model-interface documentation below before attempting to use a custom model.

## Browser support

The project requires:

* WebAssembly
* ES modules
* Canvas and video APIs
* `navigator.mediaDevices.getUserMedia()` for camera input
* HTTPS or localhost for camera access

It has not yet been thoroughly tested across all browsers and mobile devices. Treat the listed browser versions as targets rather than guaranteed support.

Cross-origin isolation may improve ONNX Runtime Web performance, but it can require additional server configuration:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Privacy

OCR processing is designed to happen locally in the browser.

The library itself does not intentionally upload camera frames or recognized text. Your application may still make network requests, and model, WASM, and JavaScript assets must normally be downloaded from the locations you configure.

Review your own hosting, analytics, logging, and application code before making privacy guarantees to users.

## Limitations

* The project is at an early stage
* The package is not published to npm
* Model files are not included
* Model compatibility is narrow and currently under-documented
* Accuracy depends almost entirely on the selected models and input conditions
* Performance depends on model size, browser, and device hardware
* The built-in engine currently uses WebAssembly rather than WebGPU
* Detection postprocessing is relatively simple
* Text orientation, perspective correction, glare detection, blur scoring, and document capture are not currently provided
* The default character mapping is not suitable for every language or model
* The API may change before a stable release

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Contributing

Bug reports, model-compatibility notes, browser test results, and focused pull requests are welcome.

When reporting an OCR problem, include:

* Browser and device
* Detector and recognizer model sources
* Input and output tensor shapes
* Dictionary or alphabet configuration
* A minimal reproduction where possible

## License

MIT
