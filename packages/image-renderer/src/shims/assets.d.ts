declare module '*.woff2' {
    const buf: ArrayBuffer
    export default buf
}

declare module '*.wasm' {
    const mod: WebAssembly.Module
    export default mod
}

declare module '*.svg' {
    const svg: string
    export default svg
}
