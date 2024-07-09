import type {
    Action,
    Checksum256Type,
    Int64Type,
    NameType,
    UInt16Type,
    UInt64Type,
} from '@wharfkit/antelope'
import {
    ABI,
    Blob,
    Checksum256,
    Checksum512,
    Float64,
    Int64,
    Name,
    Struct,
    TimePoint,
    UInt16,
    UInt32,
    UInt64,
    UInt8,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yACAHYWR2YW5jZQACBnJldmVhbAZzdHJpbmcGY29tbWl0C2NoZWNrc3VtMjU2BmFycml2ZQABAmlkBnVpbnQ2NAhidXlnb29kcwADB3NoaXBfaWQGdWludDY0B2dvb2RfaWQGdWludDY0CHF1YW50aXR5BnVpbnQ2NAdidXlzaGlwAAIHYWNjb3VudARuYW1lBG5hbWUGc3RyaW5nCWNhcmdvX3JvdwAGAmlkBnVpbnQ2NAdzaGlwX2lkBnVpbnQ2NAdnb29kX2lkBnVpbnQ2NARwYWlkBnVpbnQ2NAVvd25lZAZ1aW50MzIGbG9hZGVkBnVpbnQzMgpjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8GY29tbWl0AAEGY29tbWl0C2NoZWNrc3VtMjU2C2Nvb3JkaW5hdGVzAAIBeAVpbnQ2NAF5BWludDY0BmVuYWJsZQABB2VuYWJsZWQEYm9vbApnb29kX3ByaWNlAAICaWQGdWludDE2BXByaWNlBnVpbnQ2NARoYXNoAAEFdmFsdWUGc3RyaW5nB2hhc2g1MTIAAQV2YWx1ZQZzdHJpbmcEaW5pdAABBHNlZWQLY2hlY2tzdW0yNTYEam9pbgABB2FjY291bnQEbmFtZQxsb2FkZXJfc3RhdHMAAwRtYXNzBnVpbnQzMghxdWFudGl0eQZ1aW50MTYGdGhydXN0BnVpbnQzMgttYXJrZXRwcmljZQACCGxvY2F0aW9uC2Nvb3JkaW5hdGVzB2dvb2RfaWQGdWludDE2DG1hcmtldHByaWNlcwABCGxvY2F0aW9uC2Nvb3JkaW5hdGVzCnBsYXllcl9yb3cABAVvd25lcgRuYW1lB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDY0CG5ldHdvcnRoBWludDY0BHNhbHQAAQRzYWx0BnVpbnQ2NAlzZWxsZ29vZHMAAwdzaGlwX2lkBnVpbnQ2NAdnb29kX2lkBnVpbnQ2NAhxdWFudGl0eQZ1aW50NjQMc2VxdWVuY2Vfcm93AAIDa2V5BG5hbWUFdmFsdWUGdWludDY0CHNoaXBfcm93AAoCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcIbG9jYXRpb24LY29vcmRpbmF0ZXMEc2tpbgV1aW50OAR0aWVyBXVpbnQ4BXN0YXRlCnNoaXBfc3RhdGUFc3RhdHMKc2hpcF9zdGF0cwdsb2FkZXJzDGxvYWRlcl9zdGF0cwp0cmF2ZWxwbGFuDHRyYXZlbF9wbGFuPwpzaGlwX3N0YXRlAAEGZW5lcmd5BnVpbnQzMgpzaGlwX3N0YXRzAAcIY2FwYWNpdHkGdWludDMyBWRyYWluBnVpbnQzMgRtYXNzBnVpbnQ2NAdtYXhtYXNzBnVpbnQ2NAVvcmJpdAZ1aW50MTYIcmVjaGFyZ2UGdWludDMyBnRocnVzdAZ1aW50NjQJc3RhdGVfcm93AAUHZW5hYmxlZARib29sBWVwb2NoBnVpbnQ2NARzYWx0BnVpbnQ2NARzZWVkC2NoZWNrc3VtMjU2BmNvbW1pdAtjaGVja3N1bTI1NgZ0cmF2ZWwAAwJpZAZ1aW50NjQLZGVzdGluYXRpb24LY29vcmRpbmF0ZXMIcmVjaGFyZ2UEYm9vbAt0cmF2ZWxfcGxhbgAJCWRlcGFydHVyZQp0aW1lX3BvaW50C2Rlc3RpbmF0aW9uC2Nvb3JkaW5hdGVzCGRpc3RhbmNlBnVpbnQ2NApmbGlnaHR0aW1lBnVpbnQzMghsb2FkdGltZQZ1aW50MzIMcmVjaGFyZ2V0aW1lBnVpbnQzMgttYXNzcGVuYWx0eQZ1aW50MzIEbWFzcwZ1aW50NjQLZW5lcmd5dXNhZ2UGdWludDMyDnRyYXZlbF9zdW1tYXJ5AA0Fc3RhdHMKc2hpcF9zdGF0cwdsb2FkZXJzDGxvYWRlcl9zdGF0cwZvcmlnaW4LY29vcmRpbmF0ZXMLZGVzdGluYXRpb24LY29vcmRpbmF0ZXMIZGlzdGFuY2UGdWludDY0CXRvdGFsbWFzcwZ1aW50NjQMYWNjZWxlcmF0aW9uB2Zsb2F0NjQKZmxpZ2h0dGltZQZ1aW50MzILZW5lcmd5dXNhZ2UGdWludDMyDHJlY2hhcmdldGltZQZ1aW50MzILbWFzc3BlbmFsdHkGdWludDMyCGxvYWR0aW1lBnVpbnQ2NAR0aW1lBnVpbnQ2NAp0cmF2ZWxwbGFuAAQCaWQGdWludDY0Bm9yaWdpbgtjb29yZGluYXRlcwtkZXN0aW5hdGlvbgtjb29yZGluYXRlcwhyZWNoYXJnZQRib29sCnRyYXZlbHRpbWUAAgJpZAZ1aW50NjQLZGVzdGluYXRpb24LY29vcmRpbmF0ZXMEd2lwZQAADHdpcGVzZXF1ZW5jZQAAFAAAAEChaXYyB2FkdmFuY2XTAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBhZHZhbmNlCnN1bW1hcnk6ICdBZHZhbmNlIHR1cm4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkdmFuY2UgdGhlIGdhbWUgdG8gdGhlIG5leHQgdHVybi4AAAAAqO3uNQZhcnJpdmWzAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBhcnJpdmUKc3VtbWFyeTogJ0NvbXBsZXRlIHRyYXZlbCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ29tcGxldGUgdGhlIHRyYXZlbCBvZiBhIHNoaXAgYnkgdXBkYXRpbmcgaXRzIGxvY2F0aW9uIHRvIHRoZSBkZXN0aW5hdGlvbiBjb29yZGluYXRlcyBhZnRlciB0aGUgdHJhdmVsIGR1cmF0aW9uIGhhcyBwYXNzZWQuCgotLS0AAAA4Ucq8PghidXlnb29kc90BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eWdvb2RzCnN1bW1hcnk6ICdCdXkgZ29vZHMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGdvb2RzIGFuZCBhZGQgdGhlbSB0byBhIHNoaXAncyBjYXJnby4AAACguoa9PgdidXlzaGlwxgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5c2hpcApzdW1tYXJ5OiAnQnV5IGEgbmV3IHNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGEgbmV3IHNoaXAAgIrH5GtURApjbGVhcnRhYmxlvgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2xlYXJ0YWJsZQpzdW1tYXJ5OiAnREVCVUc6IGNsZWFydGFibGUgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAAAAAGQnJUUGY29tbWl08QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY29tbWl0CnN1bW1hcnk6ICdTZXQgY29tbWl0IHZhbHVlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTZXQgdGhlIGluaXRpYWwgY29tbWl0IHZhbHVlIGR1cmluZyBnYW1lIGluaXRpYWxpemF0aW9uLgoKLS0tAAAAAKh4zFQGZW5hYmxl4gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZW5hYmxlCnN1bW1hcnk6ICdTZXQgZW5hYmxlZCBzdGF0ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRW5hYmxlIG9yIGRpc2FibGUgdGhpcyBnYW1lIG9mIFNoaXBsb2FkLgoKLS0tAAAAAADQsGkEaGFzaP0BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGhhc2gKc3VtbWFyeTogJ0NhbGN1bGF0ZSBzaGEyNTYgaGFzaCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlcyB0aGUgc2hhMjU2IGhhc2ggb2YgYSBzdHJpbmcgYmFzZWQgdXNpbmcgdGhlIGdhbWUgc2VlZC4KCi0tLQAAAECE0rBpB2hhc2g1MTL7AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBoYXNoNTEyCnN1bW1hcnk6ICdDYWxjdWxhdGUgc2hhNTEyIGhhc2gnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbGN1bGF0ZXMgdGhlIHNoYTUxMiBoYXNoIG9mIGEgc3RyaW5nIGJhc2VkIHVzaW5nIHRoZSBnYW1lIHNlZWQuAAAAAACQ3XQEaW5pdPoBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGluaXQKc3VtbWFyeTogJ0luaXRpYWxpemUgZ2FtZSBzZWVkJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWFsaXplIGEgdGhlIGdhbWVzIHNlZWQgYW5kIHNlZWQgdmFsdWVzIHRvIGJvb3RzdHJhcCBnYW1lIHN0YXRlLgAAAAAAMB19BGpvaW7JAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBqb2luCnN1bW1hcnk6ICdKb2luIGEgZ2FtZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSm9pbiBhIGdhbWUgb2YgU2hpcGxvYWQKCi0tLQAUcrdmBa+RC21hcmtldHByaWNlmwItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogbWFya2V0cHJpY2UKc3VtbWFyeTogJ0dldCBwcmljZSBvZiBnb29kIGF0IGxvY2F0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiBkZXRlcm1pbmVzIHRoZSBtYXJrZXQgcHJpY2Ugb2YgYSBzcGVjaWZpZWQgZ29vZCBhdCBhIGdpdmVuIGxvY2F0aW9uLgoKLS0tgBVyt2YFr5EMbWFya2V0cHJpY2VzlQItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogbWFya2V0cHJpY2VzCnN1bW1hcnk6ICdHZXQgcHJpY2Ugb2YgYWxsIGdvb2RzIGF0IGxvY2F0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiBkZXRlcm1pbmVzIHRoZSBtYXJrZXQgcHJpY2Ugb2YgYWxsIGdvb2RzIGF0IGEgZ2l2ZW4gbG9jYXRpb24uAAAAAACQo8EEc2FsdN0BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNhbHQKc3VtbWFyeTogJ0FwcGVuZCBTYWx0JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZGQgYWRkaXRpb25hbCBzYWx0IHRvIHRoZSBuZXh0IGVwb2NoIHNlZWQuCgotLS0AAMCJUhajwglzZWxsZ29vZHPVAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzZWxsZ29vZHMKc3VtbWFyeTogJ1NlbGwgZ29vZHMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClNlbGwgZ29vZHMgZnJvbSBhIHNoaXAncyBjYXJnby4KCi0tLQAAAABEtc3NBnRyYXZlbMgCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHRyYXZlbApzdW1tYXJ5OiAnTW92ZSBhIHNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYXRlIHRyYXZlbCBvZiBhIHNoaXAgZnJvbSBpdHMgY3VycmVudCBsb2NhdGlvbiB0byBhIG5ldyBkZXN0aW5hdGlvbi4KCi0tLQoKVGhpcyBhY3Rpb24gZGV0ZXJtaW5lcyB0aGUgbWFya2V0IHByaWNlIG9mIGFsbCBnb29kcyBhdCBhIGdpdmVuIGxvY2F0aW9uLgDANLFGtc3NCnRyYXZlbHBsYW6OAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWxwbGFuCnN1bW1hcnk6ICdFc3RpbWF0ZSBhIHRyYXZlbCBwbGFuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGUgd2hhdCB0aGUgdHJhdmVsIHBsYW4gaXMgZm9yIGEgc2hpcCB0cmF2ZWxpbmcgdG8gYSBnaXZlbiBsb2NhdGlvbi4KCi0tLQCAki5Htc3NCnRyYXZlbHRpbWWMAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWx0aW1lCnN1bW1hcnk6ICdFc3RpbWF0ZSBUcmF2ZWwgVGltZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRXN0aW1hdGUgdGhlIGR1cmF0aW9uIG9mIGEgc2hpcCB0cmF2ZWxpbmcgd2l0aG91dCBjb21taXR0aW5nIHRvIHRoZSBhY3Rpb24uCgotLS0AAAAAAKCq4wR3aXBlsgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogd2lwZQpzdW1tYXJ5OiAnREVCVUc6IHdpcGUgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0toNBU2iqsquMMd2lwZXNlcXVlbmNlwgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogd2lwZXNlcXVlbmNlCnN1bW1hcnk6ICdERUJVRzogd2lwZXNlcXVlbmNlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQUAAAAAAMquQQNpNjQAAAljYXJnb19yb3cAAAAAXOVNrANpNjQAAApwbGF5ZXJfcm93AAAACk2lrcIDaTY0AAAMc2VxdWVuY2Vfcm93AAAAAABQXcMDaTY0AAAIc2hpcF9yb3cAAAAAAJVNxgNpNjQAAAlzdGF0ZV9yb3cBEVNoaXBsb2FkIChTZXJ2ZXIpEVNoaXBsb2FkIChTZXJ2ZXIpAAAABgAAAAAA0LBpC2NoZWNrc3VtMjU2AAAAQITSsGkLY2hlY2tzdW01MTIAFHK3ZgWvkQpnb29kX3ByaWNlgBVyt2YFr5EMZ29vZF9wcmljZVtdAMA0sUa1zc0LdHJhdmVsX3BsYW4AgJIuR7XNzQ50cmF2ZWxfc3VtbWFyeQ=='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('advance')
    export class advance extends Struct {
        @Struct.field('string')
        reveal!: string
        @Struct.field(Checksum256)
        commit!: Checksum256
    }
    @Struct.type('arrive')
    export class arrive extends Struct {
        @Struct.field(UInt64)
        id!: UInt64
    }
    @Struct.type('buygoods')
    export class buygoods extends Struct {
        @Struct.field(UInt64)
        ship_id!: UInt64
        @Struct.field(UInt64)
        good_id!: UInt64
        @Struct.field(UInt64)
        quantity!: UInt64
    }
    @Struct.type('buyship')
    export class buyship extends Struct {
        @Struct.field(Name)
        account!: Name
        @Struct.field('string')
        name!: string
    }
    @Struct.type('cargo_row')
    export class cargo_row extends Struct {
        @Struct.field(UInt64)
        id!: UInt64
        @Struct.field(UInt64)
        ship_id!: UInt64
        @Struct.field(UInt64)
        good_id!: UInt64
        @Struct.field(UInt64)
        paid!: UInt64
        @Struct.field(UInt32)
        owned!: UInt32
        @Struct.field(UInt32)
        loaded!: UInt32
    }
    @Struct.type('cleartable')
    export class cleartable extends Struct {
        @Struct.field(Name)
        table_name!: Name
        @Struct.field(Name, {optional: true})
        scope?: Name
        @Struct.field(UInt64, {optional: true})
        max_rows?: UInt64
    }
    @Struct.type('commit')
    export class commit extends Struct {
        @Struct.field(Checksum256)
        commit!: Checksum256
    }
    @Struct.type('coordinates')
    export class coordinates extends Struct {
        @Struct.field(Int64)
        x!: Int64
        @Struct.field(Int64)
        y!: Int64
    }
    @Struct.type('enable')
    export class enable extends Struct {
        @Struct.field('bool')
        enabled!: boolean
    }
    @Struct.type('good_price')
    export class good_price extends Struct {
        @Struct.field(UInt16)
        id!: UInt16
        @Struct.field(UInt64)
        price!: UInt64
    }
    @Struct.type('hash')
    export class hash extends Struct {
        @Struct.field('string')
        value!: string
    }
    @Struct.type('hash512')
    export class hash512 extends Struct {
        @Struct.field('string')
        value!: string
    }
    @Struct.type('init')
    export class init extends Struct {
        @Struct.field(Checksum256)
        seed!: Checksum256
    }
    @Struct.type('join')
    export class join extends Struct {
        @Struct.field(Name)
        account!: Name
    }
    @Struct.type('loader_stats')
    export class loader_stats extends Struct {
        @Struct.field(UInt32)
        mass!: UInt32
        @Struct.field(UInt16)
        quantity!: UInt16
        @Struct.field(UInt32)
        thrust!: UInt32
    }
    @Struct.type('marketprice')
    export class marketprice extends Struct {
        @Struct.field(coordinates)
        location!: coordinates
        @Struct.field(UInt16)
        good_id!: UInt16
    }
    @Struct.type('marketprices')
    export class marketprices extends Struct {
        @Struct.field(coordinates)
        location!: coordinates
    }
    @Struct.type('player_row')
    export class player_row extends Struct {
        @Struct.field(Name)
        owner!: Name
        @Struct.field(UInt64)
        balance!: UInt64
        @Struct.field(UInt64)
        debt!: UInt64
        @Struct.field(Int64)
        networth!: Int64
    }
    @Struct.type('salt')
    export class salt extends Struct {
        @Struct.field(UInt64)
        salt!: UInt64
    }
    @Struct.type('sellgoods')
    export class sellgoods extends Struct {
        @Struct.field(UInt64)
        ship_id!: UInt64
        @Struct.field(UInt64)
        good_id!: UInt64
        @Struct.field(UInt64)
        quantity!: UInt64
    }
    @Struct.type('sequence_row')
    export class sequence_row extends Struct {
        @Struct.field(Name)
        key!: Name
        @Struct.field(UInt64)
        value!: UInt64
    }
    @Struct.type('ship_state')
    export class ship_state extends Struct {
        @Struct.field(UInt32)
        energy!: UInt32
    }
    @Struct.type('ship_stats')
    export class ship_stats extends Struct {
        @Struct.field(UInt32)
        capacity!: UInt32
        @Struct.field(UInt32)
        drain!: UInt32
        @Struct.field(UInt64)
        mass!: UInt64
        @Struct.field(UInt64)
        maxmass!: UInt64
        @Struct.field(UInt16)
        orbit!: UInt16
        @Struct.field(UInt32)
        recharge!: UInt32
        @Struct.field(UInt64)
        thrust!: UInt64
    }
    @Struct.type('travel_plan')
    export class travel_plan extends Struct {
        @Struct.field(TimePoint)
        departure!: TimePoint
        @Struct.field(coordinates)
        destination!: coordinates
        @Struct.field(UInt64)
        distance!: UInt64
        @Struct.field(UInt32)
        flighttime!: UInt32
        @Struct.field(UInt32)
        loadtime!: UInt32
        @Struct.field(UInt32)
        rechargetime!: UInt32
        @Struct.field(UInt32)
        masspenalty!: UInt32
        @Struct.field(UInt64)
        mass!: UInt64
        @Struct.field(UInt32)
        energyusage!: UInt32
    }
    @Struct.type('ship_row')
    export class ship_row extends Struct {
        @Struct.field(UInt64)
        id!: UInt64
        @Struct.field(Name)
        owner!: Name
        @Struct.field('string')
        name!: string
        @Struct.field(coordinates)
        location!: coordinates
        @Struct.field(UInt8)
        skin!: UInt8
        @Struct.field(UInt8)
        tier!: UInt8
        @Struct.field(ship_state)
        state!: ship_state
        @Struct.field(ship_stats)
        stats!: ship_stats
        @Struct.field(loader_stats)
        loaders!: loader_stats
        @Struct.field(travel_plan, {optional: true})
        travelplan?: travel_plan
    }
    @Struct.type('state_row')
    export class state_row extends Struct {
        @Struct.field('bool')
        enabled!: boolean
        @Struct.field(UInt64)
        epoch!: UInt64
        @Struct.field(UInt64)
        salt!: UInt64
        @Struct.field(Checksum256)
        seed!: Checksum256
        @Struct.field(Checksum256)
        commit!: Checksum256
    }
    @Struct.type('travel')
    export class travel extends Struct {
        @Struct.field(UInt64)
        id!: UInt64
        @Struct.field(coordinates)
        destination!: coordinates
        @Struct.field('bool')
        recharge!: boolean
    }
    @Struct.type('travel_summary')
    export class travel_summary extends Struct {
        @Struct.field(ship_stats)
        stats!: ship_stats
        @Struct.field(loader_stats)
        loaders!: loader_stats
        @Struct.field(coordinates)
        origin!: coordinates
        @Struct.field(coordinates)
        destination!: coordinates
        @Struct.field(UInt64)
        distance!: UInt64
        @Struct.field(UInt64)
        totalmass!: UInt64
        @Struct.field(Float64)
        acceleration!: Float64
        @Struct.field(UInt32)
        flighttime!: UInt32
        @Struct.field(UInt32)
        energyusage!: UInt32
        @Struct.field(UInt32)
        rechargetime!: UInt32
        @Struct.field(UInt32)
        masspenalty!: UInt32
        @Struct.field(UInt64)
        loadtime!: UInt64
        @Struct.field(UInt64)
        time!: UInt64
    }
    @Struct.type('travelplan')
    export class travelplan extends Struct {
        @Struct.field(UInt64)
        id!: UInt64
        @Struct.field(coordinates)
        origin!: coordinates
        @Struct.field(coordinates)
        destination!: coordinates
        @Struct.field('bool')
        recharge!: boolean
    }
    @Struct.type('traveltime')
    export class traveltime extends Struct {
        @Struct.field(UInt64)
        id!: UInt64
        @Struct.field(coordinates)
        destination!: coordinates
    }
    @Struct.type('wipe')
    export class wipe extends Struct {}
    @Struct.type('wipesequence')
    export class wipesequence extends Struct {}
}
export const TableMap = {
    cargo: Types.cargo_row,
    player: Types.player_row,
    sequence: Types.sequence_row,
    ship: Types.ship_row,
    state: Types.state_row,
}
export interface TableTypes {
    cargo: Types.cargo_row
    player: Types.player_row
    sequence: Types.sequence_row
    ship: Types.ship_row
    state: Types.state_row
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {
        export interface coordinates {
            x: Int64Type
            y: Int64Type
        }
    }
    export interface advance {
        reveal: string
        commit: Checksum256Type
    }
    export interface arrive {
        id: UInt64Type
    }
    export interface buygoods {
        ship_id: UInt64Type
        good_id: UInt64Type
        quantity: UInt64Type
    }
    export interface buyship {
        account: NameType
        name: string
    }
    export interface cleartable {
        table_name: NameType
        scope?: NameType
        max_rows?: UInt64Type
    }
    export interface commit {
        commit: Checksum256Type
    }
    export interface enable {
        enabled: boolean
    }
    export interface hash {
        value: string
    }
    export interface hash512 {
        value: string
    }
    export interface init {
        seed: Checksum256Type
    }
    export interface join {
        account: NameType
    }
    export interface marketprice {
        location: Type.coordinates
        good_id: UInt16Type
    }
    export interface marketprices {
        location: Type.coordinates
    }
    export interface salt {
        salt: UInt64Type
    }
    export interface sellgoods {
        ship_id: UInt64Type
        good_id: UInt64Type
        quantity: UInt64Type
    }
    export interface travel {
        id: UInt64Type
        destination: Type.coordinates
        recharge: boolean
    }
    export interface travelplan {
        id: UInt64Type
        origin: Type.coordinates
        destination: Type.coordinates
        recharge: boolean
    }
    export interface traveltime {
        id: UInt64Type
        destination: Type.coordinates
    }
    export interface wipe {}
    export interface wipesequence {}
}
export interface ActionNameParams {
    advance: ActionParams.advance
    arrive: ActionParams.arrive
    buygoods: ActionParams.buygoods
    buyship: ActionParams.buyship
    cleartable: ActionParams.cleartable
    commit: ActionParams.commit
    enable: ActionParams.enable
    hash: ActionParams.hash
    hash512: ActionParams.hash512
    init: ActionParams.init
    join: ActionParams.join
    marketprice: ActionParams.marketprice
    marketprices: ActionParams.marketprices
    salt: ActionParams.salt
    sellgoods: ActionParams.sellgoods
    travel: ActionParams.travel
    travelplan: ActionParams.travelplan
    traveltime: ActionParams.traveltime
    wipe: ActionParams.wipe
    wipesequence: ActionParams.wipesequence
}
export type ActionNames = keyof ActionNameParams
export interface ActionReturnValues {
    hash: Checksum256
    hash512: Checksum512
    marketprice: Types.good_price
    marketprices: Types.good_price[]
    travelplan: Types.travel_plan
    traveltime: Types.travel_summary
}
export type ActionReturnNames = keyof ActionReturnValues
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('shipload.gm'),
        })
    }
    action<T extends ActionNames>(
        name: T,
        data: ActionNameParams[T],
        options?: ActionOptions
    ): Action {
        return super.action(name, data, options)
    }
    readonly<T extends ActionReturnNames>(
        name: T,
        data?: ActionNameParams[T]
    ): ActionReturnValues[T] {
        return super.readonly(name, data) as unknown as ActionReturnValues[T]
    }
    table<T extends TableNames>(name: T, scope?: NameType): Table<RowType<T>> {
        return super.table(name, scope, TableMap[name])
    }
}
