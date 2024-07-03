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
    'DmVvc2lvOjphYmkvMS4yAB8HYWR2YW5jZQACBnJldmVhbAZzdHJpbmcGY29tbWl0C2NoZWNrc3VtMjU2BmFycml2ZQABAmlkBnVpbnQ2NAhidXlnb29kcwADB3NoaXBfaWQGdWludDY0B2dvb2RfaWQGdWludDY0CHF1YW50aXR5BnVpbnQ2NAdidXlzaGlwAAIHYWNjb3VudARuYW1lBG5hbWUGc3RyaW5nCWNhcmdvX3JvdwAGAmlkBnVpbnQ2NAdzaGlwX2lkBnVpbnQ2NAdnb29kX2lkBnVpbnQ2NARwYWlkBnVpbnQ2NAhxdWFudGl0eQZ1aW50MzIGbG9hZGVkBnVpbnQzMgpjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8GY29tbWl0AAEGY29tbWl0C2NoZWNrc3VtMjU2C2Nvb3JkaW5hdGVzAAIBeAVpbnQ2NAF5BWludDY0BmVuYWJsZQABB2VuYWJsZWQEYm9vbApnb29kX3ByaWNlAAICaWQGdWludDE2BXByaWNlBnVpbnQ2NARoYXNoAAEFdmFsdWUGc3RyaW5nB2hhc2g1MTIAAQV2YWx1ZQZzdHJpbmcEaW5pdAABBHNlZWQLY2hlY2tzdW0yNTYEam9pbgABB2FjY291bnQEbmFtZQxsb2FkZXJfc3RhdHMAAwRtYXNzBnVpbnQzMghxdWFudGl0eQZ1aW50MTYGdGhydXN0BnVpbnQzMgttYXJrZXRwcmljZQACCGxvY2F0aW9uC2Nvb3JkaW5hdGVzB2dvb2RfaWQGdWludDE2DG1hcmtldHByaWNlcwABCGxvY2F0aW9uC2Nvb3JkaW5hdGVzCnBsYXllcl9yb3cABAVvd25lcgRuYW1lB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDY0CG5ldHdvcnRoBWludDY0BHNhbHQAAQRzYWx0BnVpbnQ2NAlzZWxsZ29vZHMAAwdzaGlwX2lkBnVpbnQ2NAdnb29kX2lkBnVpbnQ2NAhxdWFudGl0eQZ1aW50NjQMc2VxdWVuY2Vfcm93AAIDa2V5BG5hbWUFdmFsdWUGdWludDY0CHNoaXBfcm93AAoCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcIbG9jYXRpb24LY29vcmRpbmF0ZXMEc2tpbgV1aW50OAR0aWVyBXVpbnQ4BXN0YXRlCnNoaXBfc3RhdGUFc3RhdHMKc2hpcF9zdGF0cwdsb2FkZXJzDGxvYWRlcl9zdGF0cwp0cmF2ZWxwbGFuDHRyYXZlbF9wbGFuPwpzaGlwX3N0YXRlAAEGZW5lcmd5BnVpbnQzMgpzaGlwX3N0YXRzAAYIY2FwYWNpdHkGdWludDMyBWRyYWluBnVpbnQzMgRtYXNzBnVpbnQ2NAVvcmJpdAZ1aW50MTYIcmVjaGFyZ2UGdWludDMyBnRocnVzdAZ1aW50NjQJc3RhdGVfcm93AAUHZW5hYmxlZARib29sBWVwb2NoBnVpbnQ2NARzYWx0BnVpbnQ2NARzZWVkC2NoZWNrc3VtMjU2BmNvbW1pdAtjaGVja3N1bTI1NgZ0cmF2ZWwAAwJpZAZ1aW50NjQLZGVzdGluYXRpb24LY29vcmRpbmF0ZXMIcmVjaGFyZ2UEYm9vbAt0cmF2ZWxfcGxhbgAICWRlcGFydHVyZQp0aW1lX3BvaW50C2Rlc3RpbmF0aW9uC2Nvb3JkaW5hdGVzCGRpc3RhbmNlBnVpbnQ2NApmbGlnaHR0aW1lBnVpbnQzMghsb2FkdGltZQZ1aW50MzIMcmVjaGFyZ2V0aW1lBnVpbnQzMgRtYXNzBnVpbnQ2NAtlbmVyZ3l1c2FnZQZ1aW50MzIOdHJhdmVsX3N1bW1hcnkADAVzdGF0cwpzaGlwX3N0YXRzB2xvYWRlcnMMbG9hZGVyX3N0YXRzBm9yaWdpbgtjb29yZGluYXRlcwtkZXN0aW5hdGlvbgtjb29yZGluYXRlcwhkaXN0YW5jZQZ1aW50NjQJdG90YWxtYXNzBnVpbnQ2NAxhY2NlbGVyYXRpb24HZmxvYXQ2NApmbGlnaHR0aW1lBnVpbnQzMgtlbmVyZ3l1c2FnZQZ1aW50MzIMcmVjaGFyZ2V0aW1lBnVpbnQzMghsb2FkdGltZQZ1aW50NjQEdGltZQZ1aW50NjQKdHJhdmVscGxhbgAEAmlkBnVpbnQ2NAZvcmlnaW4LY29vcmRpbmF0ZXMLZGVzdGluYXRpb24LY29vcmRpbmF0ZXMIcmVjaGFyZ2UEYm9vbAp0cmF2ZWx0aW1lAAICaWQGdWludDY0C2Rlc3RpbmF0aW9uC2Nvb3JkaW5hdGVzBHdpcGUAABMAAABAoWl2MgdhZHZhbmNl0wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYWR2YW5jZQpzdW1tYXJ5OiAnQWR2YW5jZSB0dXJuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZHZhbmNlIHRoZSBnYW1lIHRvIHRoZSBuZXh0IHR1cm4uAAAAAKjt7jUGYXJyaXZlswItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYXJyaXZlCnN1bW1hcnk6ICdDb21wbGV0ZSB0cmF2ZWwnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNvbXBsZXRlIHRoZSB0cmF2ZWwgb2YgYSBzaGlwIGJ5IHVwZGF0aW5nIGl0cyBsb2NhdGlvbiB0byB0aGUgZGVzdGluYXRpb24gY29vcmRpbmF0ZXMgYWZ0ZXIgdGhlIHRyYXZlbCBkdXJhdGlvbiBoYXMgcGFzc2VkLgoKLS0tAAAAOFHKvD4IYnV5Z29vZHPdAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXlnb29kcwpzdW1tYXJ5OiAnQnV5IGdvb2RzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBnb29kcyBhbmQgYWRkIHRoZW0gdG8gYSBzaGlwJ3MgY2FyZ28uAAAAoLqGvT4HYnV5c2hpcMYBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eXNoaXAKc3VtbWFyeTogJ0J1eSBhIG5ldyBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyBzaGlwAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAABkJyVFBmNvbW1pdPEBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNvbW1pdApzdW1tYXJ5OiAnU2V0IGNvbW1pdCB2YWx1ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2V0IHRoZSBpbml0aWFsIGNvbW1pdCB2YWx1ZSBkdXJpbmcgZ2FtZSBpbml0aWFsaXphdGlvbi4KCi0tLQAAAACoeMxUBmVuYWJsZeIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnU2V0IGVuYWJsZWQgc3RhdGUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoaXMgZ2FtZSBvZiBTaGlwbG9hZC4KCi0tLQAAAAAA0LBpBGhhc2j9AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBoYXNoCnN1bW1hcnk6ICdDYWxjdWxhdGUgc2hhMjU2IGhhc2gnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbGN1bGF0ZXMgdGhlIHNoYTI1NiBoYXNoIG9mIGEgc3RyaW5nIGJhc2VkIHVzaW5nIHRoZSBnYW1lIHNlZWQuCgotLS0AAABAhNKwaQdoYXNoNTEy+wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaGFzaDUxMgpzdW1tYXJ5OiAnQ2FsY3VsYXRlIHNoYTUxMiBoYXNoJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGVzIHRoZSBzaGE1MTIgaGFzaCBvZiBhIHN0cmluZyBiYXNlZCB1c2luZyB0aGUgZ2FtZSBzZWVkLgAAAAAAkN10BGluaXT6AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBpbml0CnN1bW1hcnk6ICdJbml0aWFsaXplIGdhbWUgc2VlZCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW5pdGlhbGl6ZSBhIHRoZSBnYW1lcyBzZWVkIGFuZCBzZWVkIHZhbHVlcyB0byBib290c3RyYXAgZ2FtZSBzdGF0ZS4AAAAAADAdfQRqb2luyQEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogam9pbgpzdW1tYXJ5OiAnSm9pbiBhIGdhbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkpvaW4gYSBnYW1lIG9mIFNoaXBsb2FkCgotLS0AFHK3ZgWvkQttYXJrZXRwcmljZZsCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IG1hcmtldHByaWNlCnN1bW1hcnk6ICdHZXQgcHJpY2Ugb2YgZ29vZCBhdCBsb2NhdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gZGV0ZXJtaW5lcyB0aGUgbWFya2V0IHByaWNlIG9mIGEgc3BlY2lmaWVkIGdvb2QgYXQgYSBnaXZlbiBsb2NhdGlvbi4KCi0tLYAVcrdmBa+RDG1hcmtldHByaWNlc5UCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IG1hcmtldHByaWNlcwpzdW1tYXJ5OiAnR2V0IHByaWNlIG9mIGFsbCBnb29kcyBhdCBsb2NhdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gZGV0ZXJtaW5lcyB0aGUgbWFya2V0IHByaWNlIG9mIGFsbCBnb29kcyBhdCBhIGdpdmVuIGxvY2F0aW9uLgAAAAAAkKPBBHNhbHTdAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzYWx0CnN1bW1hcnk6ICdBcHBlbmQgU2FsdCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQWRkIGFkZGl0aW9uYWwgc2FsdCB0byB0aGUgbmV4dCBlcG9jaCBzZWVkLgoKLS0tAADAiVIWo8IJc2VsbGdvb2Rz1QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2VsbGdvb2RzCnN1bW1hcnk6ICdTZWxsIGdvb2RzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTZWxsIGdvb2RzIGZyb20gYSBzaGlwJ3MgY2FyZ28uCgotLS0AAAAARLXNzQZ0cmF2ZWzIAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWwKc3VtbWFyeTogJ01vdmUgYSBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWF0ZSB0cmF2ZWwgb2YgYSBzaGlwIGZyb20gaXRzIGN1cnJlbnQgbG9jYXRpb24gdG8gYSBuZXcgZGVzdGluYXRpb24uCgotLS0KClRoaXMgYWN0aW9uIGRldGVybWluZXMgdGhlIG1hcmtldCBwcmljZSBvZiBhbGwgZ29vZHMgYXQgYSBnaXZlbiBsb2NhdGlvbi4AwDSxRrXNzQp0cmF2ZWxwbGFujgItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdHJhdmVscGxhbgpzdW1tYXJ5OiAnRXN0aW1hdGUgYSB0cmF2ZWwgcGxhbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlIHdoYXQgdGhlIHRyYXZlbCBwbGFuIGlzIGZvciBhIHNoaXAgdHJhdmVsaW5nIHRvIGEgZ2l2ZW4gbG9jYXRpb24uCgotLS0AgJIuR7XNzQp0cmF2ZWx0aW1ljAItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdHJhdmVsdGltZQpzdW1tYXJ5OiAnRXN0aW1hdGUgVHJhdmVsIFRpbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkVzdGltYXRlIHRoZSBkdXJhdGlvbiBvZiBhIHNoaXAgdHJhdmVsaW5nIHdpdGhvdXQgY29tbWl0dGluZyB0byB0aGUgYWN0aW9uLgoKLS0tAAAAAACgquMEd2lwZbIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGUKc3VtbWFyeTogJ0RFQlVHOiB3aXBlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQUAAAAAAMquQQNpNjQAAAljYXJnb19yb3cAAAAAXOVNrANpNjQAAApwbGF5ZXJfcm93AAAACk2lrcIDaTY0AAAMc2VxdWVuY2Vfcm93AAAAAABQXcMDaTY0AAAIc2hpcF9yb3cAAAAAAJVNxgNpNjQAAAlzdGF0ZV9yb3cBEVNoaXBsb2FkIChTZXJ2ZXIpEVNoaXBsb2FkIChTZXJ2ZXIpAAAABgAAAAAA0LBpC2NoZWNrc3VtMjU2AAAAQITSsGkLY2hlY2tzdW01MTIAFHK3ZgWvkQpnb29kX3ByaWNlgBVyt2YFr5EMZ29vZF9wcmljZVtdAMA0sUa1zc0LdHJhdmVsX3BsYW4AgJIuR7XNzQ50cmF2ZWxfc3VtbWFyeQ=='
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
        quantity!: UInt32
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
