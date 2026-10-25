/// <reference types="vite/client" />

/** Injected by vite.config.ts from package.json. */
declare const __APP_VERSION__: string;

/** espeak-ng built for the browser (Piper's phonemizer, 5.1-3c): an Emscripten module factory. */
declare module '@diffusionstudio/piper-wasm/build/piper_phonemize.js' {
  const createPiperPhonemize: (options: object) => Promise<{ callMain(args: string[]): void }>;
  export default createPiperPhonemize;
}
