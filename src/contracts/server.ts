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
    'DmVvc2lvOjphYmkvMS4yACcHYWR2YW5jZQACBnJldmVhbAZzdHJpbmcGY29tbWl0C2NoZWNrc3VtMjU2BmFycml2ZQABAmlkBnVpbnQ2NAhidXlnb29kcwADB3NoaXBfaWQGdWludDY0B2dvb2RfaWQGdWludDY0CHF1YW50aXR5BnVpbnQ2NAdidXlzaGlwAAIHYWNjb3VudARuYW1lBG5hbWUGc3RyaW5nCWNhcmdvX3JvdwAGAmlkBnVpbnQ2NAdzaGlwX2lkBnVpbnQ2NAdnb29kX2lkBnVpbnQ2NARwYWlkBnVpbnQ2NAVvd25lZAZ1aW50MzIGbG9hZGVkBnVpbnQzMgpjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8GY29tbWl0AAEGY29tbWl0C2NoZWNrc3VtMjU2C2Nvb3JkaW5hdGVzAAIBeAVpbnQ2NAF5BWludDY0BmVuYWJsZQABB2VuYWJsZWQEYm9vbApnb29kX3ByaWNlAAMCaWQGdWludDE2BXByaWNlBnVpbnQ2NAZzdXBwbHkGdWludDY0BGhhc2gAAQV2YWx1ZQZzdHJpbmcHaGFzaDUxMgABBXZhbHVlBnN0cmluZwRpbml0AAEEc2VlZAtjaGVja3N1bTI1NghqZXR0aXNvbgADB3NoaXBfaWQGdWludDY0B2dvb2RfaWQGdWludDE2CHF1YW50aXR5BnVpbnQ2NARqb2luAAEHYWNjb3VudARuYW1lDGxvYWRlcl9zdGF0cwADBG1hc3MGdWludDMyCHF1YW50aXR5BnVpbnQxNgZ0aHJ1c3QGdWludDMyDGxvY2F0aW9uX3JvdwAFAmlkBnVpbnQ2NAtjb29yZGluYXRlcwtjb29yZGluYXRlcwVlcG9jaAZ1aW50NjQHZ29vZF9pZAZ1aW50MTYGc3VwcGx5BnVpbnQxNgttYXJrZXRwcmljZQACCGxvY2F0aW9uC2Nvb3JkaW5hdGVzB2dvb2RfaWQGdWludDE2DG1hcmtldHByaWNlcwABCGxvY2F0aW9uC2Nvb3JkaW5hdGVzB3BheWxvYW4AAgdhY2NvdW50BG5hbWUGYW1vdW50BnVpbnQ2NApwbGF5ZXJfcm93AAQFb3duZXIEbmFtZQdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQ2NAhuZXR3b3J0aAVpbnQ2NARzYWx0AAEEc2FsdAZ1aW50NjQJc2VsbGdvb2RzAAMHc2hpcF9pZAZ1aW50NjQHZ29vZF9pZAZ1aW50NjQIcXVhbnRpdHkGdWludDY0DHNlcXVlbmNlX3JvdwACA2tleQRuYW1lBXZhbHVlBnVpbnQ2NAhzaGlwX3JvdwAKAmlkBnVpbnQ2NAVvd25lcgRuYW1lBG5hbWUGc3RyaW5nCGxvY2F0aW9uC2Nvb3JkaW5hdGVzBHNraW4FdWludDgEdGllcgV1aW50OAVzdGF0ZQpzaGlwX3N0YXRlBXN0YXRzCnNoaXBfc3RhdHMHbG9hZGVycwxsb2FkZXJfc3RhdHMKdHJhdmVscGxhbgx0cmF2ZWxfcGxhbj8Kc2hpcF9zdGF0ZQABBmVuZXJneQZ1aW50MzIKc2hpcF9zdGF0cwAHCGNhcGFjaXR5BnVpbnQzMgVkcmFpbgZ1aW50MzIEbWFzcwZ1aW50NjQHbWF4bWFzcwZ1aW50NjQFb3JiaXQGdWludDE2CHJlY2hhcmdlBnVpbnQzMgZ0aHJ1c3QGdWludDY0CXN0YXRlX3JvdwAGB2VuYWJsZWQEYm9vbAVlcG9jaAZ1aW50NjQEc2FsdAZ1aW50NjQFc2hpcHMGdWludDMyBHNlZWQLY2hlY2tzdW0yNTYGY29tbWl0C2NoZWNrc3VtMjU2CHRha2Vsb2FuAAIHYWNjb3VudARuYW1lBmFtb3VudAZ1aW50NjQGdHJhdmVsAAMCaWQGdWludDY0C2Rlc3RpbmF0aW9uC2Nvb3JkaW5hdGVzCHJlY2hhcmdlBGJvb2wLdHJhdmVsX3BsYW4ACQlkZXBhcnR1cmUKdGltZV9wb2ludAtkZXN0aW5hdGlvbgtjb29yZGluYXRlcwhkaXN0YW5jZQZ1aW50NjQKZmxpZ2h0dGltZQZ1aW50MzIIbG9hZHRpbWUGdWludDMyDHJlY2hhcmdldGltZQZ1aW50MzILbWFzc3BlbmFsdHkGdWludDMyBG1hc3MGdWludDY0C2VuZXJneXVzYWdlBnVpbnQzMg50cmF2ZWxfc3VtbWFyeQANBXN0YXRzCnNoaXBfc3RhdHMHbG9hZGVycwxsb2FkZXJfc3RhdHMGb3JpZ2luC2Nvb3JkaW5hdGVzC2Rlc3RpbmF0aW9uC2Nvb3JkaW5hdGVzCGRpc3RhbmNlBnVpbnQ2NAl0b3RhbG1hc3MGdWludDY0DGFjY2VsZXJhdGlvbgdmbG9hdDY0CmZsaWdodHRpbWUGdWludDMyC2VuZXJneXVzYWdlBnVpbnQzMgxyZWNoYXJnZXRpbWUGdWludDMyC21hc3NwZW5hbHR5BnVpbnQzMghsb2FkdGltZQZ1aW50NjQEdGltZQZ1aW50NjQKdHJhdmVscGxhbgAEAmlkBnVpbnQ2NAZvcmlnaW4LY29vcmRpbmF0ZXMLZGVzdGluYXRpb24LY29vcmRpbmF0ZXMIcmVjaGFyZ2UEYm9vbAp0cmF2ZWx0aW1lAAICaWQGdWludDY0C2Rlc3RpbmF0aW9uC2Nvb3JkaW5hdGVzDHVwZGF0ZWNyZWRpdAACB2FjY291bnQEbmFtZQZhbW91bnQFaW50NjQKdXBkYXRlZGVidAACB2FjY291bnQEbmFtZQZhbW91bnQFaW50NjQLdXBncmFkZXNoaXAAAgdhY2NvdW50BG5hbWUCaWQGdWludDY0BHdpcGUAAAx3aXBlc2VxdWVuY2UAABoAAABAoWl2MgdhZHZhbmNl0wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYWR2YW5jZQpzdW1tYXJ5OiAnQWR2YW5jZSB0dXJuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZHZhbmNlIHRoZSBnYW1lIHRvIHRoZSBuZXh0IHR1cm4uAAAAAKjt7jUGYXJyaXZlswItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYXJyaXZlCnN1bW1hcnk6ICdDb21wbGV0ZSB0cmF2ZWwnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNvbXBsZXRlIHRoZSB0cmF2ZWwgb2YgYSBzaGlwIGJ5IHVwZGF0aW5nIGl0cyBsb2NhdGlvbiB0byB0aGUgZGVzdGluYXRpb24gY29vcmRpbmF0ZXMgYWZ0ZXIgdGhlIHRyYXZlbCBkdXJhdGlvbiBoYXMgcGFzc2VkLgoKLS0tAAAAOFHKvD4IYnV5Z29vZHPdAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXlnb29kcwpzdW1tYXJ5OiAnQnV5IGdvb2RzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBnb29kcyBhbmQgYWRkIHRoZW0gdG8gYSBzaGlwJ3MgY2FyZ28uAAAAoLqGvT4HYnV5c2hpcMYBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eXNoaXAKc3VtbWFyeTogJ0J1eSBhIG5ldyBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyBzaGlwAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAABkJyVFBmNvbW1pdPEBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNvbW1pdApzdW1tYXJ5OiAnU2V0IGNvbW1pdCB2YWx1ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2V0IHRoZSBpbml0aWFsIGNvbW1pdCB2YWx1ZSBkdXJpbmcgZ2FtZSBpbml0aWFsaXphdGlvbi4KCi0tLQAAAACoeMxUBmVuYWJsZeIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnU2V0IGVuYWJsZWQgc3RhdGUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoaXMgZ2FtZSBvZiBTaGlwbG9hZC4KCi0tLQAAAAAA0LBpBGhhc2j9AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBoYXNoCnN1bW1hcnk6ICdDYWxjdWxhdGUgc2hhMjU2IGhhc2gnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbGN1bGF0ZXMgdGhlIHNoYTI1NiBoYXNoIG9mIGEgc3RyaW5nIGJhc2VkIHVzaW5nIHRoZSBnYW1lIHNlZWQuCgotLS0AAABAhNKwaQdoYXNoNTEy+wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaGFzaDUxMgpzdW1tYXJ5OiAnQ2FsY3VsYXRlIHNoYTUxMiBoYXNoJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGVzIHRoZSBzaGE1MTIgaGFzaCBvZiBhIHN0cmluZyBiYXNlZCB1c2luZyB0aGUgZ2FtZSBzZWVkLgAAAAAAkN10BGluaXT6AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBpbml0CnN1bW1hcnk6ICdJbml0aWFsaXplIGdhbWUgc2VlZCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW5pdGlhbGl6ZSBhIHRoZSBnYW1lcyBzZWVkIGFuZCBzZWVkIHZhbHVlcyB0byBib290c3RyYXAgZ2FtZSBzdGF0ZS4AAACTYpezeghqZXR0aXNvbvkBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGpldHRpc29uCnN1bW1hcnk6ICdKZXR0aXNvbiBDYXJnbyBmcm9tIFNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkpldHRpc29uIGNhcmdvIGZyb20gdGhlIGEgc2hpcCBhbmQgcmVjYWxjdWxhdGUgdHJhdmVsIHRpbWUuAAAAAAAwHX0Eam9pbskBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGpvaW4Kc3VtbWFyeTogJ0pvaW4gYSBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpKb2luIGEgZ2FtZSBvZiBTaGlwbG9hZAoKLS0tABRyt2YFr5ELbWFya2V0cHJpY2WbAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBtYXJrZXRwcmljZQpzdW1tYXJ5OiAnR2V0IHByaWNlIG9mIGdvb2QgYXQgbG9jYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIGRldGVybWluZXMgdGhlIG1hcmtldCBwcmljZSBvZiBhIHNwZWNpZmllZCBnb29kIGF0IGEgZ2l2ZW4gbG9jYXRpb24uCgotLS2AFXK3ZgWvkQxtYXJrZXRwcmljZXOVAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBtYXJrZXRwcmljZXMKc3VtbWFyeTogJ0dldCBwcmljZSBvZiBhbGwgZ29vZHMgYXQgbG9jYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIGRldGVybWluZXMgdGhlIG1hcmtldCBwcmljZSBvZiBhbGwgZ29vZHMgYXQgYSBnaXZlbiBsb2NhdGlvbi4AAABgGhq9qQdwYXlsb2Fu3gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcGF5bG9hbgpzdW1tYXJ5OiAnTG9hbiBQYXltZW50JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpNYWtlIGEgcGF5bWVudCBvbiBhbiBvdXRzdGFuZGluZyBjcmVkaXQgbG9hbi4AAAAAAJCjwQRzYWx03QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2FsdApzdW1tYXJ5OiAnQXBwZW5kIFNhbHQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkZCBhZGRpdGlvbmFsIHNhbHQgdG8gdGhlIG5leHQgZXBvY2ggc2VlZC4KCi0tLQAAwIlSFqPCCXNlbGxnb29kc9UBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNlbGxnb29kcwpzdW1tYXJ5OiAnU2VsbCBnb29kcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2VsbCBnb29kcyBmcm9tIGEgc2hpcCdzIGNhcmdvLgoKLS0tAAAA09CooMkIdGFrZWxvYW7qAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0YWtlbG9hbgpzdW1tYXJ5OiAnQ3JlZGl0IExvYW4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkJvcnJvdyBjcmVkaXRzIGZyb20gdGhlIGJhbmsgdGhhdCB3aWxsIG5lZWQgdG8gYmUgcmVwYWlkLgAAAABEtc3NBnRyYXZlbMgCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHRyYXZlbApzdW1tYXJ5OiAnTW92ZSBhIHNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYXRlIHRyYXZlbCBvZiBhIHNoaXAgZnJvbSBpdHMgY3VycmVudCBsb2NhdGlvbiB0byBhIG5ldyBkZXN0aW5hdGlvbi4KCi0tLQoKVGhpcyBhY3Rpb24gZGV0ZXJtaW5lcyB0aGUgbWFya2V0IHByaWNlIG9mIGFsbCBnb29kcyBhdCBhIGdpdmVuIGxvY2F0aW9uLgDANLFGtc3NCnRyYXZlbHBsYW6OAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWxwbGFuCnN1bW1hcnk6ICdFc3RpbWF0ZSBhIHRyYXZlbCBwbGFuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGUgd2hhdCB0aGUgdHJhdmVsIHBsYW4gaXMgZm9yIGEgc2hpcCB0cmF2ZWxpbmcgdG8gYSBnaXZlbiBsb2NhdGlvbi4KCi0tLQCAki5Htc3NCnRyYXZlbHRpbWWMAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWx0aW1lCnN1bW1hcnk6ICdFc3RpbWF0ZSBUcmF2ZWwgVGltZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRXN0aW1hdGUgdGhlIGR1cmF0aW9uIG9mIGEgc2hpcCB0cmF2ZWxpbmcgd2l0aG91dCBjb21taXR0aW5nIHRvIHRoZSBhY3Rpb24uCgotLS2QXVIXqWxS1Qx1cGRhdGVjcmVkaXTCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1cGRhdGVjcmVkaXQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVjcmVkaXQgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAEA+KqlsUtUKdXBkYXRlZGVidL4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVwZGF0ZWRlYnQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVkZWJ0IGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQCqa1glc1nVC3VwZ3JhZGVzaGlw1wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdXBncmFkZXNoaXAKc3VtbWFyeTogJ1VwZ3JhZGUgYSBTaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpVcGdyYWRlIGEgc2hpcCB0byB0aGUgbmV4dCB0aWVyLgAAAAAAoKrjBHdpcGWyAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlCnN1bW1hcnk6ICdERUJVRzogd2lwZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS2g0FTaKqyq4wx3aXBlc2VxdWVuY2XCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlc2VxdWVuY2UKc3VtbWFyeTogJ0RFQlVHOiB3aXBlc2VxdWVuY2UgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tBgAAAAAAyq5BA2k2NAAACWNhcmdvX3JvdwAAAJO6bBCNA2k2NAAADGxvY2F0aW9uX3JvdwAAAABc5U2sA2k2NAAACnBsYXllcl9yb3cAAAAKTaWtwgNpNjQAAAxzZXF1ZW5jZV9yb3cAAAAAAFBdwwNpNjQAAAhzaGlwX3JvdwAAAAAAlU3GA2k2NAAACXN0YXRlX3JvdwERU2hpcGxvYWQgKFNlcnZlcikRU2hpcGxvYWQgKFNlcnZlcikAAAAGAAAAAADQsGkLY2hlY2tzdW0yNTYAAABAhNKwaQtjaGVja3N1bTUxMgAUcrdmBa+RCmdvb2RfcHJpY2WAFXK3ZgWvkQxnb29kX3ByaWNlW10AwDSxRrXNzQt0cmF2ZWxfcGxhbgCAki5Htc3NDnRyYXZlbF9zdW1tYXJ5'
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
        @Struct.field(UInt64)
        supply!: UInt64
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
    @Struct.type('jettison')
    export class jettison extends Struct {
        @Struct.field(UInt64)
        ship_id!: UInt64
        @Struct.field(UInt16)
        good_id!: UInt16
        @Struct.field(UInt64)
        quantity!: UInt64
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
    @Struct.type('location_row')
    export class location_row extends Struct {
        @Struct.field(UInt64)
        id!: UInt64
        @Struct.field(coordinates)
        coordinates!: coordinates
        @Struct.field(UInt64)
        epoch!: UInt64
        @Struct.field(UInt16)
        good_id!: UInt16
        @Struct.field(UInt16)
        supply!: UInt16
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
    @Struct.type('payloan')
    export class payloan extends Struct {
        @Struct.field(Name)
        account!: Name
        @Struct.field(UInt64)
        amount!: UInt64
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
        @Struct.field(UInt32)
        ships!: UInt32
        @Struct.field(Checksum256)
        seed!: Checksum256
        @Struct.field(Checksum256)
        commit!: Checksum256
    }
    @Struct.type('takeloan')
    export class takeloan extends Struct {
        @Struct.field(Name)
        account!: Name
        @Struct.field(UInt64)
        amount!: UInt64
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
    @Struct.type('updatecredit')
    export class updatecredit extends Struct {
        @Struct.field(Name)
        account!: Name
        @Struct.field(Int64)
        amount!: Int64
    }
    @Struct.type('updatedebt')
    export class updatedebt extends Struct {
        @Struct.field(Name)
        account!: Name
        @Struct.field(Int64)
        amount!: Int64
    }
    @Struct.type('upgradeship')
    export class upgradeship extends Struct {
        @Struct.field(Name)
        account!: Name
        @Struct.field(UInt64)
        id!: UInt64
    }
    @Struct.type('wipe')
    export class wipe extends Struct {}
    @Struct.type('wipesequence')
    export class wipesequence extends Struct {}
}
export const TableMap = {
    cargo: Types.cargo_row,
    location: Types.location_row,
    player: Types.player_row,
    sequence: Types.sequence_row,
    ship: Types.ship_row,
    state: Types.state_row,
}
export interface TableTypes {
    cargo: Types.cargo_row
    location: Types.location_row
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
    export interface jettison {
        ship_id: UInt64Type
        good_id: UInt16Type
        quantity: UInt64Type
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
    export interface payloan {
        account: NameType
        amount: UInt64Type
    }
    export interface salt {
        salt: UInt64Type
    }
    export interface sellgoods {
        ship_id: UInt64Type
        good_id: UInt64Type
        quantity: UInt64Type
    }
    export interface takeloan {
        account: NameType
        amount: UInt64Type
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
    export interface updatecredit {
        account: NameType
        amount: Int64Type
    }
    export interface updatedebt {
        account: NameType
        amount: Int64Type
    }
    export interface upgradeship {
        account: NameType
        id: UInt64Type
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
    jettison: ActionParams.jettison
    join: ActionParams.join
    marketprice: ActionParams.marketprice
    marketprices: ActionParams.marketprices
    payloan: ActionParams.payloan
    salt: ActionParams.salt
    sellgoods: ActionParams.sellgoods
    takeloan: ActionParams.takeloan
    travel: ActionParams.travel
    travelplan: ActionParams.travelplan
    traveltime: ActionParams.traveltime
    updatecredit: ActionParams.updatecredit
    updatedebt: ActionParams.updatedebt
    upgradeship: ActionParams.upgradeship
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
