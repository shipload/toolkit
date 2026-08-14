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
    'DmVvc2lvOjphYmkvMS4yACELYmFsYW5jZV9yb3cAAg50b2tlbl9jb250cmFjdARuYW1lB2JhbGFuY2UFYXNzZXQKY2FyZ29faXRlbQAFB2l0ZW1faWQGdWludDE2BXN0YXRzBnVpbnQ2NAdtb2R1bGVzDm1vZHVsZV9lbnRyeVtdCHF1YW50aXR5BnVpbnQzMgllbnRpdHlfaWQHdWludDY0PwpjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8FY2xvc2UAAwVvd25lcgRuYW1lDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAtjb21wYW55X3JvdwACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwpjb250cmlidXRlAAYEZ2FtZQRuYW1lBnBsYXllcgRuYW1lCWVudGl0eV9pZAZ1aW50NjQBeAVpbnQ2NAF5BWludDY0BmJ1bmRsZQxjYXJnb19pdGVtW10MZGViaXRkZXBvc2l0AAUFb3duZXIEbmFtZQV0b2tlbgRuYW1lBmxvY2tlZAVhc3NldAtmZWVfYWNjb3VudARuYW1lA2ZlZQVhc3NldA5kZXBvc2l0Y2ZnX3JvdwACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAZlbmFibGUAAQdlbmFibGVkBGJvb2wKZW5hYmxlZ2FtZQACCGNvbnRyYWN0BG5hbWUHZW5hYmxlZARib29sDGZvdW5kY29tcGFueQACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwtnYW1lX2NvbmZpZwAEBHNlZWQLY2hlY2tzdW0yNTYJZXBvY2h0aW1lBnVpbnQzMgVzdGFydA50aW1lX3BvaW50X3NlYwNlbmQOdGltZV9wb2ludF9zZWMJZ2FtZV9tZXRhAAQEbmFtZQZzdHJpbmcLZGVzY3JpcHRpb24Gc3RyaW5nA3VybAZzdHJpbmcHdmVyc2lvbgZzdHJpbmcIZ2FtZV9yb3cABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCmdhbWVfc3RhdGUAAQdlbmFibGVkBGJvb2wMbW9kdWxlX2VudHJ5AAIEdHlwZQV1aW50OAlpbnN0YWxsZWQOcGFja2VkX21vZHVsZT8Eb3BlbgADBW93bmVyBG5hbWUOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sDXBhY2tlZF9tb2R1bGUAAgdpdGVtX2lkBnVpbnQxNgVzdGF0cwZ1aW50NjQMcmVsZ2F0ZWFzc2V0AAEIYXNzZXRfaWQGdWludDY0DHJlbGdhdGVvd25lcgABBW93bmVyBG5hbWUMc2V0ZXBvY2h0aW1lAAIIY29udHJhY3QEbmFtZQllcG9jaHRpbWUGdWludDMyCHNldHRva2VuAAIOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sCXN0YXJ0Z2FtZQAECGNvbnRyYWN0BG5hbWUGY29uZmlnC2dhbWVfY29uZmlnBG1ldGEJZ2FtZV9tZXRhBXN0YXRlCmdhbWVfc3RhdGUJc3RhdGVfcm93AAEHZW5hYmxlZARib29sC3Vud3JhcGNhcmdvAAMEZ2FtZQRuYW1lBW93bmVyBG5hbWUIYXNzZXRfaWQGdWludDY0DnVud3JhcGN1c3Rfcm93AAIIYXNzZXRfaWQGdWludDY0BW93bmVyBG5hbWUMdW53cmFwZW50aXR5AAMEZ2FtZQRuYW1lBW93bmVyBG5hbWUIYXNzZXRfaWQGdWludDY0CnVwZGF0ZWdhbWUAAghjb250cmFjdARuYW1lBG1ldGEJZ2FtZV9tZXRhBHdpcGUAAAh3aXRoZHJhdwADBW93bmVyBG5hbWUIcXVhbnRpdHkOZXh0ZW5kZWRfYXNzZXQEbWVtbwZzdHJpbmcJd3JhcGNhcmdvAAYEZ2FtZQRuYW1lBW93bmVyBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhuZXh1c19pZAZ1aW50NjQIY2FyZ29faWQGdWludDY0CHF1YW50aXR5BnVpbnQ2NAp3cmFwZW50aXR5AAQEZ2FtZQRuYW1lBW93bmVyBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhuZXh1c19pZAZ1aW50NjQMd3JhcGdhdGVfcm93AAMFb3duZXIEbmFtZQRnYW1lBG5hbWUNbGFzdF9hc3NldF9pZAZ1aW50NjQUAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAAAAhWlEBWNsb3Nl4gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2xvc2UKc3VtbWFyeTogJ0Nsb3NlIGEgZGVwb3NpdCBiYWxhbmNlIHJvdycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkNsb3NlIHRoZSBvd25lcidzIGRlcG9zaXQgYmFsYW5jZSByb3cgZm9yIHRoZSBnaXZlbiB0b2tlbiBhbmQgZnJlZSBpdHMgUkFNLiBUaGUgYmFsYW5jZSBtdXN0IGJlIHplcm8gYmVmb3JlIGNsb3NpbmcuIFJlcXVpcmVzIHRoZSBvd25lcidzIGF1dGhvcml0eS4AgMr6uJsnRQpjb250cmlidXRlAJAdplWl7I5KDGRlYml0ZGVwb3NpdJ0ELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGRlYml0ZGVwb3NpdApzdW1tYXJ5OiAnRGViaXQgYSBkZXBvc2l0IGJhbGFuY2UgZm9yIGEgd3JhcCBvcGVyYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpJbnRlcm5hbCBhY3Rpb24gY2FsbGVkIGlubGluZSBieSBhIHJlZ2lzdGVyZWQsIGVuYWJsZWQgZ2FtZSBjb250cmFjdCBvbmx5LiBEZWJpdHMgdGhlIG93bmVyJ3MgZGVwb3NpdCBiYWxhbmNlIGJ5IHRoZSBsb2NrZWQgYW1vdW50IHBsdXMgdGhlIGZlZSwgYW5kIGNyZWRpdHMgdGhlIGZlZSB0byB0aGUgY29uZmlndXJlZCBmZWUgYWNjb3VudC4gVXNlZCBieSBhIGdhbWUncyB3cmFwIGZsb3cgdG8gY29sbGVjdCB0aGUgd3JhcCBjb3N0LiBDYW5ub3QgYmUgY2FsbGVkIGRpcmVjdGx5IGJ5IHBsYXllcnMgb3IgdW5yZWdpc3RlcmVkIGFjY291bnRzLgAAAACoeMxUBmVuYWJsZfMBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnRW5hYmxlL2Rpc2FibGUgcGxhdGZvcm0nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGUgcGxhdGZvcm0gY29udHJhY3QuAICShql4zFQKZW5hYmxlZ2FtZfwBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZWdhbWUKc3VtbWFyeTogJ0VuYWJsZS9kaXNiYWJsZSBhIGdhbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGUgc3BlY2lmaWVkIGdhbWUgY29udHJhY3Qu4KepkqI0NV0MZm91bmRjb21wYW55gwItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZm91bmRjb21wYW55CnN1bW1hcnk6ICdGb3VuZCBhIG5ldyBjb21wYW55JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKRm91bmQgYSBuZXcgY29tcGFueSBpbiB0aGUgU2hpcGxvYWQgcGxhdGZvcm0gY29udHJhY3QuAAAAAAAwVaUEb3BlbpsDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IG9wZW4Kc3VtbWFyeTogJ09wZW4gYSBkZXBvc2l0IGJhbGFuY2Ugcm93JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKT3BlbiBhIHplcm8tYmFsYW5jZSBkZXBvc2l0IHJvdyBmb3IgdGhlIGdpdmVuIG93bmVyIGFuZCB0b2tlbiwgd2l0aCBSQU0gcGFpZCBieSB0aGUgb3duZXIuIEhhcyBubyBlZmZlY3QgaWYgdGhlIHJvdyBhbHJlYWR5IGV4aXN0cy4gTXVzdCBiZSBjYWxsZWQgYmVmb3JlIHRoZSBvd25lciBjYW4gcmVjZWl2ZSB0b2tlbiBkZXBvc2l0cyBvciB3cmFwIHJlZnVuZHMukBXGRmXDoroMcmVsZ2F0ZWFzc2V0AHDV5FRlw6K6DHJlbGdhdGVvd25lcgCgpMsN0aqywgxzZXRlcG9jaHRpbWXEAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzZXRlcG9jaHRpbWUKc3VtbWFyeTogJ0RFQlVHOiBvdmVycmlkZSBhIGdhbWUnJ3MgZXBvY2ggdGltZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKT3ZlcnJpZGUgdGhlIGVwb2NoIGR1cmF0aW9uIGluIHRoZSBjb25maWd1cmF0aW9uIG9mIHRoZSBzcGVjaWZpZWQgZ2FtZSBjb250cmFjdC4gUmVxdWlyZXMgcGxhdGZvcm0gY29udHJhY3QgYXV0aG9yaXR5LgAAAFNBmrPCCHNldHRva2VunQMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2V0dG9rZW4Kc3VtbWFyeTogJ1NldCB0aGUgYWNjZXB0ZWQgZGVwb3NpdCB0b2tlbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkFkbWluIGFjdGlvbiB0aGF0IHNldHMgdGhlIGFjY2VwdGVkIGRlcG9zaXQgdG9rZW4gKGNvbnRyYWN0IGFjY291bnQgYW5kIHN5bWJvbCkgZm9yIHRoZSBwbGF0Zm9ybS4gQWxsIHBsYXllciBkZXBvc2l0cyBhbmQgd3JhcCBjb3N0cyBhcmUgZGVub21pbmF0ZWQgaW4gdGhpcyB0b2tlbi4gUmVxdWlyZXMgcGxhdGZvcm0gY29udHJhY3QgYXV0aG9yaXR5LgAAUNKwfE3GCXN0YXJ0Z2FtZf8BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHN0YXJ0Z2FtZQpzdW1tYXJ5OiAnU3RhcnQgYSBuZXcgZ2FtZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KClN0YXJ0IGEgbmV3IGdhbWUgb2YgU2hpcGxvYWQgZGVwbG95ZWQgdG8gYSBuZXcgY29udHJhY3QuACi7BlVz+dQLdW53cmFwY2FyZ2/PBC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1bndyYXBjYXJnbwpzdW1tYXJ5OiAnRGVwb3NpdCBhbiBORlQgaW50byBhIGhvc3QgZW50aXR5JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpEZXBvc2l0IGFuIEF0b21pY0Fzc2V0cyBORlQgaW50byBhIGhvc3QgZW50aXR5J3MgY2FyZ28uIFBhaXJzIHdpdGggYW4gYXRvbWljYXNzZXRzOjp0cmFuc2ZlciBjYXJyeWluZyB0aGUgJ3Vud3JhcCcgbWVtbyBpbiB0aGUgc2FtZSB0cmFuc2FjdGlvbi4gVGhlIGNhbGxlciBtdXN0IG93biB0aGUgaG9zdCwgdGhlIGhvc3QgbXVzdCBoYXZlIGxvYWRlcnMsIGFuZCB0aGUgaG9zdCBtdXN0IGhhdmUgY2FwYWNpdHkgaGVhZHJvb20gZm9yIHRoZSB1bndyYXBwZWQgbWFzcy4gU2NoZWR1bGVzIGEgVEFTS19VTldSQVAgb24gdGhlIGhvc3QgdGhhdCwgb24gcmVzb2x1dGlvbiwgcGxhY2VzIHRoZSBkZWNvZGVkIGl0ZW0gaW50byB0aGUgaG9zdCdzIGNhcmdvIGFuZCBidXJucyB0aGUgTkZULuCzy1NVc/nUDHVud3JhcGVudGl0eeIELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVud3JhcGVudGl0eQpzdW1tYXJ5OiAnRGVwbG95IGFuIGVudGl0eSBORlQgZGlyZWN0bHkgdG8gYSBuZXh1cycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRGVwbG95IGEgcGFja2VkLWVudGl0eSBBdG9taWNBc3NldHMgTkZUIChvcmJpdGFsIHZlc3NlbDogc2hpcCBvciBjb250YWluZXIpIGRpcmVjdGx5IGFzIGEgbGl2ZSBlbnRpdHkuIFBhaXJzIHdpdGggYW4gYXRvbWljYXNzZXRzOjp0cmFuc2ZlciBjYXJyeWluZyB0aGUgJ2RlcGxveScgbWVtbyBpbiB0aGUgc2FtZSB0cmFuc2FjdGlvbi4gVGhlIE5GVCBpcyBidXJuZWQsIGEgbmV3IGVudGl0eSByb3cgaXMgZW1wbGFjZWQgYXQgdGhlIE5GVCdzIHdyYXAgb3JpZ2luIHBhaWQgYnkgdGhlIG93bmVyLCBhbmQgVEFTS19UUkFWRUwgcGx1cyBUQVNLX1JFQ0hBUkdFIGFyZSBxdWV1ZWQgdG8gZGVsaXZlciB0aGUgZW50aXR5IHRvIHRoZSB0YXJnZXQgbmV4dXMgYW5kIGJyaW5nIGl0IHRvIGZ1bGwgZW5lcmd5LgCAkoapbFLVCnVwZGF0ZWdhbWWNAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1cGRhdGVnYW1lCnN1bW1hcnk6ICdVcGRhdGUgZ2FtZSBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KClVwZGF0ZSB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHNwZWNpZmllZCBnYW1lIGNvbnRyYWN0LgoKLS0tAAAAAACgquMEd2lwZbIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGUKc3VtbWFyeTogJ0RFQlVHOiB3aXBlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAANzc1LLjCHdpdGhkcmF3lwMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogd2l0aGRyYXcKc3VtbWFyeTogJ1dpdGhkcmF3IHRva2VucyBmcm9tIGEgZGVwb3NpdCBiYWxhbmNlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKV2l0aGRyYXcgdG9rZW5zIGZyb20gdGhlIG93bmVyJ3MgZGVwb3NpdCBiYWxhbmNlLiBEZWJpdHMgdGhlIGxlZGdlciBieSB0aGUgcmVxdWVzdGVkIGFtb3VudCBhbmQgdHJhbnNmZXJzIHRoZSB0b2tlbnMgdG8gdGhlIG93bmVyLiBSZXF1aXJlcyBhIHN1ZmZpY2llbnQgYmFsYW5jZSBhbmQgdGhlIG93bmVyJ3MgYXV0aG9yaXR5LgAAoOwaVM3lCXdyYXBjYXJnbwAAgM8uT1XN5Qp3cmFwZW50aXR5tQQtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogd3JhcGVudGl0eQpzdW1tYXJ5OiAnV3JhcCBhIGRlcGxveWVkIGVudGl0eSBpbnRvIGFuIE5GVCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKV3JhcCBhbiBlbnRpdHkgaW50byBhbiBBdG9taWNBc3NldHMgTkZUIG1pbnRlZCB0byBpdHMgb3duZXIuIFRoZSBlbnRpdHkgbXVzdCBiZSBhdCBhIG5leHVzLCBpZGxlIHdpdGggZW1wdHkgY2FyZ28sIGFuZCBoYXZlIGFuIG5mdGNvbmZpZyBtYXBwaW5nIGZvciBpdHMgaXRlbSBpZC4gRXJhc2VzIHRoZSBlbnRpdHkgYW5kIG1pbnRzIHRoZSBORlQgaW5saW5lLCBwcmVzZXJ2aW5nIGl0cyBzdGF0cyBhbmQgaW5zdGFsbGVkIG1vZHVsZXM7IHRoZSBwbGF5ZXIgcGF5cyBSQU0gZm9yIHRoZSBuZXcgYXNzZXQgcm93LiBSZXF1aXJlcyB0aGUgb3duZXIncyBhY3RpdmUgcGVybWlzc2lvbiAobm8gc2Vzc2lvbi1rZXkgY29tcGF0aWJpbGl0eSkuBwAAAEChaaI5A2k2NAAAC2JhbGFuY2Vfcm93AAAAwE9TJUUDaTY0AAALY29tcGFueV9yb3cAAFsoO0yrSgNpNjQAAA5kZXBvc2l0Y2ZnX3JvdwAAAAAArKRhA2k2NAAACGdhbWVfcm93AAAAAACVTcYDaTY0AAAJc3RhdGVfcm93AEDGGlVz+dQDaTY0AAAOdW53cmFwY3VzdF9yb3cAAAAqG1bN5QNpNjQAAAx3cmFwZ2F0ZV9yb3cBE1NoaXBsb2FkIChQbGF0Zm9ybSkTU2hpcGxvYWQgKFBsYXRmb3JtKQAAAAA='
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
    cleartable: ActionParams.cleartable
    close: ActionParams.close
    contribute: ActionParams.contribute
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
