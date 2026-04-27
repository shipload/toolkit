declare module '*.woff2' {
    const buf: ArrayBuffer
    export default buf
}

declare module '*.wasm' {
    const mod: WebAssembly.Module
    export default mod
}
