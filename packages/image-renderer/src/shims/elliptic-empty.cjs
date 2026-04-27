'use strict'

// Empty stub for elliptic. @wharfkit/antelope imports elliptic for ECDSA/EdDSA
// crypto (key signing, signature verification), but this worker only uses
// Serializer.encode/decode and never calls any crypto method. Replacing the
// module with an empty object strips ~40KB of dead code from the bundle.
//
// If something here ever throws because an elliptic symbol IS accessed at
// import-time (not runtime), swap this back to the copy-shim at ./elliptic.cjs.

module.exports = {}
