import type {
    Action,
    AssetType,
    Checksum256Type,
    ExtendedAssetType,
    NameType,
    UInt32Type,
    UInt64Type,
} from '@wharfkit/antelope'
import {
    ABI,
    Asset,
    Blob,
    Checksum256,
    ExtendedAsset,
    Name,
    Struct,
    TimePointSec,
    UInt32,
    UInt64,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yABsLYmFsYW5jZV9yb3cAAg50b2tlbl9jb250cmFjdARuYW1lB2JhbGFuY2UFYXNzZXQKY2xlYXJ0YWJsZQADCnRhYmxlX25hbWUEbmFtZQVzY29wZQVuYW1lPwhtYXhfcm93cwd1aW50NjQ/BWNsb3NlAAMFb3duZXIEbmFtZQ50b2tlbl9jb250cmFjdARuYW1lDHRva2VuX3N5bWJvbAZzeW1ib2wLY29tcGFueV9yb3cAAgdhY2NvdW50BG5hbWUEbmFtZQZzdHJpbmcMZGViaXRkZXBvc2l0AAUFb3duZXIEbmFtZQV0b2tlbgRuYW1lBmxvY2tlZAVhc3NldAtmZWVfYWNjb3VudARuYW1lA2ZlZQVhc3NldA5kZXBvc2l0Y2ZnX3JvdwACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAZlbmFibGUAAQdlbmFibGVkBGJvb2wKZW5hYmxlZ2FtZQACCGNvbnRyYWN0BG5hbWUHZW5hYmxlZARib29sDGZvdW5kY29tcGFueQACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwtnYW1lX2NvbmZpZwAEBHNlZWQLY2hlY2tzdW0yNTYJZXBvY2h0aW1lBnVpbnQzMgVzdGFydA50aW1lX3BvaW50X3NlYwNlbmQOdGltZV9wb2ludF9zZWMJZ2FtZV9tZXRhAAQEbmFtZQZzdHJpbmcLZGVzY3JpcHRpb24Gc3RyaW5nA3VybAZzdHJpbmcHdmVyc2lvbgZzdHJpbmcIZ2FtZV9yb3cABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCmdhbWVfc3RhdGUAAQdlbmFibGVkBGJvb2wEb3BlbgADBW93bmVyBG5hbWUOdG9rZW5fY29udHJhY3QEbmFtZQx0b2tlbl9zeW1ib2wGc3ltYm9sDHNldGVwb2NodGltZQACCGNvbnRyYWN0BG5hbWUJZXBvY2h0aW1lBnVpbnQzMghzZXR0b2tlbgACDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAlzdGFydGdhbWUABAhjb250cmFjdARuYW1lBmNvbmZpZwtnYW1lX2NvbmZpZwRtZXRhCWdhbWVfbWV0YQVzdGF0ZQpnYW1lX3N0YXRlCXN0YXRlX3JvdwABB2VuYWJsZWQEYm9vbAt1bndyYXBjYXJnbwADBGdhbWUEbmFtZQVvd25lcgRuYW1lCGFzc2V0X2lkBnVpbnQ2NA51bndyYXBjdXN0X3JvdwACCGFzc2V0X2lkBnVpbnQ2NAVvd25lcgRuYW1lDHVud3JhcGVudGl0eQADBGdhbWUEbmFtZQVvd25lcgRuYW1lCGFzc2V0X2lkBnVpbnQ2NAp1cGRhdGVnYW1lAAIIY29udHJhY3QEbmFtZQRtZXRhCWdhbWVfbWV0YQR3aXBlAAAId2l0aGRyYXcAAwVvd25lcgRuYW1lCHF1YW50aXR5DmV4dGVuZGVkX2Fzc2V0BG1lbW8Gc3RyaW5nCXdyYXBjYXJnbwAGBGdhbWUEbmFtZQVvd25lcgRuYW1lCWVudGl0eV9pZAZ1aW50NjQIbmV4dXNfaWQGdWludDY0CGNhcmdvX2lkBnVpbnQ2NAhxdWFudGl0eQZ1aW50NjQKd3JhcGVudGl0eQAEBGdhbWUEbmFtZQVvd25lcgRuYW1lCWVudGl0eV9pZAZ1aW50NjQIbmV4dXNfaWQGdWludDY0DHdyYXBnYXRlX3JvdwACBW93bmVyBG5hbWUNbGFzdF9hc3NldF9pZAZ1aW50NjQRAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAAAAhWlEBWNsb3Nl4gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2xvc2UKc3VtbWFyeTogJ0Nsb3NlIGEgZGVwb3NpdCBiYWxhbmNlIHJvdycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkNsb3NlIHRoZSBvd25lcidzIGRlcG9zaXQgYmFsYW5jZSByb3cgZm9yIHRoZSBnaXZlbiB0b2tlbiBhbmQgZnJlZSBpdHMgUkFNLiBUaGUgYmFsYW5jZSBtdXN0IGJlIHplcm8gYmVmb3JlIGNsb3NpbmcuIFJlcXVpcmVzIHRoZSBvd25lcidzIGF1dGhvcml0eS6QHaZVpeyOSgxkZWJpdGRlcG9zaXSdBC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBkZWJpdGRlcG9zaXQKc3VtbWFyeTogJ0RlYml0IGEgZGVwb3NpdCBiYWxhbmNlIGZvciBhIHdyYXAgb3BlcmF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKSW50ZXJuYWwgYWN0aW9uIGNhbGxlZCBpbmxpbmUgYnkgYSByZWdpc3RlcmVkLCBlbmFibGVkIGdhbWUgY29udHJhY3Qgb25seS4gRGViaXRzIHRoZSBvd25lcidzIGRlcG9zaXQgYmFsYW5jZSBieSB0aGUgbG9ja2VkIGFtb3VudCBwbHVzIHRoZSBmZWUsIGFuZCBjcmVkaXRzIHRoZSBmZWUgdG8gdGhlIGNvbmZpZ3VyZWQgZmVlIGFjY291bnQuIFVzZWQgYnkgYSBnYW1lJ3Mgd3JhcCBmbG93IHRvIGNvbGxlY3QgdGhlIHdyYXAgY29zdC4gQ2Fubm90IGJlIGNhbGxlZCBkaXJlY3RseSBieSBwbGF5ZXJzIG9yIHVucmVnaXN0ZXJlZCBhY2NvdW50cy4AAAAAqHjMVAZlbmFibGXzAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBlbmFibGUKc3VtbWFyeTogJ0VuYWJsZS9kaXNhYmxlIHBsYXRmb3JtJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKRW5hYmxlIG9yIGRpc2FibGUgdGhlIHBsYXRmb3JtIGNvbnRyYWN0LgCAkoapeMxUCmVuYWJsZWdhbWX8AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBlbmFibGVnYW1lCnN1bW1hcnk6ICdFbmFibGUvZGlzYmFibGUgYSBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKRW5hYmxlIG9yIGRpc2FibGUgdGhlIHNwZWNpZmllZCBnYW1lIGNvbnRyYWN0LuCnqZKiNDVdDGZvdW5kY29tcGFueYMCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGZvdW5kY29tcGFueQpzdW1tYXJ5OiAnRm91bmQgYSBuZXcgY29tcGFueScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCkZvdW5kIGEgbmV3IGNvbXBhbnkgaW4gdGhlIFNoaXBsb2FkIHBsYXRmb3JtIGNvbnRyYWN0LgAAAAAAMFWlBG9wZW6bAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBvcGVuCnN1bW1hcnk6ICdPcGVuIGEgZGVwb3NpdCBiYWxhbmNlIHJvdycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE1ODExMzc4MiNkM2JmMjkwZmRkZWRkYmI3ZDMyYWE4OTdlOWY3ZTllMTNhMmFlNDQ5NTYxNDJlMjNlYjQ3Yjc3MDk2YTJlYThkCgotLS0KCk9wZW4gYSB6ZXJvLWJhbGFuY2UgZGVwb3NpdCByb3cgZm9yIHRoZSBnaXZlbiBvd25lciBhbmQgdG9rZW4sIHdpdGggUkFNIHBhaWQgYnkgdGhlIG93bmVyLiBIYXMgbm8gZWZmZWN0IGlmIHRoZSByb3cgYWxyZWFkeSBleGlzdHMuIE11c3QgYmUgY2FsbGVkIGJlZm9yZSB0aGUgb3duZXIgY2FuIHJlY2VpdmUgdG9rZW4gZGVwb3NpdHMgb3Igd3JhcCByZWZ1bmRzLqCkyw3RqrLCDHNldGVwb2NodGltZcQCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNldGVwb2NodGltZQpzdW1tYXJ5OiAnREVCVUc6IG92ZXJyaWRlIGEgZ2FtZScncyBlcG9jaCB0aW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpPdmVycmlkZSB0aGUgZXBvY2ggZHVyYXRpb24gaW4gdGhlIGNvbmZpZ3VyYXRpb24gb2YgdGhlIHNwZWNpZmllZCBnYW1lIGNvbnRyYWN0LiBSZXF1aXJlcyBwbGF0Zm9ybSBjb250cmFjdCBhdXRob3JpdHkuAAAAU0Gas8IIc2V0dG9rZW6dAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzZXR0b2tlbgpzdW1tYXJ5OiAnU2V0IHRoZSBhY2NlcHRlZCBkZXBvc2l0IHRva2VuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKQWRtaW4gYWN0aW9uIHRoYXQgc2V0cyB0aGUgYWNjZXB0ZWQgZGVwb3NpdCB0b2tlbiAoY29udHJhY3QgYWNjb3VudCBhbmQgc3ltYm9sKSBmb3IgdGhlIHBsYXRmb3JtLiBBbGwgcGxheWVyIGRlcG9zaXRzIGFuZCB3cmFwIGNvc3RzIGFyZSBkZW5vbWluYXRlZCBpbiB0aGlzIHRva2VuLiBSZXF1aXJlcyBwbGF0Zm9ybSBjb250cmFjdCBhdXRob3JpdHkuAABQ0rB8TcYJc3RhcnRnYW1l/wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc3RhcnRnYW1lCnN1bW1hcnk6ICdTdGFydCBhIG5ldyBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKU3RhcnQgYSBuZXcgZ2FtZSBvZiBTaGlwbG9hZCBkZXBsb3llZCB0byBhIG5ldyBjb250cmFjdC4AKLsGVXP51At1bndyYXBjYXJnb88ELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVud3JhcGNhcmdvCnN1bW1hcnk6ICdEZXBvc2l0IGFuIE5GVCBpbnRvIGEgaG9zdCBlbnRpdHknCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkRlcG9zaXQgYW4gQXRvbWljQXNzZXRzIE5GVCBpbnRvIGEgaG9zdCBlbnRpdHkncyBjYXJnby4gUGFpcnMgd2l0aCBhbiBhdG9taWNhc3NldHM6OnRyYW5zZmVyIGNhcnJ5aW5nIHRoZSAndW53cmFwJyBtZW1vIGluIHRoZSBzYW1lIHRyYW5zYWN0aW9uLiBUaGUgY2FsbGVyIG11c3Qgb3duIHRoZSBob3N0LCB0aGUgaG9zdCBtdXN0IGhhdmUgbG9hZGVycywgYW5kIHRoZSBob3N0IG11c3QgaGF2ZSBjYXBhY2l0eSBoZWFkcm9vbSBmb3IgdGhlIHVud3JhcHBlZCBtYXNzLiBTY2hlZHVsZXMgYSBUQVNLX1VOV1JBUCBvbiB0aGUgaG9zdCB0aGF0LCBvbiByZXNvbHV0aW9uLCBwbGFjZXMgdGhlIGRlY29kZWQgaXRlbSBpbnRvIHRoZSBob3N0J3MgY2FyZ28gYW5kIGJ1cm5zIHRoZSBORlQu4LPLU1Vz+dQMdW53cmFwZW50aXR54gQtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdW53cmFwZW50aXR5CnN1bW1hcnk6ICdEZXBsb3kgYW4gZW50aXR5IE5GVCBkaXJlY3RseSB0byBhIG5leHVzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpEZXBsb3kgYSBwYWNrZWQtZW50aXR5IEF0b21pY0Fzc2V0cyBORlQgKG9yYml0YWwgdmVzc2VsOiBzaGlwIG9yIGNvbnRhaW5lcikgZGlyZWN0bHkgYXMgYSBsaXZlIGVudGl0eS4gUGFpcnMgd2l0aCBhbiBhdG9taWNhc3NldHM6OnRyYW5zZmVyIGNhcnJ5aW5nIHRoZSAnZGVwbG95JyBtZW1vIGluIHRoZSBzYW1lIHRyYW5zYWN0aW9uLiBUaGUgTkZUIGlzIGJ1cm5lZCwgYSBuZXcgZW50aXR5IHJvdyBpcyBlbXBsYWNlZCBhdCB0aGUgTkZUJ3Mgd3JhcCBvcmlnaW4gcGFpZCBieSB0aGUgb3duZXIsIGFuZCBUQVNLX1RSQVZFTCBwbHVzIFRBU0tfUkVDSEFSR0UgYXJlIHF1ZXVlZCB0byBkZWxpdmVyIHRoZSBlbnRpdHkgdG8gdGhlIHRhcmdldCBuZXh1cyBhbmQgYnJpbmcgaXQgdG8gZnVsbCBlbmVyZ3kuAICShqlsUtUKdXBkYXRlZ2FtZY0CLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVwZGF0ZWdhbWUKc3VtbWFyeTogJ1VwZGF0ZSBnYW1lIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTU4MTEzNzgyI2QzYmYyOTBmZGRlZGRiYjdkMzJhYTg5N2U5ZjdlOWUxM2EyYWU0NDk1NjE0MmUyM2ViNDdiNzcwOTZhMmVhOGQKCi0tLQoKVXBkYXRlIHRoZSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc3BlY2lmaWVkIGdhbWUgY29udHJhY3QuCgotLS0AAAAAAKCq4wR3aXBlsgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogd2lwZQpzdW1tYXJ5OiAnREVCVUc6IHdpcGUgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAAAA3NzUsuMId2l0aGRyYXeXAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXRoZHJhdwpzdW1tYXJ5OiAnV2l0aGRyYXcgdG9rZW5zIGZyb20gYSBkZXBvc2l0IGJhbGFuY2UnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNTgxMTM3ODIjZDNiZjI5MGZkZGVkZGJiN2QzMmFhODk3ZTlmN2U5ZTEzYTJhZTQ0OTU2MTQyZTIzZWI0N2I3NzA5NmEyZWE4ZAoKLS0tCgpXaXRoZHJhdyB0b2tlbnMgZnJvbSB0aGUgb3duZXIncyBkZXBvc2l0IGJhbGFuY2UuIERlYml0cyB0aGUgbGVkZ2VyIGJ5IHRoZSByZXF1ZXN0ZWQgYW1vdW50IGFuZCB0cmFuc2ZlcnMgdGhlIHRva2VucyB0byB0aGUgb3duZXIuIFJlcXVpcmVzIGEgc3VmZmljaWVudCBiYWxhbmNlIGFuZCB0aGUgb3duZXIncyBhdXRob3JpdHkuAACg7BpUzeUJd3JhcGNhcmdvAACAzy5PVc3lCndyYXBlbnRpdHm1BC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3cmFwZW50aXR5CnN1bW1hcnk6ICdXcmFwIGEgZGVwbG95ZWQgZW50aXR5IGludG8gYW4gTkZUJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpXcmFwIGFuIGVudGl0eSBpbnRvIGFuIEF0b21pY0Fzc2V0cyBORlQgbWludGVkIHRvIGl0cyBvd25lci4gVGhlIGVudGl0eSBtdXN0IGJlIGF0IGEgbmV4dXMsIGlkbGUgd2l0aCBlbXB0eSBjYXJnbywgYW5kIGhhdmUgYW4gbmZ0Y29uZmlnIG1hcHBpbmcgZm9yIGl0cyBpdGVtIGlkLiBFcmFzZXMgdGhlIGVudGl0eSBhbmQgbWludHMgdGhlIE5GVCBpbmxpbmUsIHByZXNlcnZpbmcgaXRzIHN0YXRzIGFuZCBpbnN0YWxsZWQgbW9kdWxlczsgdGhlIHBsYXllciBwYXlzIFJBTSBmb3IgdGhlIG5ldyBhc3NldCByb3cuIFJlcXVpcmVzIHRoZSBvd25lcidzIGFjdGl2ZSBwZXJtaXNzaW9uIChubyBzZXNzaW9uLWtleSBjb21wYXRpYmlsaXR5KS4HAAAAQKFpojkDaTY0AAALYmFsYW5jZV9yb3cAAADAT1MlRQNpNjQAAAtjb21wYW55X3JvdwAAWyg7TKtKA2k2NAAADmRlcG9zaXRjZmdfcm93AAAAAACspGEDaTY0AAAIZ2FtZV9yb3cAAAAAAJVNxgNpNjQAAAlzdGF0ZV9yb3cAQMYaVXP51ANpNjQAAA51bndyYXBjdXN0X3JvdwAAACobVs3lA2k2NAAADHdyYXBnYXRlX3JvdwETU2hpcGxvYWQgKFBsYXRmb3JtKRNTaGlwbG9hZCAoUGxhdGZvcm0pAAAAAA=='
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
    debitdeposit: ActionParams.debitdeposit
    enable: ActionParams.enable
    enablegame: ActionParams.enablegame
    foundcompany: ActionParams.foundcompany
    open: ActionParams.open
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
