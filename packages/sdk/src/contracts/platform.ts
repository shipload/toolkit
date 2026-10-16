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
    'DmVvc2lvOjphYmkvMS4yACMLYmFsYW5jZV9yb3cAAg50b2tlbl9jb250cmFjdARuYW1lB2JhbGFuY2UFYXNzZXQMY2FuY2VsdW53cmFwAAEIYXNzZXRfaWQGdWludDY0CmNhcmdvX2l0ZW0ABQdpdGVtX2lkBnVpbnQxNgVzdGF0cwZ1aW50NjQHbW9kdWxlcw5tb2R1bGVfZW50cnlbXQhxdWFudGl0eQZ1aW50MzIJZW50aXR5X2lkB3VpbnQ2ND8KY2xlYXJ0YWJsZQADCnRhYmxlX25hbWUEbmFtZQVzY29wZQVuYW1lPwhtYXhfcm93cwd1aW50NjQ/BWNsb3NlAAMFb3duZXIEbmFtZQ50b2tlbl9jb250cmFjdARuYW1lDHRva2VuX3N5bWJvbAZzeW1ib2wLY29tcGFueV9yb3cAAgdhY2NvdW50BG5hbWUEbmFtZQZzdHJpbmcKY29udHJpYnV0ZQAGBGdhbWUEbmFtZQZwbGF5ZXIEbmFtZQllbnRpdHlfaWQGdWludDY0AXgFaW50NjQBeQVpbnQ2NAZidW5kbGUMY2FyZ29faXRlbVtdCWRiZ3JlZnVuZAABBm93bmVycwZuYW1lW10MZGViaXRkZXBvc2l0AAUFb3duZXIEbmFtZQV0b2tlbgRuYW1lBmxvY2tlZAVhc3NldAtmZWVfYWNjb3VudARuYW1lA2ZlZQVhc3NldA5kZXBvc2l0Y2ZnX3JvdwACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAZlbmFibGUAAQdlbmFibGVkBGJvb2wKZW5hYmxlZ2FtZQACCGNvbnRyYWN0BG5hbWUHZW5hYmxlZARib29sDGZvdW5kY29tcGFueQACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwtnYW1lX2NvbmZpZwAEBHNlZWQLY2hlY2tzdW0yNTYJZXBvY2h0aW1lBnVpbnQzMgVzdGFydA50aW1lX3BvaW50X3NlYwNlbmQOdGltZV9wb2ludF9zZWMJZ2FtZV9tZXRhAAQEbmFtZQZzdHJpbmcLZGVzY3JpcHRpb24Gc3RyaW5nA3VybAZzdHJpbmcHdmVyc2lvbgZzdHJpbmcIZ2FtZV9yb3cABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCmdhbWVfc3RhdGUAAQdlbmFibGVkBGJvb2wMbW9kdWxlX2VudHJ5AAIEdHlwZQV1aW50OAlpbnN0YWxsZWQOcGFja2VkX21vZHVsZT8Eb3BlbgADBW93bmVyBG5hbWUOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sDXBhY2tlZF9tb2R1bGUAAgdpdGVtX2lkBnVpbnQxNgVzdGF0cwZ1aW50NjQMcmVsZ2F0ZWFzc2V0AAEIYXNzZXRfaWQGdWludDY0DHJlbGdhdGVvd25lcgABBW93bmVyBG5hbWUMc2V0ZXBvY2h0aW1lAAIIY29udHJhY3QEbmFtZQllcG9jaHRpbWUGdWludDMyCHNldHRva2VuAAIOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sCXN0YXJ0Z2FtZQAECGNvbnRyYWN0BG5hbWUGY29uZmlnC2dhbWVfY29uZmlnBG1ldGEJZ2FtZV9tZXRhBXN0YXRlCmdhbWVfc3RhdGUJc3RhdGVfcm93AAEHZW5hYmxlZARib29sC3Vud3JhcGNhcmdvAAMEZ2FtZQRuYW1lBW93bmVyBG5hbWUIYXNzZXRfaWQGdWludDY0DnVud3JhcGN1c3Rfcm93AAIIYXNzZXRfaWQGdWludDY0BW93bmVyBG5hbWUMdW53cmFwZW50aXR5AAMEZ2FtZQRuYW1lBW93bmVyBG5hbWUIYXNzZXRfaWQGdWludDY0CnVwZGF0ZWdhbWUAAghjb250cmFjdARuYW1lBG1ldGEJZ2FtZV9tZXRhBHdpcGUAAAh3aXRoZHJhdwADBW93bmVyBG5hbWUIcXVhbnRpdHkOZXh0ZW5kZWRfYXNzZXQEbWVtbwZzdHJpbmcJd3JhcGNhcmdvAAYEZ2FtZQRuYW1lBW93bmVyBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhuZXh1c19pZAZ1aW50NjQIY2FyZ29faWQGdWludDY0CHF1YW50aXR5BnVpbnQ2NAp3cmFwZW50aXR5AAQEZ2FtZQRuYW1lBW93bmVyBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhuZXh1c19pZAZ1aW50NjQMd3JhcGdhdGVfcm93AAMFb3duZXIEbmFtZQRnYW1lBG5hbWUNbGFzdF9hc3NldF9pZAZ1aW50NjQWUM3lU0eFpkEMY2FuY2VsdW53cmFwtQMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2FuY2VsdW53cmFwCnN1bW1hcnk6ICdUYWtlIGJhY2sgYW4gTkZUIHNlbnQgZm9yIHVud3JhcHBpbmcnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJldHVybiBhbiBBdG9taWNBc3NldHMgTkZUIGZyb20gdGhlIHBsYXRmb3JtJ3MgdW53cmFwIGN1c3RvZHkgdG8gdGhlIGFjY291bnQgdGhhdCBzZW50IGl0IHdpdGggdGhlICd1bndyYXAnIG1lbW8uIE9ubHkgdGhhdCBhY2NvdW50IGNhbiBzaWduLiBUaGUgY3VzdG9keSByZWNvcmQgaXMgZXJhc2VkIGFuZCB0aGUgTkZUIHRyYW5zZmVycyBiYWNrIHVuY2hhbmdlZCwga2VlcGluZyBpdHMgUkFNIHBheWVyLgCAisfka1RECmNsZWFydGFibGW+AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBjbGVhcnRhYmxlCnN1bW1hcnk6ICdERUJVRzogY2xlYXJ0YWJsZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0AAAAAAIVpRAVjbG9zZeICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsb3NlCnN1bW1hcnk6ICdDbG9zZSBhIGRlcG9zaXQgYmFsYW5jZSByb3cnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpDbG9zZSB0aGUgb3duZXIncyBkZXBvc2l0IGJhbGFuY2Ugcm93IGZvciB0aGUgZ2l2ZW4gdG9rZW4gYW5kIGZyZWUgaXRzIFJBTS4gVGhlIGJhbGFuY2UgbXVzdCBiZSB6ZXJvIGJlZm9yZSBjbG9zaW5nLiBSZXF1aXJlcyB0aGUgb3duZXIncyBhdXRob3JpdHkuAIDK+ribJ0UKY29udHJpYnV0ZQAAAEhTL3XZSQlkYmdyZWZ1bmQAkB2mVaXsjkoMZGViaXRkZXBvc2l0nQQtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZGViaXRkZXBvc2l0CnN1bW1hcnk6ICdEZWJpdCBhIGRlcG9zaXQgYmFsYW5jZSBmb3IgYSB3cmFwIG9wZXJhdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkludGVybmFsIGFjdGlvbiBjYWxsZWQgaW5saW5lIGJ5IGEgcmVnaXN0ZXJlZCwgZW5hYmxlZCBnYW1lIGNvbnRyYWN0IG9ubHkuIERlYml0cyB0aGUgb3duZXIncyBkZXBvc2l0IGJhbGFuY2UgYnkgdGhlIGxvY2tlZCBhbW91bnQgcGx1cyB0aGUgZmVlLCBhbmQgY3JlZGl0cyB0aGUgZmVlIHRvIHRoZSBjb25maWd1cmVkIGZlZSBhY2NvdW50LiBVc2VkIGJ5IGEgZ2FtZSdzIHdyYXAgZmxvdyB0byBjb2xsZWN0IHRoZSB3cmFwIGNvc3QuIENhbm5vdCBiZSBjYWxsZWQgZGlyZWN0bHkgYnkgcGxheWVycyBvciB1bnJlZ2lzdGVyZWQgYWNjb3VudHMuAAAAAKh4zFQGZW5hYmxl8wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZW5hYmxlCnN1bW1hcnk6ICdFbmFibGUvZGlzYWJsZSBwbGF0Zm9ybScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoZSBwbGF0Zm9ybSBjb250cmFjdC4AgJKGqXjMVAplbmFibGVnYW1l/AEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZW5hYmxlZ2FtZQpzdW1tYXJ5OiAnRW5hYmxlL2Rpc2JhYmxlIGEgZ2FtZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoZSBzcGVjaWZpZWQgZ2FtZSBjb250cmFjdC7gp6mSojQ1XQxmb3VuZGNvbXBhbnmDAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBmb3VuZGNvbXBhbnkKc3VtbWFyeTogJ0ZvdW5kIGEgbmV3IGNvbXBhbnknCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpGb3VuZCBhIG5ldyBjb21wYW55IGluIHRoZSBTaGlwbG9hZCBwbGF0Zm9ybSBjb250cmFjdC4AAAAAADBVpQRvcGVumwMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogb3BlbgpzdW1tYXJ5OiAnT3BlbiBhIGRlcG9zaXQgYmFsYW5jZSByb3cnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpPcGVuIGEgemVyby1iYWxhbmNlIGRlcG9zaXQgcm93IGZvciB0aGUgZ2l2ZW4gb3duZXIgYW5kIHRva2VuLCB3aXRoIFJBTSBwYWlkIGJ5IHRoZSBvd25lci4gSGFzIG5vIGVmZmVjdCBpZiB0aGUgcm93IGFscmVhZHkgZXhpc3RzLiBNdXN0IGJlIGNhbGxlZCBiZWZvcmUgdGhlIG93bmVyIGNhbiByZWNlaXZlIHRva2VuIGRlcG9zaXRzIG9yIHdyYXAgcmVmdW5kcy6QFcZGZcOiugxyZWxnYXRlYXNzZXQAcNXkVGXDoroMcmVsZ2F0ZW93bmVyAKCkyw3RqrLCDHNldGVwb2NodGltZcQCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNldGVwb2NodGltZQpzdW1tYXJ5OiAnREVCVUc6IG92ZXJyaWRlIGEgZ2FtZScncyBlcG9jaCB0aW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpPdmVycmlkZSB0aGUgZXBvY2ggZHVyYXRpb24gaW4gdGhlIGNvbmZpZ3VyYXRpb24gb2YgdGhlIHNwZWNpZmllZCBnYW1lIGNvbnRyYWN0LiBSZXF1aXJlcyBwbGF0Zm9ybSBjb250cmFjdCBhdXRob3JpdHkuAAAAU0Gas8IIc2V0dG9rZW6dAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzZXR0b2tlbgpzdW1tYXJ5OiAnU2V0IHRoZSBhY2NlcHRlZCBkZXBvc2l0IHRva2VuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKQWRtaW4gYWN0aW9uIHRoYXQgc2V0cyB0aGUgYWNjZXB0ZWQgZGVwb3NpdCB0b2tlbiAoY29udHJhY3QgYWNjb3VudCBhbmQgc3ltYm9sKSBmb3IgdGhlIHBsYXRmb3JtLiBBbGwgcGxheWVyIGRlcG9zaXRzIGFuZCB3cmFwIGNvc3RzIGFyZSBkZW5vbWluYXRlZCBpbiB0aGlzIHRva2VuLiBSZXF1aXJlcyBwbGF0Zm9ybSBjb250cmFjdCBhdXRob3JpdHkuAABQ0rB8TcYJc3RhcnRnYW1l/wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc3RhcnRnYW1lCnN1bW1hcnk6ICdTdGFydCBhIG5ldyBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKU3RhcnQgYSBuZXcgZ2FtZSBvZiBTaGlwbG9hZCBkZXBsb3llZCB0byBhIG5ldyBjb250cmFjdC4AKLsGVXP51At1bndyYXBjYXJnb+wELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVud3JhcGNhcmdvCnN1bW1hcnk6ICdEZXBvc2l0IGFuIE5GVCBpbnRvIGEgaG9zdCBlbnRpdHknCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkRlcG9zaXQgYW4gQXRvbWljQXNzZXRzIE5GVCBpbnRvIGEgaG9zdCBlbnRpdHkncyBjYXJnby4gUGFpcnMgd2l0aCBhbiBhdG9taWNhc3NldHM6OnRyYW5zZmVyIGNhcnJ5aW5nIHRoZSAndW53cmFwJyBtZW1vIGluIHRoZSBzYW1lIHRyYW5zYWN0aW9uLiBUaGUgY2FsbGVyIG11c3Qgb3duIHRoZSBob3N0LCBhbmQgdGhlIGhvc3QgbXVzdCBoYXZlIGNhcGFjaXR5IGhlYWRyb29tIGZvciB0aGUgdW53cmFwcGVkIG1hc3MuIEEgaG9zdCB3aXRob3V0IGxvYWRlcnMgdW5sb2FkcyBhdCBiYXNlbGluZSBsb2FkZXIgc3BlZWQuIFNjaGVkdWxlcyBhIFRBU0tfVU5XUkFQIG9uIHRoZSBob3N0IHRoYXQsIG9uIHJlc29sdXRpb24sIHBsYWNlcyB0aGUgZGVjb2RlZCBpdGVtIGludG8gdGhlIGhvc3QncyBjYXJnbyBhbmQgYnVybnMgdGhlIE5GVC7gs8tTVXP51Ax1bndyYXBlbnRpdHniBC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1bndyYXBlbnRpdHkKc3VtbWFyeTogJ0RlcGxveSBhbiBlbnRpdHkgTkZUIGRpcmVjdGx5IHRvIGEgbmV4dXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkRlcGxveSBhIHBhY2tlZC1lbnRpdHkgQXRvbWljQXNzZXRzIE5GVCAob3JiaXRhbCB2ZXNzZWw6IHNoaXAgb3IgY29udGFpbmVyKSBkaXJlY3RseSBhcyBhIGxpdmUgZW50aXR5LiBQYWlycyB3aXRoIGFuIGF0b21pY2Fzc2V0czo6dHJhbnNmZXIgY2FycnlpbmcgdGhlICdkZXBsb3knIG1lbW8gaW4gdGhlIHNhbWUgdHJhbnNhY3Rpb24uIFRoZSBORlQgaXMgYnVybmVkLCBhIG5ldyBlbnRpdHkgcm93IGlzIGVtcGxhY2VkIGF0IHRoZSBORlQncyB3cmFwIG9yaWdpbiBwYWlkIGJ5IHRoZSBvd25lciwgYW5kIFRBU0tfVFJBVkVMIHBsdXMgVEFTS19SRUNIQVJHRSBhcmUgcXVldWVkIHRvIGRlbGl2ZXIgdGhlIGVudGl0eSB0byB0aGUgdGFyZ2V0IG5leHVzIGFuZCBicmluZyBpdCB0byBmdWxsIGVuZXJneS4AgJKGqWxS1Qp1cGRhdGVnYW1ljQItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdXBkYXRlZ2FtZQpzdW1tYXJ5OiAnVXBkYXRlIGdhbWUgaW5mb3JtYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpVcGRhdGUgdGhlIGluZm9ybWF0aW9uIGFib3V0IHRoZSBzcGVjaWZpZWQgZ2FtZSBjb250cmFjdC4KCi0tLQAAAAAAoKrjBHdpcGWyAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlCnN1bW1hcnk6ICdERUJVRzogd2lwZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0AAADc3NSy4wh3aXRoZHJhd5cDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpdGhkcmF3CnN1bW1hcnk6ICdXaXRoZHJhdyB0b2tlbnMgZnJvbSBhIGRlcG9zaXQgYmFsYW5jZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCldpdGhkcmF3IHRva2VucyBmcm9tIHRoZSBvd25lcidzIGRlcG9zaXQgYmFsYW5jZS4gRGViaXRzIHRoZSBsZWRnZXIgYnkgdGhlIHJlcXVlc3RlZCBhbW91bnQgYW5kIHRyYW5zZmVycyB0aGUgdG9rZW5zIHRvIHRoZSBvd25lci4gUmVxdWlyZXMgYSBzdWZmaWNpZW50IGJhbGFuY2UgYW5kIHRoZSBvd25lcidzIGF1dGhvcml0eS4AAKDsGlTN5Ql3cmFwY2FyZ28AAIDPLk9VzeUKd3JhcGVudGl0ebUELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdyYXBlbnRpdHkKc3VtbWFyeTogJ1dyYXAgYSBkZXBsb3llZCBlbnRpdHkgaW50byBhbiBORlQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCldyYXAgYW4gZW50aXR5IGludG8gYW4gQXRvbWljQXNzZXRzIE5GVCBtaW50ZWQgdG8gaXRzIG93bmVyLiBUaGUgZW50aXR5IG11c3QgYmUgYXQgYSBuZXh1cywgaWRsZSB3aXRoIGVtcHR5IGNhcmdvLCBhbmQgaGF2ZSBhbiBuZnRjb25maWcgbWFwcGluZyBmb3IgaXRzIGl0ZW0gaWQuIEVyYXNlcyB0aGUgZW50aXR5IGFuZCBtaW50cyB0aGUgTkZUIGlubGluZSwgcHJlc2VydmluZyBpdHMgc3RhdHMgYW5kIGluc3RhbGxlZCBtb2R1bGVzOyB0aGUgcGxheWVyIHBheXMgUkFNIGZvciB0aGUgbmV3IGFzc2V0IHJvdy4gUmVxdWlyZXMgdGhlIG93bmVyJ3MgYWN0aXZlIHBlcm1pc3Npb24gKG5vIHNlc3Npb24ta2V5IGNvbXBhdGliaWxpdHkpLgcAAABAoWmiOQNpNjQAAAtiYWxhbmNlX3JvdwAAAMBPUyVFA2k2NAAAC2NvbXBhbnlfcm93AABbKDtMq0oDaTY0AAAOZGVwb3NpdGNmZ19yb3cAAAAAAKykYQNpNjQAAAhnYW1lX3JvdwAAAAAAlU3GA2k2NAAACXN0YXRlX3JvdwBAxhpVc/nUA2k2NAAADnVud3JhcGN1c3Rfcm93AAAAKhtWzeUDaTY0AAAMd3JhcGdhdGVfcm93ARNTaGlwbG9hZCAoUGxhdGZvcm0pE1NoaXBsb2FkIChQbGF0Zm9ybSkAAAAA'
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
    @Struct.type('cleartable')
    export class cleartable extends Struct {
        @Struct.field(Name)
        declare table_name: Name
        @Struct.field(Name, {optional: true})
        declare scope?: Name
        @Struct.field(UInt64, {optional: true})
        declare max_rows?: UInt64
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
    @Struct.type('dbgrefund')
    export class dbgrefund extends Struct {
        @Struct.field(Name, {array: true})
        declare owners: Name[]
    }
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
    @Struct.type('setepochtime')
    export class setepochtime extends Struct {
        @Struct.field(Name)
        declare contract: Name
        @Struct.field(UInt32)
        declare epochtime: UInt32
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
    @Struct.type('wipe')
    export class wipe extends Struct {}
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
    export interface cleartable {
        table_name: NameType
        scope?: NameType
        max_rows?: UInt64Type
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
    export interface dbgrefund {
        owners: NameType[]
    }
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
    export interface setepochtime {
        contract: NameType
        epochtime: UInt32Type
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
    export interface wipe {}
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
    cleartable: ActionParams.cleartable
    close: ActionParams.close
    contribute: ActionParams.contribute
    dbgrefund: ActionParams.dbgrefund
    debitdeposit: ActionParams.debitdeposit
    enable: ActionParams.enable
    enablegame: ActionParams.enablegame
    foundcompany: ActionParams.foundcompany
    open: ActionParams.open
    relgateasset: ActionParams.relgateasset
    relgateowner: ActionParams.relgateowner
    setepochtime: ActionParams.setepochtime
    settoken: ActionParams.settoken
    startgame: ActionParams.startgame
    unwrapcargo: ActionParams.unwrapcargo
    unwrapentity: ActionParams.unwrapentity
    updategame: ActionParams.updategame
    wipe: ActionParams.wipe
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
