---
"@shipload/sdk": minor
---

Add `@shipload/sdk/scan` subpath — a WebAssembly deposit-scanning module compiled from the contract derivation. Exposes `scanCells` (region batch), `systemsInBox`, and `getLocationType`, byte-identical to the JS derivation and ~38x faster for large scans.
