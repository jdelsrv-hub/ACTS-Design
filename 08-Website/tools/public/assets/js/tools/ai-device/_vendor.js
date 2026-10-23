// Libraries and AI models only the on-device AI tools use. Pinned versions, loaded the first time a tool needs them.
// Models come from Hugging Face at a fixed commit, so the weights can't change under us.
import { loadModule } from '../../core/vendor.js';

const JSD = 'https://cdn.jsdelivr.net/npm/';

// The onnxruntime-web build bundled inside transformers.js 4.3.1. Change both together.
const ORT_VERSION = '1.31.0-dev.20260914-8d85527a0';

export const AI_LIBS = {
  // Runs AI models in the browser: Transformers.js (Apache-2.0), which uses ONNX Runtime Web (MIT).
  transformers: JSD + '@huggingface/transformers@4.3.1/dist/transformers.min.js',
  // The plain WebAssembly build of ONNX Runtime (no WebGPU): about 3 MB to download instead of 6 MB.
  ortWasm: {
    mjs: `${JSD}onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.mjs`,
    wasm: `${JSD}onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.wasm`,
  },
  // Text recognition (OCR): Tesseract.js (Apache-2.0) and its WebAssembly core (Apache-2.0).
  tesseract: JSD + 'tesseract.js@7.0.0/dist/tesseract.esm.min.js',
  tesseractWorker: JSD + 'tesseract.js@7.0.0/dist/worker.min.js',
  tesseractCore: JSD + 'tesseract.js-core@7.0.0',
  // Language data (from Tesseract's tessdata_best, Apache-2.0), one package per language.
  tesseractLang: (lang) => `${JSD}@tesseract.js-data/${lang}@1.0.0/4.0.0_best_int`,
};

// AI models. files = the weights (used to check the browser cache). bytes = everything the model downloads.
export const MODELS = {
  // U-2-Net small (u2netp, Apache-2.0): 4.6 MB. Finds the main subject of any photo (people, pets, products).
  cutout: {
    id: 'BritishWerewolf/U-2-Netp',
    revision: '7112208dbac3a3642496c8d54e2f0f9bb3dc1dc8',
    dtype: 'fp32',
    files: ['onnx/model.onnx'],
    bytes: 4.6e6,
  },
  // MODNet portrait matting (Apache-2.0), 8-bit: 6.6 MB. Much better at people and hair.
  portrait: {
    id: 'Xenova/modnet',
    revision: 'fa2fa546052fba4c08921230a26cc69a333fca12',
    dtype: 'q8',
    files: ['onnx/model_quantized.onnx'],
    bytes: 6.6e6,
  },
  // OpenAI Whisper base (multilingual, Apache-2.0), 8-bit: 77 MB of weights plus 3 MB of word lists and settings.
  whisper: {
    id: 'Xenova/whisper-base',
    revision: '64da57285918e20ea79ea5c88eed7197933abaa8',
    files: ['onnx/encoder_model_quantized.onnx', 'onnx/decoder_model_merged_quantized.onnx'],
    bytes: 79.7e6,
  },
};

// What a visitor downloads the first time, in MB: the models plus the AI engine (about 3.3 MB), rounded.
export const DOWNLOAD_MB = { background: 15, whisper: 85 };

const HF = 'https://huggingface.co/';
export const modelFileUrl = (m, file) => `${HF}${m.id}/resolve/${m.revision}/${file}`;

let transformers;
/** Transformers.js, set up to run models on the CPU in a background worker so the page stays responsive. */
export function getTransformers() {
  transformers ||= loadModule(AI_LIBS.transformers).then((T) => {
    const onnx = T.env.backends.onnx;
    if (onnx?.wasm) {
      if (onnx.versions?.web === ORT_VERSION) onnx.wasm.wasmPaths = AI_LIBS.ortWasm;
      onnx.wasm.proxy = true;
    }
    // We only run on the CPU. Small helper steps still check for a GPU, and Chrome on Windows warns about this setting.
    if (onnx?.webgpu) delete onnx.webgpu.powerPreference;
    return T;
  }).catch((err) => {
    transformers = null;
    throw err;
  });
  return transformers;
}

let tesseract;
export function getTesseract() {
  tesseract ||= loadModule(AI_LIBS.tesseract).then((m) => m.default || m).catch((err) => {
    tesseract = null;
    throw err;
  });
  return tesseract;
}
