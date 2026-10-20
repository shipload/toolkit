import type {
    Action,
    AssetType,
    Checksum256Type,
    ExtendedAssetType,
    Int64Type,
    NameType,
    UInt16Type,
    UInt32Type,
    UInt64Type,
    UInt8Type,
} from '@wharfkit/antelope'
import {
    ABI,
    Asset,
    Blob,
    Checksum256,
    ExtendedAsset,
    Int64,
    Name,
    Struct,
    TimePointSec,
    UInt16,
    UInt32,
    UInt64,
    UInt8,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yACMLYmFsYW5jZV9yb3cAAg50b2tlbl9jb250cmFjdARuYW1lB2JhbGFuY2UFYXNzZXQMY2FuY2VsdW53cmFwAAEIYXNzZXRfaWQGdWludDY0CmNhcmdvX2l0ZW0ABQdpdGVtX2lkBnVpbnQxNgVzdGF0cwZ1aW50NjQHbW9kdWxlcw5tb2R1bGVfZW50cnlbXQhxdWFudGl0eQZ1aW50MzIJZW50aXR5X2lkB3VpbnQ2ND8FY2xvc2UAAwVvd25lcgRuYW1lDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAtjb21wYW55X3JvdwACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwpjb250cmlidXRlAAYEZ2FtZQRuYW1lBnBsYXllcgRuYW1lCWVudGl0eV9pZAZ1aW50NjQBeAVpbnQ2NAF5BWludDY0BmJ1bmRsZQxjYXJnb19pdGVtW10LZGJnY2xlYXJ0YmwAAwp0YWJsZV9uYW1lBG5hbWUFc2NvcGUFbmFtZT8IbWF4X3Jvd3MHdWludDY0PwxkYmdlcG9jaHRpbWUAAghjb250cmFjdARuYW1lCWVwb2NodGltZQZ1aW50MzIJZGJncmVmdW5kAAEGb3duZXJzBm5hbWVbXQdkYmd3aXBlAAAMZGViaXRkZXBvc2l0AAUFb3duZXIEbmFtZQV0b2tlbgRuYW1lBmxvY2tlZAVhc3NldAtmZWVfYWNjb3VudARuYW1lA2ZlZQVhc3NldA5kZXBvc2l0Y2ZnX3JvdwACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAZlbmFibGUAAQdlbmFibGVkBGJvb2wKZW5hYmxlZ2FtZQACCGNvbnRyYWN0BG5hbWUHZW5hYmxlZARib29sDGZvdW5kY29tcGFueQACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwtnYW1lX2NvbmZpZwAEBHNlZWQLY2hlY2tzdW0yNTYJZXBvY2h0aW1lBnVpbnQzMgVzdGFydA50aW1lX3BvaW50X3NlYwNlbmQOdGltZV9wb2ludF9zZWMJZ2FtZV9tZXRhAAQEbmFtZQZzdHJpbmcLZGVzY3JpcHRpb24Gc3RyaW5nA3VybAZzdHJpbmcHdmVyc2lvbgZzdHJpbmcIZ2FtZV9yb3cABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCmdhbWVfc3RhdGUAAQdlbmFibGVkBGJvb2wMbW9kdWxlX2VudHJ5AAIEdHlwZQV1aW50OAlpbnN0YWxsZWQOcGFja2VkX21vZHVsZT8Eb3BlbgADBW93bmVyBG5hbWUOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sDXBhY2tlZF9tb2R1bGUAAgdpdGVtX2lkBnVpbnQxNgVzdGF0cwZ1aW50NjQMcmVsZ2F0ZWFzc2V0AAEIYXNzZXRfaWQGdWludDY0DHJlbGdhdGVvd25lcgABBW93bmVyBG5hbWUIc2V0dG9rZW4AAg50b2tlbl9jb250cmFjdARuYW1lDHRva2VuX3N5bWJvbAZzeW1ib2wJc3RhcnRnYW1lAAQIY29udHJhY3QEbmFtZQZjb25maWcLZ2FtZV9jb25maWcEbWV0YQlnYW1lX21ldGEFc3RhdGUKZ2FtZV9zdGF0ZQlzdGF0ZV9yb3cAAQdlbmFibGVkBGJvb2wLdW53cmFwY2FyZ28AAwRnYW1lBG5hbWUFb3duZXIEbmFtZQhhc3NldF9pZAZ1aW50NjQOdW53cmFwY3VzdF9yb3cAAghhc3NldF9pZAZ1aW50NjQFb3duZXIEbmFtZQx1bndyYXBlbnRpdHkAAwRnYW1lBG5hbWUFb3duZXIEbmFtZQhhc3NldF9pZAZ1aW50NjQKdXBkYXRlZ2FtZQACCGNvbnRyYWN0BG5hbWUEbWV0YQlnYW1lX21ldGEId2l0aGRyYXcAAwVvd25lcgRuYW1lCHF1YW50aXR5DmV4dGVuZGVkX2Fzc2V0BG1lbW8Gc3RyaW5nCXdyYXBjYXJnbwAGBGdhbWUEbmFtZQVvd25lcgRuYW1lCWVudGl0eV9pZAZ1aW50NjQIbmV4dXNfaWQGdWludDY0CGNhcmdvX2lkBnVpbnQ2NAhxdWFudGl0eQZ1aW50NjQKd3JhcGVudGl0eQAEBGdhbWUEbmFtZQVvd25lcgRuYW1lCWVudGl0eV9pZAZ1aW50NjQIbmV4dXNfaWQGdWludDY0DHdyYXBnYXRlX3JvdwADBW93bmVyBG5hbWUEZ2FtZQRuYW1lDWxhc3RfYXNzZXRfaWQGdWludDY0FlDN5VNHhaZBDGNhbmNlbHVud3JhcLUDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNhbmNlbHVud3JhcApzdW1tYXJ5OiAnVGFrZSBiYWNrIGFuIE5GVCBzZW50IGZvciB1bndyYXBwaW5nJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm4gYW4gQXRvbWljQXNzZXRzIE5GVCBmcm9tIHRoZSBwbGF0Zm9ybSdzIHVud3JhcCBjdXN0b2R5IHRvIHRoZSBhY2NvdW50IHRoYXQgc2VudCBpdCB3aXRoIHRoZSAndW53cmFwJyBtZW1vLiBPbmx5IHRoYXQgYWNjb3VudCBjYW4gc2lnbi4gVGhlIGN1c3RvZHkgcmVjb3JkIGlzIGVyYXNlZCBhbmQgdGhlIE5GVCB0cmFuc2ZlcnMgYmFjayB1bmNoYW5nZWQsIGtlZXBpbmcgaXRzIFJBTSBwYXllci4AAAAAAIVpRAVjbG9zZeICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsb3NlCnN1bW1hcnk6ICdDbG9zZSBhIGRlcG9zaXQgYmFsYW5jZSByb3cnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpDbG9zZSB0aGUgb3duZXIncyBkZXBvc2l0IGJhbGFuY2Ugcm93IGZvciB0aGUgZ2l2ZW4gdG9rZW4gYW5kIGZyZWUgaXRzIFJBTS4gVGhlIGJhbGFuY2UgbXVzdCBiZSB6ZXJvIGJlZm9yZSBjbG9zaW5nLiBSZXF1aXJlcyB0aGUgb3duZXIncyBhdXRob3JpdHkuAIDK+ribJ0UKY29udHJpYnV0ZQAA4snXqIjYSQtkYmdjbGVhcnRibMABLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGRiZ2NsZWFydGJsCnN1bW1hcnk6ICdERUJVRzogZGJnY2xlYXJ0YmwgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0toKTLDdGq2EkMZGJnZXBvY2h0aW1lxAItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZGJnZXBvY2h0aW1lCnN1bW1hcnk6ICdERUJVRzogb3ZlcnJpZGUgYSBnYW1lJydzIGVwb2NoIHRpbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCk92ZXJyaWRlIHRoZSBlcG9jaCBkdXJhdGlvbiBpbiB0aGUgY29uZmlndXJhdGlvbiBvZiB0aGUgc3BlY2lmaWVkIGdhbWUgY29udHJhY3QuIFJlcXVpcmVzIHBsYXRmb3JtIGNvbnRyYWN0IGF1dGhvcml0eS4AAEhTL3XZSQlkYmdyZWZ1bmQAAAAAQFXH2UkHZGJnd2lwZbgBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGRiZ3dpcGUKc3VtbWFyeTogJ0RFQlVHOiBkYmd3aXBlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLZAdplWl7I5KDGRlYml0ZGVwb3NpdJ0ELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGRlYml0ZGVwb3NpdApzdW1tYXJ5OiAnRGViaXQgYSBkZXBvc2l0IGJhbGFuY2UgZm9yIGEgd3JhcCBvcGVyYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpJbnRlcm5hbCBhY3Rpb24gY2FsbGVkIGlubGluZSBieSBhIHJlZ2lzdGVyZWQsIGVuYWJsZWQgZ2FtZSBjb250cmFjdCBvbmx5LiBEZWJpdHMgdGhlIG93bmVyJ3MgZGVwb3NpdCBiYWxhbmNlIGJ5IHRoZSBsb2NrZWQgYW1vdW50IHBsdXMgdGhlIGZlZSwgYW5kIGNyZWRpdHMgdGhlIGZlZSB0byB0aGUgY29uZmlndXJlZCBmZWUgYWNjb3VudC4gVXNlZCBieSBhIGdhbWUncyB3cmFwIGZsb3cgdG8gY29sbGVjdCB0aGUgd3JhcCBjb3N0LiBDYW5ub3QgYmUgY2FsbGVkIGRpcmVjdGx5IGJ5IHBsYXllcnMgb3IgdW5yZWdpc3RlcmVkIGFjY291bnRzLgAAAACoeMxUBmVuYWJsZfMBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnRW5hYmxlL2Rpc2FibGUgcGxhdGZvcm0nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGUgcGxhdGZvcm0gY29udHJhY3QuAICShql4zFQKZW5hYmxlZ2FtZfwBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZWdhbWUKc3VtbWFyeTogJ0VuYWJsZS9kaXNiYWJsZSBhIGdhbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGUgc3BlY2lmaWVkIGdhbWUgY29udHJhY3Qu4KepkqI0NV0MZm91bmRjb21wYW55gwItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZm91bmRjb21wYW55CnN1bW1hcnk6ICdGb3VuZCBhIG5ldyBjb21wYW55JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKRm91bmQgYSBuZXcgY29tcGFueSBpbiB0aGUgU2hpcGxvYWQgcGxhdGZvcm0gY29udHJhY3QuAAAAAAAwVaUEb3BlbpsDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IG9wZW4Kc3VtbWFyeTogJ09wZW4gYSBkZXBvc2l0IGJhbGFuY2Ugcm93JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKT3BlbiBhIHplcm8tYmFsYW5jZSBkZXBvc2l0IHJvdyBmb3IgdGhlIGdpdmVuIG93bmVyIGFuZCB0b2tlbiwgd2l0aCBSQU0gcGFpZCBieSB0aGUgb3duZXIuIEhhcyBubyBlZmZlY3QgaWYgdGhlIHJvdyBhbHJlYWR5IGV4aXN0cy4gTXVzdCBiZSBjYWxsZWQgYmVmb3JlIHRoZSBvd25lciBjYW4gcmVjZWl2ZSB0b2tlbiBkZXBvc2l0cyBvciB3cmFwIHJlZnVuZHMukBXGRmXDoroMcmVsZ2F0ZWFzc2V0AHDV5FRlw6K6DHJlbGdhdGVvd25lcgAAAABTQZqzwghzZXR0b2tlbp0DLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNldHRva2VuCnN1bW1hcnk6ICdTZXQgdGhlIGFjY2VwdGVkIGRlcG9zaXQgdG9rZW4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpBZG1pbiBhY3Rpb24gdGhhdCBzZXRzIHRoZSBhY2NlcHRlZCBkZXBvc2l0IHRva2VuIChjb250cmFjdCBhY2NvdW50IGFuZCBzeW1ib2wpIGZvciB0aGUgcGxhdGZvcm0uIEFsbCBwbGF5ZXIgZGVwb3NpdHMgYW5kIHdyYXAgY29zdHMgYXJlIGRlbm9taW5hdGVkIGluIHRoaXMgdG9rZW4uIFJlcXVpcmVzIHBsYXRmb3JtIGNvbnRyYWN0IGF1dGhvcml0eS4AAFDSsHxNxglzdGFydGdhbWX/AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzdGFydGdhbWUKc3VtbWFyeTogJ1N0YXJ0IGEgbmV3IGdhbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpTdGFydCBhIG5ldyBnYW1lIG9mIFNoaXBsb2FkIGRlcGxveWVkIHRvIGEgbmV3IGNvbnRyYWN0LgAouwZVc/nUC3Vud3JhcGNhcmdv7AQtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdW53cmFwY2FyZ28Kc3VtbWFyeTogJ0RlcG9zaXQgYW4gTkZUIGludG8gYSBob3N0IGVudGl0eScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRGVwb3NpdCBhbiBBdG9taWNBc3NldHMgTkZUIGludG8gYSBob3N0IGVudGl0eSdzIGNhcmdvLiBQYWlycyB3aXRoIGFuIGF0b21pY2Fzc2V0czo6dHJhbnNmZXIgY2FycnlpbmcgdGhlICd1bndyYXAnIG1lbW8gaW4gdGhlIHNhbWUgdHJhbnNhY3Rpb24uIFRoZSBjYWxsZXIgbXVzdCBvd24gdGhlIGhvc3QsIGFuZCB0aGUgaG9zdCBtdXN0IGhhdmUgY2FwYWNpdHkgaGVhZHJvb20gZm9yIHRoZSB1bndyYXBwZWQgbWFzcy4gQSBob3N0IHdpdGhvdXQgbG9hZGVycyB1bmxvYWRzIGF0IGJhc2VsaW5lIGxvYWRlciBzcGVlZC4gU2NoZWR1bGVzIGEgVEFTS19VTldSQVAgb24gdGhlIGhvc3QgdGhhdCwgb24gcmVzb2x1dGlvbiwgcGxhY2VzIHRoZSBkZWNvZGVkIGl0ZW0gaW50byB0aGUgaG9zdCdzIGNhcmdvIGFuZCBidXJucyB0aGUgTkZULuCzy1NVc/nUDHVud3JhcGVudGl0eeIELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVud3JhcGVudGl0eQpzdW1tYXJ5OiAnRGVwbG95IGFuIGVudGl0eSBORlQgZGlyZWN0bHkgdG8gYSBuZXh1cycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRGVwbG95IGEgcGFja2VkLWVudGl0eSBBdG9taWNBc3NldHMgTkZUIChvcmJpdGFsIHZlc3NlbDogc2hpcCBvciBjb250YWluZXIpIGRpcmVjdGx5IGFzIGEgbGl2ZSBlbnRpdHkuIFBhaXJzIHdpdGggYW4gYXRvbWljYXNzZXRzOjp0cmFuc2ZlciBjYXJyeWluZyB0aGUgJ2RlcGxveScgbWVtbyBpbiB0aGUgc2FtZSB0cmFuc2FjdGlvbi4gVGhlIE5GVCBpcyBidXJuZWQsIGEgbmV3IGVudGl0eSByb3cgaXMgZW1wbGFjZWQgYXQgdGhlIE5GVCdzIHdyYXAgb3JpZ2luIHBhaWQgYnkgdGhlIG93bmVyLCBhbmQgVEFTS19UUkFWRUwgcGx1cyBUQVNLX1JFQ0hBUkdFIGFyZSBxdWV1ZWQgdG8gZGVsaXZlciB0aGUgZW50aXR5IHRvIHRoZSB0YXJnZXQgbmV4dXMgYW5kIGJyaW5nIGl0IHRvIGZ1bGwgZW5lcmd5LgCAkoapbFLVCnVwZGF0ZWdhbWWNAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1cGRhdGVnYW1lCnN1bW1hcnk6ICdVcGRhdGUgZ2FtZSBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KClVwZGF0ZSB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwZWNpZmllZCBnYW1lIGNvbnRyYWN0LgoKLS0tAAAA3NzUsuMId2l0aGRyYXeXAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXRoZHJhdwpzdW1tYXJ5OiAnV2l0aGRyYXcgdG9rZW5zIGZyb20gYSBkZXBvc2l0IGJhbGFuY2UnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpXaXRoZHJhdyB0b2tlbnMgZnJvbSB0aGUgb3duZXIncyBkZXBvc2l0IGJhbGFuY2UuIERlYml0cyB0aGUgbGVkZ2VyIGJ5IHRoZSByZXF1ZXN0ZWQgYW1vdW50IGFuZCB0cmFuc2ZlcnMgdGhlIHRva2VucyB0byB0aGUgb3duZXIuIFJlcXVpcmVzIGEgc3VmZmljaWVudCBiYWxhbmNlIGFuZCB0aGUgb3duZXIncyBhdXRob3JpdHkuAACg7BpUzeUJd3JhcGNhcmdvAACAzy5PVc3lCndyYXBlbnRpdHm1BC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3cmFwZW50aXR5CnN1bW1hcnk6ICdXcmFwIGEgZGVwbG95ZWQgZW50aXR5IGludG8gYW4gTkZUJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpXcmFwIGFuIGVudGl0eSBpbnRvIGFuIEF0b21pY0Fzc2V0cyBORlQgbWludGVkIHRvIGl0cyBvd25lci4gVGhlIGVudGl0eSBtdXN0IGJlIGF0IGEgbmV4dXMsIGlkbGUgd2l0aCBlbXB0eSBjYXJnbywgYW5kIGhhdmUgYW4gbmZ0Y29uZmlnIG1hcHBpbmcgZm9yIGl0cyBpdGVtIGlkLiBFcmFzZXMgdGhlIGVudGl0eSBhbmQgbWludHMgdGhlIE5GVCBpbmxpbmUsIHByZXNlcnZpbmcgaXRzIHN0YXRzIGFuZCBpbnN0YWxsZWQgbW9kdWxlczsgdGhlIHBsYXllciBwYXlzIFJBTSBmb3IgdGhlIG5ldyBhc3NldCByb3cuIFJlcXVpcmVzIHRoZSBvd25lcidzIGFjdGl2ZSBwZXJtaXNzaW9uIChubyBzZXNzaW9uLWtleSBjb21wYXRpYmlsaXR5KS4HAAAAQKFpojkDaTY0AAALYmFsYW5jZV9yb3cAAADAT1MlRQNpNjQAAAtjb21wYW55X3JvdwAAWyg7TKtKA2k2NAAADmRlcG9zaXRjZmdfcm93AAAAAACspGEDaTY0AAAIZ2FtZV9yb3cAAAAAAJVNxgNpNjQAAAlzdGF0ZV9yb3cAQMYaVXP51ANpNjQAAA51bndyYXBjdXN0X3JvdwAAACobVs3lA2k2NAAADHdyYXBnYXRlX3JvdwETU2hpcGxvYWQgKFBsYXRmb3JtKRNTaGlwbG9hZCAoUGxhdGZvcm0pAAAAAA=='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('balance_row')
    export class balance_row extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset)
        declare balance: Asset
    }
    @Struct.type('cancelunwrap')
    export class cancelunwrap extends Struct {
        @Struct.field(UInt64)
        declare asset_id: UInt64
    }
    @Struct.type('packed_module')
    export class packed_module extends Struct {
        @Struct.field(UInt16)
        declare item_id: UInt16
        @Struct.field(UInt64)
        declare stats: UInt64
    }
    @Struct.type('module_entry')
    export class module_entry extends Struct {
        @Struct.field(UInt8)
        declare type: UInt8
        @Struct.field(packed_module, {optional: true})
        declare installed?: packed_module
    }
    @Struct.type('cargo_item')
    export class cargo_item extends Struct {
        @Struct.field(UInt16)
        declare item_id: UInt16
        @Struct.field(UInt64)
        declare stats: UInt64
        @Struct.field(module_entry, {array: true})
        declare modules: module_entry[]
        @Struct.field(UInt32)
        declare quantity: UInt32
        @Struct.field(UInt64, {optional: true})
        declare entity_id?: UInt64
    }
    @Struct.type('close')
    export class close extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('company_row')
    export class company_row extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field('string')
        declare name: string
    }
    @Struct.type('contribute')
    export class contribute extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare player: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
        @Struct.field(cargo_item, {array: true})
        declare bundle: cargo_item[]
    }
    @Struct.type('dbgcleartbl')
    export class dbgcleartbl extends Struct {
        @Struct.field(Name)
        declare table_name: Name
        @Struct.field(Name, {optional: true})
        declare scope?: Name
        @Struct.field(UInt64, {optional: true})
        declare max_rows?: UInt64
    }
    @Struct.type('dbgepochtime')
    export class dbgepochtime extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(UInt32)
        declare epochtime: UInt32
    }
    @Struct.type('dbgrefund')
    export class dbgrefund extends Struct {
        @Struct.field(Name, {array: true})
        declare owners: Name[]
    }
    @Struct.type('dbgwipe')
    export class dbgwipe extends Struct {}
    @Struct.type('debitdeposit')
    export class debitdeposit extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare token: Name
        @Struct.field(Asset)
        declare locked: Asset
        @Struct.field(Name)
        declare fee_account: Name
        @Struct.field(Asset)
        declare fee: Asset
    }
    @Struct.type('depositcfg_row')
    export class depositcfg_row extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('enable')
    export class enable extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('enablegame')
    export class enablegame extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('foundcompany')
    export class foundcompany extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field('string')
        declare name: string
    }
    @Struct.type('game_config')
    export class game_config extends Struct {
        @Struct.field(Checksum256)
        declare seed: Checksum256
        @Struct.field(UInt32)
        declare epochtime: UInt32
        @Struct.field(TimePointSec)
        declare start: TimePointSec
        @Struct.field(TimePointSec)
        declare end: TimePointSec
    }
    @Struct.type('game_meta')
    export class game_meta extends Struct {
        @Struct.field('string')
        declare name: string
        @Struct.field('string')
        declare description: string
        @Struct.field('string')
        declare url: string
        @Struct.field('string')
        declare version: string
    }
    @Struct.type('game_state')
    export class game_state extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('game_row')
    export class game_row extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(game_config)
        declare config: game_config
        @Struct.field(game_meta)
        declare meta: game_meta
        @Struct.field(game_state)
        declare state: game_state
    }
    @Struct.type('open')
    export class open extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('relgateasset')
    export class relgateasset extends Struct {
        @Struct.field(UInt64)
        declare asset_id: UInt64
    }
    @Struct.type('relgateowner')
    export class relgateowner extends Struct {
        @Struct.field(Name)
        declare owner: Name
    }
    @Struct.type('settoken')
    export class settoken extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('startgame')
    export class startgame extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(game_config)
        declare config: game_config
        @Struct.field(game_meta)
        declare meta: game_meta
        @Struct.field(game_state)
        declare state: game_state
    }
    @Struct.type('state_row')
    export class state_row extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('unwrapcargo')
    export class unwrapcargo extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare asset_id: UInt64
    }
    @Struct.type('unwrapcust_row')
    export class unwrapcust_row extends Struct {
        @Struct.field(UInt64)
        declare asset_id: UInt64
        @Struct.field(Name)
        declare owner: Name
    }
    @Struct.type('unwrapentity')
    export class unwrapentity extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare asset_id: UInt64
    }
    @Struct.type('updategame')
    export class updategame extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(game_meta)
        declare meta: game_meta
    }
    @Struct.type('withdraw')
    export class withdraw extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(ExtendedAsset)
        declare quantity: ExtendedAsset
        @Struct.field('string')
        declare memo: string
    }
    @Struct.type('wrapcargo')
    export class wrapcargo extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt64)
        declare nexus_id: UInt64
        @Struct.field(UInt64)
        declare cargo_id: UInt64
        @Struct.field(UInt64)
        declare quantity: UInt64
    }
    @Struct.type('wrapentity')
    export class wrapentity extends Struct {
        @Struct.field(Name)
        declare game: Name
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt64)
        declare nexus_id: UInt64
    }
    @Struct.type('wrapgate_row')
    export class wrapgate_row extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare game: Name
        @Struct.field(UInt64)
        declare last_asset_id: UInt64
    }
}
export const TableMap = {
    balance: Types.balance_row,
    company: Types.company_row,
    depositcfg: Types.depositcfg_row,
    games: Types.game_row,
    state: Types.state_row,
    unwrapcust: Types.unwrapcust_row,
    wrapgate: Types.wrapgate_row,
}
export interface TableTypes {
    balance: Types.balance_row
    company: Types.company_row
    depositcfg: Types.depositcfg_row
    games: Types.game_row
    state: Types.state_row
    unwrapcust: Types.unwrapcust_row
    wrapgate: Types.wrapgate_row
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {
        export interface cargo_item {
            item_id: UInt16Type
            stats: UInt64Type
            modules: Type.module_entry[]
            quantity: UInt32Type
            entity_id?: UInt64Type
        }
        export interface module_entry {
            type: UInt8Type
            installed?: Type.packed_module
        }
        export interface packed_module {
            item_id: UInt16Type
            stats: UInt64Type
        }
        export interface game_config {
            seed: Checksum256Type
            epochtime: UInt32Type
            start: TimePointSec
            end: TimePointSec
        }
        export interface game_meta {
            name: string
            description: string
            url: string
            version: string
        }
        export interface game_state {
            enabled: boolean
        }
    }
    export interface cancelunwrap {
        asset_id: UInt64Type
    }
    export interface close {
        owner: NameType
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface contribute {
        game: NameType
        player: NameType
        entity_id: UInt64Type
        x: Int64Type
        y: Int64Type
        bundle: Type.cargo_item[]
    }
    export interface dbgcleartbl {
        table_name: NameType
        scope?: NameType
        max_rows?: UInt64Type
    }
    export interface dbgepochtime {
        contract: NameType
        epochtime: UInt32Type
    }
    export interface dbgrefund {
        owners: NameType[]
    }
    export interface dbgwipe {}
    export interface debitdeposit {
        owner: NameType
        token: NameType
        locked: AssetType
        fee_account: NameType
        fee: AssetType
    }
    export interface enable {
        enabled: boolean
    }
    export interface enablegame {
        contract: NameType
        enabled: boolean
    }
    export interface foundcompany {
        account: NameType
        name: string
    }
    export interface open {
        owner: NameType
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface relgateasset {
        asset_id: UInt64Type
    }
    export interface relgateowner {
        owner: NameType
    }
    export interface settoken {
        token_contract: NameType
        token_symbol: Asset.SymbolType
    }
    export interface startgame {
        contract: NameType
        config: Type.game_config
        meta: Type.game_meta
        state: Type.game_state
    }
    export interface unwrapcargo {
        game: NameType
        owner: NameType
        asset_id: UInt64Type
    }
    export interface unwrapentity {
        game: NameType
        owner: NameType
        asset_id: UInt64Type
    }
    export interface updategame {
        contract: NameType
        meta: Type.game_meta
    }
    export interface withdraw {
        owner: NameType
        quantity: ExtendedAssetType
        memo: string
    }
    export interface wrapcargo {
        game: NameType
        owner: NameType
        entity_id: UInt64Type
        nexus_id: UInt64Type
        cargo_id: UInt64Type
        quantity: UInt64Type
    }
    export interface wrapentity {
        game: NameType
        owner: NameType
        entity_id: UInt64Type
        nexus_id: UInt64Type
    }
}
export interface ActionNameParams {
    cancelunwrap: ActionParams.cancelunwrap
    close: ActionParams.close
    contribute: ActionParams.contribute
    dbgcleartbl: ActionParams.dbgcleartbl
    dbgepochtime: ActionParams.dbgepochtime
    dbgrefund: ActionParams.dbgrefund
    dbgwipe: ActionParams.dbgwipe
    debitdeposit: ActionParams.debitdeposit
    enable: ActionParams.enable
    enablegame: ActionParams.enablegame
    foundcompany: ActionParams.foundcompany
    open: ActionParams.open
    relgateasset: ActionParams.relgateasset
    relgateowner: ActionParams.relgateowner
    settoken: ActionParams.settoken
    startgame: ActionParams.startgame
    unwrapcargo: ActionParams.unwrapcargo
    unwrapentity: ActionParams.unwrapentity
    updategame: ActionParams.updategame
    withdraw: ActionParams.withdraw
    wrapcargo: ActionParams.wrapcargo
    wrapentity: ActionParams.wrapentity
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('nex.shipload'),
        })
    }
    action<T extends ActionNames>(
        name: T,
        data: ActionNameParams[T],
        options?: ActionOptions
    ): Action {
        return super.action(name, data, options)
    }
    table<T extends TableNames>(name: T, scope?: NameType): Table<RowType<T>> {
        return super.table(name, scope, TableMap[name])
    }
}
