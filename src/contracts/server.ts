import type {
    Action,
    Checksum256Type,
    Int64Type,
    NameType,
    TimePointType,
    UInt16Type,
    UInt32Type,
    UInt64Type,
    UInt8Type,
} from '@wharfkit/antelope'
import {
    ABI,
    Blob,
    Checksum256,
    Checksum512,
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
    'DmVvc2lvOjphYmkvMS4yAEEHYWR2YW5jZQACBnJldmVhbAZzdHJpbmcGY29tbWl0C2NoZWNrc3VtMjU2CGJ1eWdvb2RzAAMHc2hpcF9pZAZ1aW50NjQHZ29vZF9pZAZ1aW50MTYIcXVhbnRpdHkGdWludDMyB2J1eXNoaXAAAgdhY2NvdW50BG5hbWUEbmFtZQZzdHJpbmcMYnV5d2FyZWhvdXNlAAMHYWNjb3VudARuYW1lB3NoaXBfaWQGdWludDY0BG5hbWUGc3RyaW5nBmNhbmNlbAADC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0BWNvdW50BnVpbnQ2NApjYW5jZWxfbG9nAAYFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQKdGFza19pbmRleAV1aW50OAR0YXNrBHRhc2sKc3RhcnRlZF9hdAp0aW1lX3BvaW50DmNhbmNlbF9yZXN1bHRzAAQJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lD2NhbmNlbGxlZF9jb3VudAV1aW50OBBzY2hlZHVsZV9zdGFydGVkC3RpbWVfcG9pbnQ/CmNhcmdvX2l0ZW0AAwdnb29kX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIJdW5pdF9jb3N0BnVpbnQ2NAljYXJnb19yb3cABQJpZAZ1aW50NjQJZW50aXR5X2lkBnVpbnQ2NAdnb29kX2lkBnVpbnQ2NAhxdWFudGl0eQZ1aW50NjQJdW5pdF9jb3N0BnVpbnQ2NApjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8GY29tbWl0AAEGY29tbWl0C2NoZWNrc3VtMjU2C2Nvb3JkaW5hdGVzAAMBeAVpbnQ2NAF5BWludDY0AXoHdWludDE2PwZlbmFibGUAAQdlbmFibGVkBGJvb2wMZW5lcmd5X3N0YXRzAAIIY2FwYWNpdHkGdWludDE2CHJlY2hhcmdlBnVpbnQxNgtlbnRpdHlfaW5mbwAUBHR5cGUEbmFtZQJpZAZ1aW50NjQFb3duZXIEbmFtZQtlbnRpdHlfbmFtZQZzdHJpbmcIbG9jYXRpb24LY29vcmRpbmF0ZXMJY2FyZ29tYXNzBnVpbnQzMgVjYXJnbwxjYXJnb19pdGVtW10HbG9hZGVycw1sb2FkZXJfc3RhdHM/BmVuZXJneQd1aW50MTY/BG1hc3MHdWludDMyPwdlbmdpbmVzD21vdmVtZW50X3N0YXRzPwlnZW5lcmF0b3INZW5lcmd5X3N0YXRzPwhjYXBhY2l0eQd1aW50MzI/B2lzX2lkbGUEYm9vbAxjdXJyZW50X3Rhc2sFdGFzaz8UY3VycmVudF90YXNrX2VsYXBzZWQGdWludDMyFmN1cnJlbnRfdGFza19yZW1haW5pbmcGdWludDMyDXBlbmRpbmdfdGFza3MGdGFza1tdB2lkbGVfYXQLdGltZV9wb2ludD8Ic2NoZWR1bGUJc2NoZWR1bGU/DGVudGl0eV9zdGF0ZQACCGxvY2F0aW9uC2Nvb3JkaW5hdGVzBmVuZXJneQZ1aW50MTYOZW50aXR5X3N1bW1hcnkACAR0eXBlBG5hbWUCaWQGdWludDY0BW93bmVyBG5hbWULZW50aXR5X25hbWUGc3RyaW5nCGxvY2F0aW9uC2Nvb3JkaW5hdGVzB2lzX2lkbGUEYm9vbA5yZXNvbHZlZF9jb3VudAZ1aW50MzINcGVuZGluZ19jb3VudAZ1aW50MzIQZW50aXR5X3Rhc2tfaW5mbwAECWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQp0YXNrX2NvdW50BXVpbnQ4EHNjaGVkdWxlX3N0YXJ0ZWQKdGltZV9wb2ludAtnZXRlbnRpdGllcwACBW93bmVyBG5hbWULZW50aXR5X3R5cGUFbmFtZT8JZ2V0ZW50aXR5AAILZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0CGdldGdvb2RzAAALZ2V0bG9jYXRpb24AAgF4BWludDY0AXkFaW50NjQJZ2V0bmVhcmJ5AAMLZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0CHJlY2hhcmdlBGJvb2wJZ2V0cGxheWVyAAEHYWNjb3VudARuYW1lDGdldHN1bW1hcmllcwACBW93bmVyBG5hbWULZW50aXR5X3R5cGUFbmFtZT8EZ29vZAADAmlkBnVpbnQxNgpiYXNlX3ByaWNlBnVpbnQzMgRtYXNzBnVpbnQzMgpnb29kc19pbmZvAAEFZ29vZHMGZ29vZFtdBGhhc2gAAQV2YWx1ZQZzdHJpbmcHaGFzaDUxMgABBXZhbHVlBnN0cmluZwRpbml0AAEEc2VlZAtjaGVja3N1bTI1NgRqb2luAAEHYWNjb3VudARuYW1lDGxvYWRlcl9zdGF0cwADBG1hc3MGdWludDMyBnRocnVzdAZ1aW50MTYIcXVhbnRpdHkFdWludDgNbG9jYXRpb25fZ29vZAAFAmlkBnVpbnQxNgVwcmljZQZ1aW50MzIGc3VwcGx5BnVpbnQxNhFyYXJpdHlfbXVsdGlwbGllcgZ1aW50MzITbG9jYXRpb25fbXVsdGlwbGllcgZ1aW50MzINbG9jYXRpb25faW5mbwADBmNvb3Jkcwtjb29yZGluYXRlcwlpc19zeXN0ZW0EYm9vbAVnb29kcw9sb2NhdGlvbl9nb29kW10MbG9jYXRpb25fcm93AAUCaWQGdWludDY0C2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzBWVwb2NoBnVpbnQ2NAdnb29kX2lkBnVpbnQxNgZzdXBwbHkGdWludDE2CWxvZ2NhbmNlbAABA2xvZwpjYW5jZWxfbG9nCmxvZ3Jlc29sdmUAAQNsb2cLcmVzb2x2ZV9sb2cObW92ZW1lbnRfc3RhdHMAAgZ0aHJ1c3QGdWludDMyBWRyYWluBnVpbnQxNgtuZWFyYnlfaW5mbwAFCmNhbl90cmF2ZWwEYm9vbAdjdXJyZW50DGVudGl0eV9zdGF0ZQlwcm9qZWN0ZWQMZW50aXR5X3N0YXRlCm1heF9lbmVyZ3kGdWludDE2B3N5c3RlbXMPbmVhcmJ5X3N5c3RlbVtdDW5lYXJieV9zeXN0ZW0ABAhkaXN0YW5jZQZ1aW50NjQLZW5lcmd5X2Nvc3QGdWludDY0C2ZsaWdodF90aW1lBnVpbnQzMghsb2NhdGlvbg1sb2NhdGlvbl9pbmZvB3BheWxvYW4AAgdhY2NvdW50BG5hbWUGYW1vdW50BnVpbnQ2NAtwbGF5ZXJfaW5mbwALBW93bmVyBG5hbWUJaXNfcGxheWVyBGJvb2wMY29tcGFueV9uYW1lBnN0cmluZwdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQzMghuZXR3b3J0aAVpbnQ2NA5hdmFpbGFibGVfbG9hbgZ1aW50NjQPbmV4dF9zaGlwX3ByaWNlBnVpbnQ2NBRuZXh0X3dhcmVob3VzZV9wcmljZQZ1aW50NjQKc2hpcF9jb3VudAZ1aW50NjQPd2FyZWhvdXNlX2NvdW50BnVpbnQ2NApwbGF5ZXJfcm93AAQFb3duZXIEbmFtZQdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQzMghuZXR3b3J0aAVpbnQ2NAtwdXJnZXN1cHBseQABCG1heF9yb3dzB3VpbnQ2ND8IcmVjaGFyZ2UAAgtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAdyZXNvbHZlAAILZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQLcmVzb2x2ZV9sb2cADQVvd25lcgRuYW1lC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAp0YXNrX2luZGV4BXVpbnQ4BHRhc2sEdGFzawpzdGFydGVkX2F0CnRpbWVfcG9pbnQMY29tcGxldGVkX2F0CnRpbWVfcG9pbnQKbmV3X2VuZXJneQd1aW50MTY/DG5ld19sb2NhdGlvbgxjb29yZGluYXRlcz8PY2FyZ29tYXNzX2RlbHRhBWludDY0C2NhcmdvX2FkZGVkDGNhcmdvX2l0ZW1bXQ1jYXJnb19yZW1vdmVkDGNhcmdvX2l0ZW1bXQdjcmVkaXRzBmludDY0Pw9yZXNvbHZlX3Jlc3VsdHMABAllbnRpdHlfaWQGdWludDY0C2VudGl0eV90eXBlBG5hbWUOcmVzb2x2ZWRfY291bnQFdWludDgUbmV3X3NjaGVkdWxlX3N0YXJ0ZWQLdGltZV9wb2ludD8Ec2FsdAABBHNhbHQGdWludDY0CHNjaGVkdWxlAAIHc3RhcnRlZAp0aW1lX3BvaW50BXRhc2tzBnRhc2tbXQlzZWxsZ29vZHMAAwdzaGlwX2lkBnVpbnQ2NAdnb29kX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIMc2VxdWVuY2Vfcm93AAIDa2V5BG5hbWUFdmFsdWUGdWludDY0CHNoaXBfcm93AAsCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcIbG9jYXRpb24LY29vcmRpbmF0ZXMEbWFzcwZ1aW50MzIIY2FwYWNpdHkGdWludDMyBmVuZXJneQZ1aW50MTYHZW5naW5lcw5tb3ZlbWVudF9zdGF0cwlnZW5lcmF0b3IMZW5lcmd5X3N0YXRzB2xvYWRlcnMMbG9hZGVyX3N0YXRzCHNjaGVkdWxlCXNjaGVkdWxlPwlzdGF0ZV9yb3cABgdlbmFibGVkBGJvb2wFZXBvY2gGdWludDMyBHNhbHQGdWludDY0BXNoaXBzBnVpbnQzMgRzZWVkC2NoZWNrc3VtMjU2BmNvbW1pdAtjaGVja3N1bTI1Ngh0YWtlbG9hbgACB2FjY291bnQEbmFtZQZhbW91bnQGdWludDY0BHRhc2sABwR0eXBlBXVpbnQ4CGR1cmF0aW9uBnVpbnQzMgpjYW5jZWxhYmxlBXVpbnQ4CGxvY2F0aW9uDGNvb3JkaW5hdGVzPwVjYXJnbwxjYXJnb19pdGVtW10GZW50aXR5B3VpbnQ2ND8HY3JlZGl0cwZpbnQ2ND8MdGFza19yZXN1bHRzAAEIZW50aXRpZXMSZW50aXR5X3Rhc2tfaW5mb1tdCHRyYW5zZmVyAAYLc291cmNlX3R5cGUEbmFtZQlzb3VyY2VfaWQGdWludDY0CWRlc3RfdHlwZQRuYW1lB2Rlc3RfaWQGdWludDY0B2dvb2RfaWQGdWludDE2CHF1YW50aXR5BnVpbnQzMgZ0cmF2ZWwABQtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAF4BWludDY0AXkFaW50NjQIcmVjaGFyZ2UEYm9vbAl0eXBlc19yb3cAAgJpZAZ1aW50NjQTZW50aXR5X3N1bW1hcnlfdHlwZQ5lbnRpdHlfc3VtbWFyeQx1cGRhdGVjcmVkaXQAAgdhY2NvdW50BG5hbWUGYW1vdW50BWludDY0CnVwZGF0ZWRlYnQAAgdhY2NvdW50BG5hbWUGYW1vdW50BWludDY0DXdhcmVob3VzZV9yb3cABwJpZAZ1aW50NjQFb3duZXIEbmFtZQRuYW1lBnN0cmluZwhsb2NhdGlvbgtjb29yZGluYXRlcwhjYXBhY2l0eQZ1aW50MzIHbG9hZGVycwxsb2FkZXJfc3RhdHMIc2NoZWR1bGUJc2NoZWR1bGU/BHdpcGUAAAx3aXBlc2VxdWVuY2UAACIAAABAoWl2MgdhZHZhbmNl0wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYWR2YW5jZQpzdW1tYXJ5OiAnQWR2YW5jZSB0dXJuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZHZhbmNlIHRoZSBnYW1lIHRvIHRoZSBuZXh0IHR1cm4uAAAAOFHKvD4IYnV5Z29vZHPdAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXlnb29kcwpzdW1tYXJ5OiAnQnV5IGdvb2RzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBnb29kcyBhbmQgYWRkIHRoZW0gdG8gYSBzaGlwJ3MgY2FyZ28uAAAAoLqGvT4HYnV5c2hpcMYBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eXNoaXAKc3VtbWFyeTogJ0J1eSBhIG5ldyBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyBzaGlwoLCmTV3DvT4MYnV5d2FyZWhvdXNlzAItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5d2FyZWhvdXNlCnN1bW1hcnk6ICdCdXkgYSBuZXcgd2FyZWhvdXNlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyB3YXJlaG91c2UgYXQgdGhlIGxvY2F0aW9uIG9mIGFuIGlkbGUgc2hpcC4gV2FyZWhvdXNlcyBwcm92aWRlIGNhcmdvIHN0b3JhZ2Ugd2l0aCBsb2FkaW5nL3VubG9hZGluZyBjYXBhYmlsaXRpZXMgYnV0IGNhbm5vdCBtb3ZlLgAAAABEhaZBBmNhbmNlbMcCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNhbmNlbApzdW1tYXJ5OiAnQ2FuY2VsIHNjaGVkdWxlZCB0YXNrcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FuY2VsIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRhc2tzIGZyb20gdGhlIGVuZCBvZiBhbiBlbnRpdHkncyBzY2hlZHVsZS4gVGFza3MgdGhhdCBhcmUgaW1tdXRhYmxlIGFuZCBpbiBwcm9ncmVzcyBjYW5ub3QgYmUgY2FuY2VsbGVkLgoKLS0tAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAABkJyVFBmNvbW1pdPEBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNvbW1pdApzdW1tYXJ5OiAnU2V0IGNvbW1pdCB2YWx1ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2V0IHRoZSBpbml0aWFsIGNvbW1pdCB2YWx1ZSBkdXJpbmcgZ2FtZSBpbml0aWFsaXphdGlvbi4KCi0tLQAAAACoeMxUBmVuYWJsZeIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnU2V0IGVuYWJsZWQgc3RhdGUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoaXMgZ2FtZSBvZiBTaGlwbG9hZC4KCi0tLQCwctnlqbJiC2dldGVudGl0aWVzpAItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0ZW50aXRpZXMKc3VtbWFyeTogJ0dldCBhbGwgZW50aXRpZXMgZm9yIGEgcGxheWVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm5zIGZ1bGwgZW50aXR5IGluZm8gZm9yIGFsbCBlbnRpdGllcyBvd25lZCBieSBhIHBsYXllci4gT3B0aW9uYWxseSBmaWx0ZXIgYnkgZW50aXR5IHR5cGUuAADw2eWpsmIJZ2V0ZW50aXR5ogItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0ZW50aXR5CnN1bW1hcnk6ICdHZXQgZW50aXR5IHN0YXRlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm5zIHRoZSBjdXJyZW50IHN0YXRlIG9mIGFuIGVudGl0eSBpbmNsdWRpbmcgaWRlbnRpdHksIGNhcmdvLCBzY2hlZHVsZSBzdGF0ZSwgYW5kIHR5cGUtc3BlY2lmaWMgZmllbGRzLgAAADhRyrJiCGdldGdvb2RzqgItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0Z29vZHMKc3VtbWFyeTogJ0dldCBhbGwgYXZhaWxhYmxlIGdvb2RzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGEgbGlzdCBvZiBhbGwgdHJhZGVhYmxlIGdvb2RzIGluIHRoZSBnYW1lIGluY2x1ZGluZyB0aGVpciBpZCwgbmFtZSwgYmFzZSBwcmljZSwgYW5kIG1hc3MuACZ12SAas2ILZ2V0bG9jYXRpb27iAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRsb2NhdGlvbgpzdW1tYXJ5OiAnR2V0IGxvY2F0aW9uIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IGEgbG9jYXRpb24gaW5jbHVkaW5nIHdoZXRoZXIgYSBzeXN0ZW0gZXhpc3RzLCBhbmQgZm9yIGVhY2ggZ29vZDogcHJpY2UsIHN1cHBseSwgcmFyaXR5IG11bHRpcGxpZXIsIGFuZCBsb2NhdGlvbiBtdWx0aXBsaWVyLgAA8OcaNbNiCWdldG5lYXJied4DLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldG5lYXJieQpzdW1tYXJ5OiAnR2V0IG5lYXJieSByZWFjaGFibGUgc3lzdGVtcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBuZWFyYnkgc3lzdGVtcyByZWFjaGFibGUgYnkgYW4gZW50aXR5IGZyb20gaXRzIHByb2plY3RlZCBsb2NhdGlvbi4gUmV0dXJucyBjdXJyZW50IHN0YXRlICh3aXRoIGNvbXBsZXRlZCB0YXNrcyByZXNvbHZlZCksIHByb2plY3RlZCBzdGF0ZSAoYWZ0ZXIgYWxsIHNjaGVkdWxlZCB0YXNrcyksIGFuZCBhIGxpc3Qgb2YgcmVhY2hhYmxlIHN5c3RlbXMgd2l0aCBkaXN0YW5jZSwgZW5lcmd5IGNvc3QsIGZsaWdodCB0aW1lLCBhbmQgbWFya2V0IGluZm9ybWF0aW9uLgAAuMqbWLNiCWdldHBsYXllcv0CLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldHBsYXllcgpzdW1tYXJ5OiAnR2V0IHBsYXllciBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCBhIHBsYXllciBpbmNsdWRpbmcgYmFsYW5jZSwgZGVidCwgbmV0d29ydGgsIGVudGl0eSBjb3VudHMsIGFuZCBwcmljaW5nIGZvciBuZXh0IHB1cmNoYXNlcy4gUmV0dXJucyBpc19wbGF5ZXI9ZmFsc2UgaWYgdGhlIGFjY291bnQgaGFzIG5vdCBqb2luZWQgdGhlIGdhbWUugJW7RkqNs2IMZ2V0c3VtbWFyaWVz6AItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0c3VtbWFyaWVzCnN1bW1hcnk6ICdHZXQgZW50aXR5IHN1bW1hcmllcyBmb3IgYSBwbGF5ZXInCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJldHVybnMgbGlnaHR3ZWlnaHQgc3VtbWFyaWVzIG9mIGFsbCBlbnRpdGllcyBvd25lZCBieSBhIHBsYXllciBpbmNsdWRpbmcgdHlwZSwgaWQsIG93bmVyLCBuYW1lLCBsb2NhdGlvbiwgYW5kIGlkbGUgc3RhdHVzLiBPcHRpb25hbGx5IGZpbHRlciBieSBlbnRpdHkgdHlwZS4AAAAAANCwaQRoYXNo/QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaGFzaApzdW1tYXJ5OiAnQ2FsY3VsYXRlIHNoYTI1NiBoYXNoJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGVzIHRoZSBzaGEyNTYgaGFzaCBvZiBhIHN0cmluZyBiYXNlZCB1c2luZyB0aGUgZ2FtZSBzZWVkLgoKLS0tAAAAQITSsGkHaGFzaDUxMvsBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGhhc2g1MTIKc3VtbWFyeTogJ0NhbGN1bGF0ZSBzaGE1MTIgaGFzaCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlcyB0aGUgc2hhNTEyIGhhc2ggb2YgYSBzdHJpbmcgYmFzZWQgdXNpbmcgdGhlIGdhbWUgc2VlZC4AAAAAAJDddARpbml0+gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaW5pdApzdW1tYXJ5OiAnSW5pdGlhbGl6ZSBnYW1lIHNlZWQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYWxpemUgYSB0aGUgZ2FtZXMgc2VlZCBhbmQgc2VlZCB2YWx1ZXMgdG8gYm9vdHN0cmFwIGdhbWUgc3RhdGUuAAAAAAAwHX0Eam9pbskBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGpvaW4Kc3VtbWFyeTogJ0pvaW4gYSBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpKb2luIGEgZ2FtZSBvZiBTaGlwbG9hZAoKLS0tAACICk2DGI0JbG9nY2FuY2VsAACA2pFidRmNCmxvZ3Jlc29sdmUAAAAAYBoavakHcGF5bG9hbq8BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHBheWxvYW4Kc3VtbWFyeTogJ0xvYW4gUGF5bWVudCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQB8rFVjxa6uC3B1cmdlc3VwcGx56QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcHVyZ2VzdXBwbHkKc3VtbWFyeTogJ1VwZGF0ZSBHYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJnZSBvbGQgc3VwcGx5IHJlY29yZHMgYW5kIGhlbHAgY2xlYW51cCBnYW1lIHN0YXRlLgAAAIpd05C6CHJlY2hhcmdl0gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcmVjaGFyZ2UKc3VtbWFyeTogJ1JlY2hhcmdlIHNoaXAgZW5lcmd5JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTY2hlZHVsZSBhIHJlY2hhcmdlIHRhc2sgZm9yIGFuIGVudGl0eSB0byByZXN0b3JlIGVuZXJneSB0byBmdWxsIGNhcGFjaXR5LiBUaGUgcmVjaGFyZ2UgZHVyYXRpb24gZGVwZW5kcyBvbiBjdXJyZW50IGVuZXJneSBsZXZlbCBhbmQgcmVjaGFyZ2UgcmF0ZS4KCi0tLQAAAEDtSLG6B3Jlc29sdmXEAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiByZXNvbHZlCnN1bW1hcnk6ICdDb21wbGV0ZSBzY2hlZHVsZWQgdGFza3MnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJlc29sdmUgYWxsIGNvbXBsZXRlZCB0YXNrcyBpbiBhbiBlbnRpdHkncyBzY2hlZHVsZSwgYXBwbHlpbmcgdGhlaXIgZWZmZWN0cyAocmVjaGFyZ2UgZW5lcmd5LCB1cGRhdGUgbG9jYXRpb24sIGxvYWQvdW5sb2FkIGNhcmdvKS4KCi0tLQAAAAAAkKPBBHNhbHTdAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzYWx0CnN1bW1hcnk6ICdBcHBlbmQgU2FsdCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQWRkIGFkZGl0aW9uYWwgc2FsdCB0byB0aGUgbmV4dCBlcG9jaCBzZWVkLgoKLS0tAADAiVIWo8IJc2VsbGdvb2Rz1QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2VsbGdvb2RzCnN1bW1hcnk6ICdTZWxsIGdvb2RzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTZWxsIGdvb2RzIGZyb20gYSBzaGlwJ3MgY2FyZ28uCgotLS0AAADT0KigyQh0YWtlbG9hbuoBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHRha2Vsb2FuCnN1bW1hcnk6ICdDcmVkaXQgTG9hbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQm9ycm93IGNyZWRpdHMgZnJvbSB0aGUgYmFuayB0aGF0IHdpbGwgbmVlZCB0byBiZSByZXBhaWQuAAAAVy08zc0IdHJhbnNmZXLIAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmFuc2ZlcgpzdW1tYXJ5OiAnVHJhbnNmZXIgY2FyZ28gYmV0d2VlbiBlbnRpdGllcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVHJhbnNmZXIgY2FyZ28gYmV0d2VlbiB0d28gZW50aXRpZXMgYXQgdGhlIHNhbWUgbG9jYXRpb24uIEJvdGggZW50aXRpZXMgbXVzdCBiZSBvd25lZCBieSB0aGUgY2FsbGVyIGFuZCBhdCBsZWFzdCBvbmUgbXVzdCBoYXZlIGxvYWRlcnMuIENyZWF0ZXMgbG9hZCBhbmQgdW5sb2FkIHRhc2tzIG9uIGJvdGggZW50aXRpZXMgd2l0aCBkdXJhdGlvbiBiYXNlZCBvbiBjb21iaW5lZCBsb2FkZXIgY2FwYWNpdHkgYW5kIFotZGlzdGFuY2UgYmV0d2VlbiB0aGVtLgAAAABEtc3NBnRyYXZlbMsCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHRyYXZlbApzdW1tYXJ5OiAnTW92ZSBhIHNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYXRlIHRyYXZlbCBvZiBhbiBlbnRpdHkgZnJvbSBpdHMgY3VycmVudCBsb2NhdGlvbiB0byBhIG5ldyBkZXN0aW5hdGlvbi4KCi0tLQoKVGhpcyBhY3Rpb24gZGV0ZXJtaW5lcyB0aGUgbWFya2V0IHByaWNlIG9mIGFsbCBnb29kcyBhdCBhIGdpdmVuIGxvY2F0aW9uLpBdUhepbFLVDHVwZGF0ZWNyZWRpdMIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVwZGF0ZWNyZWRpdApzdW1tYXJ5OiAnREVCVUc6IHVwZGF0ZWNyZWRpdCBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0AQD4qqWxS1Qp1cGRhdGVkZWJ0vgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdXBkYXRlZGVidApzdW1tYXJ5OiAnREVCVUc6IHVwZGF0ZWRlYnQgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAAAAAACgquMEd2lwZbIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGUKc3VtbWFyeTogJ0RFQlVHOiB3aXBlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLaDQVNoqrKrjDHdpcGVzZXF1ZW5jZcIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGVzZXF1ZW5jZQpzdW1tYXJ5OiAnREVCVUc6IHdpcGVzZXF1ZW5jZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0IAAAAAADKrkEDaTY0AAAJY2FyZ29fcm93AAAAk7psEI0DaTY0AAAMbG9jYXRpb25fcm93AAAAAFzlTawDaTY0AAAKcGxheWVyX3JvdwAAAApNpa3CA2k2NAAADHNlcXVlbmNlX3JvdwAAAAAAUF3DA2k2NAAACHNoaXBfcm93AAAAAACVTcYDaTY0AAAJc3RhdGVfcm93AAAAAACsqs8DaTY0AAAJdHlwZXNfcm93AABQWNOmruEDaTY0AAANd2FyZWhvdXNlX3JvdwERU2hpcGxvYWQgKFNlcnZlcikRU2hpcGxvYWQgKFNlcnZlcikAAAAQAAAAOFHKvD4MdGFza19yZXN1bHRzAAAAAESFpkEOY2FuY2VsX3Jlc3VsdHMAsHLZ5amyYg1lbnRpdHlfaW5mb1tdAADw2eWpsmILZW50aXR5X2luZm8AAAA4UcqyYgpnb29kc19pbmZvACZ12SAas2INbG9jYXRpb25faW5mbwAA8OcaNbNiC25lYXJieV9pbmZvAAC4yptYs2ILcGxheWVyX2luZm+AlbtGSo2zYhBlbnRpdHlfc3VtbWFyeVtdAAAAAADQsGkLY2hlY2tzdW0yNTYAAABAhNKwaQtjaGVja3N1bTUxMgAAAIpd05C6DHRhc2tfcmVzdWx0cwAAAEDtSLG6D3Jlc29sdmVfcmVzdWx0cwAAwIlSFqPCDHRhc2tfcmVzdWx0cwAAAFctPM3NDHRhc2tfcmVzdWx0cwAAAABEtc3NDHRhc2tfcmVzdWx0cw=='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('advance')
    export class advance extends Struct {
        @Struct.field('string')
        declare reveal: string
        @Struct.field(Checksum256)
        declare commit: Checksum256
    }
    @Struct.type('buygoods')
    export class buygoods extends Struct {
        @Struct.field(UInt64)
        declare ship_id: UInt64
        @Struct.field(UInt16)
        declare good_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
    }
    @Struct.type('buyship')
    export class buyship extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field('string')
        declare name: string
    }
    @Struct.type('buywarehouse')
    export class buywarehouse extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(UInt64)
        declare ship_id: UInt64
        @Struct.field('string')
        declare name: string
    }
    @Struct.type('cancel')
    export class cancel extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt64)
        declare count: UInt64
    }
    @Struct.type('coordinates')
    export class coordinates extends Struct {
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
        @Struct.field(UInt16, {optional: true})
        declare z?: UInt16
    }
    @Struct.type('cargo_item')
    export class cargo_item extends Struct {
        @Struct.field(UInt16)
        declare good_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
        @Struct.field(UInt64)
        declare unit_cost: UInt64
    }
    @Struct.type('task')
    export class task extends Struct {
        @Struct.field(UInt8)
        declare type: UInt8
        @Struct.field(UInt32)
        declare duration: UInt32
        @Struct.field(UInt8)
        declare cancelable: UInt8
        @Struct.field(coordinates, {optional: true})
        declare location?: coordinates
        @Struct.field(cargo_item, {array: true})
        declare cargo: cargo_item[]
        @Struct.field(UInt64, {optional: true})
        declare entity?: UInt64
        @Struct.field(Int64, {optional: true})
        declare credits?: Int64
    }
    @Struct.type('cancel_log')
    export class cancel_log extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt8)
        declare task_index: UInt8
        @Struct.field(task)
        declare task: task
        @Struct.field(TimePoint)
        declare started_at: TimePoint
    }
    @Struct.type('cancel_results')
    export class cancel_results extends Struct {
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt8)
        declare cancelled_count: UInt8
        @Struct.field(TimePoint, {optional: true})
        declare schedule_started?: TimePoint
    }
    @Struct.type('cargo_row')
    export class cargo_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt64)
        declare good_id: UInt64
        @Struct.field(UInt64)
        declare quantity: UInt64
        @Struct.field(UInt64)
        declare unit_cost: UInt64
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
    @Struct.type('commit')
    export class commit extends Struct {
        @Struct.field(Checksum256)
        declare commit: Checksum256
    }
    @Struct.type('enable')
    export class enable extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
    }
    @Struct.type('energy_stats')
    export class energy_stats extends Struct {
        @Struct.field(UInt16)
        declare capacity: UInt16
        @Struct.field(UInt16)
        declare recharge: UInt16
    }
    @Struct.type('loader_stats')
    export class loader_stats extends Struct {
        @Struct.field(UInt32)
        declare mass: UInt32
        @Struct.field(UInt16)
        declare thrust: UInt16
        @Struct.field(UInt8)
        declare quantity: UInt8
    }
    @Struct.type('movement_stats')
    export class movement_stats extends Struct {
        @Struct.field(UInt32)
        declare thrust: UInt32
        @Struct.field(UInt16)
        declare drain: UInt16
    }
    @Struct.type('schedule')
    export class schedule extends Struct {
        @Struct.field(TimePoint)
        declare started: TimePoint
        @Struct.field(task, {array: true})
        declare tasks: task[]
    }
    @Struct.type('entity_info')
    export class entity_info extends Struct {
        @Struct.field(Name)
        declare type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Name)
        declare owner: Name
        @Struct.field('string')
        declare entity_name: string
        @Struct.field(coordinates)
        declare location: coordinates
        @Struct.field(UInt32)
        declare cargomass: UInt32
        @Struct.field(cargo_item, {array: true})
        declare cargo: cargo_item[]
        @Struct.field(loader_stats, {optional: true})
        declare loaders?: loader_stats
        @Struct.field(UInt16, {optional: true})
        declare energy?: UInt16
        @Struct.field(UInt32, {optional: true})
        declare mass?: UInt32
        @Struct.field(movement_stats, {optional: true})
        declare engines?: movement_stats
        @Struct.field(energy_stats, {optional: true})
        declare generator?: energy_stats
        @Struct.field(UInt32, {optional: true})
        declare capacity?: UInt32
        @Struct.field('bool')
        declare is_idle: boolean
        @Struct.field(task, {optional: true})
        declare current_task?: task
        @Struct.field(UInt32)
        declare current_task_elapsed: UInt32
        @Struct.field(UInt32)
        declare current_task_remaining: UInt32
        @Struct.field(task, {array: true})
        declare pending_tasks: task[]
        @Struct.field(TimePoint, {optional: true})
        declare idle_at?: TimePoint
        @Struct.field(schedule, {optional: true})
        declare schedule?: schedule
    }
    @Struct.type('entity_state')
    export class entity_state extends Struct {
        @Struct.field(coordinates)
        declare location: coordinates
        @Struct.field(UInt16)
        declare energy: UInt16
    }
    @Struct.type('entity_summary')
    export class entity_summary extends Struct {
        @Struct.field(Name)
        declare type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Name)
        declare owner: Name
        @Struct.field('string')
        declare entity_name: string
        @Struct.field(coordinates)
        declare location: coordinates
        @Struct.field('bool')
        declare is_idle: boolean
        @Struct.field(UInt32)
        declare resolved_count: UInt32
        @Struct.field(UInt32)
        declare pending_count: UInt32
    }
    @Struct.type('entity_task_info')
    export class entity_task_info extends Struct {
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt8)
        declare task_count: UInt8
        @Struct.field(TimePoint)
        declare schedule_started: TimePoint
    }
    @Struct.type('getentities')
    export class getentities extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name, {optional: true})
        declare entity_type?: Name
    }
    @Struct.type('getentity')
    export class getentity extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
    }
    @Struct.type('getgoods')
    export class getgoods extends Struct {}
    @Struct.type('getlocation')
    export class getlocation extends Struct {
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
    }
    @Struct.type('getnearby')
    export class getnearby extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field('bool')
        declare recharge: boolean
    }
    @Struct.type('getplayer')
    export class getplayer extends Struct {
        @Struct.field(Name)
        declare account: Name
    }
    @Struct.type('getsummaries')
    export class getsummaries extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name, {optional: true})
        declare entity_type?: Name
    }
    @Struct.type('good')
    export class good extends Struct {
        @Struct.field(UInt16)
        declare id: UInt16
        @Struct.field(UInt32)
        declare base_price: UInt32
        @Struct.field(UInt32)
        declare mass: UInt32
    }
    @Struct.type('goods_info')
    export class goods_info extends Struct {
        @Struct.field(good, {array: true})
        declare goods: good[]
    }
    @Struct.type('hash')
    export class hash extends Struct {
        @Struct.field('string')
        declare value: string
    }
    @Struct.type('hash512')
    export class hash512 extends Struct {
        @Struct.field('string')
        declare value: string
    }
    @Struct.type('init')
    export class init extends Struct {
        @Struct.field(Checksum256)
        declare seed: Checksum256
    }
    @Struct.type('join')
    export class join extends Struct {
        @Struct.field(Name)
        declare account: Name
    }
    @Struct.type('location_good')
    export class location_good extends Struct {
        @Struct.field(UInt16)
        declare id: UInt16
        @Struct.field(UInt32)
        declare price: UInt32
        @Struct.field(UInt16)
        declare supply: UInt16
        @Struct.field(UInt32)
        declare rarity_multiplier: UInt32
        @Struct.field(UInt32)
        declare location_multiplier: UInt32
    }
    @Struct.type('location_info')
    export class location_info extends Struct {
        @Struct.field(coordinates)
        declare coords: coordinates
        @Struct.field('bool')
        declare is_system: boolean
        @Struct.field(location_good, {array: true})
        declare goods: location_good[]
    }
    @Struct.type('location_row')
    export class location_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(coordinates)
        declare coordinates: coordinates
        @Struct.field(UInt64)
        declare epoch: UInt64
        @Struct.field(UInt16)
        declare good_id: UInt16
        @Struct.field(UInt16)
        declare supply: UInt16
    }
    @Struct.type('logcancel')
    export class logcancel extends Struct {
        @Struct.field(cancel_log)
        declare log: cancel_log
    }
    @Struct.type('resolve_log')
    export class resolve_log extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt8)
        declare task_index: UInt8
        @Struct.field(task)
        declare task: task
        @Struct.field(TimePoint)
        declare started_at: TimePoint
        @Struct.field(TimePoint)
        declare completed_at: TimePoint
        @Struct.field(UInt16, {optional: true})
        declare new_energy?: UInt16
        @Struct.field(coordinates, {optional: true})
        declare new_location?: coordinates
        @Struct.field(Int64)
        declare cargomass_delta: Int64
        @Struct.field(cargo_item, {array: true})
        declare cargo_added: cargo_item[]
        @Struct.field(cargo_item, {array: true})
        declare cargo_removed: cargo_item[]
        @Struct.field(Int64, {optional: true})
        declare credits?: Int64
    }
    @Struct.type('logresolve')
    export class logresolve extends Struct {
        @Struct.field(resolve_log)
        declare log: resolve_log
    }
    @Struct.type('nearby_system')
    export class nearby_system extends Struct {
        @Struct.field(UInt64)
        declare distance: UInt64
        @Struct.field(UInt64)
        declare energy_cost: UInt64
        @Struct.field(UInt32)
        declare flight_time: UInt32
        @Struct.field(location_info)
        declare location: location_info
    }
    @Struct.type('nearby_info')
    export class nearby_info extends Struct {
        @Struct.field('bool')
        declare can_travel: boolean
        @Struct.field(entity_state)
        declare current: entity_state
        @Struct.field(entity_state)
        declare projected: entity_state
        @Struct.field(UInt16)
        declare max_energy: UInt16
        @Struct.field(nearby_system, {array: true})
        declare systems: nearby_system[]
    }
    @Struct.type('payloan')
    export class payloan extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(UInt64)
        declare amount: UInt64
    }
    @Struct.type('player_info')
    export class player_info extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field('bool')
        declare is_player: boolean
        @Struct.field('string')
        declare company_name: string
        @Struct.field(UInt64)
        declare balance: UInt64
        @Struct.field(UInt32)
        declare debt: UInt32
        @Struct.field(Int64)
        declare networth: Int64
        @Struct.field(UInt64)
        declare available_loan: UInt64
        @Struct.field(UInt64)
        declare next_ship_price: UInt64
        @Struct.field(UInt64)
        declare next_warehouse_price: UInt64
        @Struct.field(UInt64)
        declare ship_count: UInt64
        @Struct.field(UInt64)
        declare warehouse_count: UInt64
    }
    @Struct.type('player_row')
    export class player_row extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(UInt64)
        declare balance: UInt64
        @Struct.field(UInt32)
        declare debt: UInt32
        @Struct.field(Int64)
        declare networth: Int64
    }
    @Struct.type('purgesupply')
    export class purgesupply extends Struct {
        @Struct.field(UInt64, {optional: true})
        declare max_rows?: UInt64
    }
    @Struct.type('recharge')
    export class recharge extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
    }
    @Struct.type('resolve')
    export class resolve extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
    }
    @Struct.type('resolve_results')
    export class resolve_results extends Struct {
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt8)
        declare resolved_count: UInt8
        @Struct.field(TimePoint, {optional: true})
        declare new_schedule_started?: TimePoint
    }
    @Struct.type('salt')
    export class salt extends Struct {
        @Struct.field(UInt64)
        declare salt: UInt64
    }
    @Struct.type('sellgoods')
    export class sellgoods extends Struct {
        @Struct.field(UInt64)
        declare ship_id: UInt64
        @Struct.field(UInt16)
        declare good_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
    }
    @Struct.type('sequence_row')
    export class sequence_row extends Struct {
        @Struct.field(Name)
        declare key: Name
        @Struct.field(UInt64)
        declare value: UInt64
    }
    @Struct.type('ship_row')
    export class ship_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Name)
        declare owner: Name
        @Struct.field('string')
        declare name: string
        @Struct.field(coordinates)
        declare location: coordinates
        @Struct.field(UInt32)
        declare mass: UInt32
        @Struct.field(UInt32)
        declare capacity: UInt32
        @Struct.field(UInt16)
        declare energy: UInt16
        @Struct.field(movement_stats)
        declare engines: movement_stats
        @Struct.field(energy_stats)
        declare generator: energy_stats
        @Struct.field(loader_stats)
        declare loaders: loader_stats
        @Struct.field(schedule, {optional: true})
        declare schedule?: schedule
    }
    @Struct.type('state_row')
    export class state_row extends Struct {
        @Struct.field('bool')
        declare enabled: boolean
        @Struct.field(UInt32)
        declare epoch: UInt32
        @Struct.field(UInt64)
        declare salt: UInt64
        @Struct.field(UInt32)
        declare ships: UInt32
        @Struct.field(Checksum256)
        declare seed: Checksum256
        @Struct.field(Checksum256)
        declare commit: Checksum256
    }
    @Struct.type('takeloan')
    export class takeloan extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(UInt64)
        declare amount: UInt64
    }
    @Struct.type('task_results')
    export class task_results extends Struct {
        @Struct.field(entity_task_info, {array: true})
        declare entities: entity_task_info[]
    }
    @Struct.type('transfer')
    export class transfer extends Struct {
        @Struct.field(Name)
        declare source_type: Name
        @Struct.field(UInt64)
        declare source_id: UInt64
        @Struct.field(Name)
        declare dest_type: Name
        @Struct.field(UInt64)
        declare dest_id: UInt64
        @Struct.field(UInt16)
        declare good_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
    }
    @Struct.type('travel')
    export class travel extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
        @Struct.field('bool')
        declare recharge: boolean
    }
    @Struct.type('types_row')
    export class types_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(entity_summary)
        declare entity_summary_type: entity_summary
    }
    @Struct.type('updatecredit')
    export class updatecredit extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(Int64)
        declare amount: Int64
    }
    @Struct.type('updatedebt')
    export class updatedebt extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(Int64)
        declare amount: Int64
    }
    @Struct.type('warehouse_row')
    export class warehouse_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Name)
        declare owner: Name
        @Struct.field('string')
        declare name: string
        @Struct.field(coordinates)
        declare location: coordinates
        @Struct.field(UInt32)
        declare capacity: UInt32
        @Struct.field(loader_stats)
        declare loaders: loader_stats
        @Struct.field(schedule, {optional: true})
        declare schedule?: schedule
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
    types: Types.types_row,
    warehouse: Types.warehouse_row,
}
export interface TableTypes {
    cargo: Types.cargo_row
    location: Types.location_row
    player: Types.player_row
    sequence: Types.sequence_row
    ship: Types.ship_row
    state: Types.state_row
    types: Types.types_row
    warehouse: Types.warehouse_row
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {
        export interface cancel_log {
            owner: NameType
            entity_type: NameType
            entity_id: UInt64Type
            task_index: UInt8Type
            task: Type.task
            started_at: TimePointType
        }
        export interface task {
            type: UInt8Type
            duration: UInt32Type
            cancelable: UInt8Type
            location?: Type.coordinates
            cargo: Type.cargo_item[]
            entity?: UInt64Type
            credits?: Int64Type
        }
        export interface coordinates {
            x: Int64Type
            y: Int64Type
            z?: UInt16Type
        }
        export interface cargo_item {
            good_id: UInt16Type
            quantity: UInt32Type
            unit_cost: UInt64Type
        }
        export interface resolve_log {
            owner: NameType
            entity_type: NameType
            entity_id: UInt64Type
            task_index: UInt8Type
            task: Type.task
            started_at: TimePointType
            completed_at: TimePointType
            new_energy?: UInt16Type
            new_location?: Type.coordinates
            cargomass_delta: Int64Type
            cargo_added: Type.cargo_item[]
            cargo_removed: Type.cargo_item[]
            credits?: Int64Type
        }
    }
    export interface advance {
        reveal: string
        commit: Checksum256Type
    }
    export interface buygoods {
        ship_id: UInt64Type
        good_id: UInt16Type
        quantity: UInt32Type
    }
    export interface buyship {
        account: NameType
        name: string
    }
    export interface buywarehouse {
        account: NameType
        ship_id: UInt64Type
        name: string
    }
    export interface cancel {
        entity_type: NameType
        id: UInt64Type
        count: UInt64Type
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
    export interface getentities {
        owner: NameType
        entity_type?: NameType
    }
    export interface getentity {
        entity_type: NameType
        entity_id: UInt64Type
    }
    export interface getgoods {}
    export interface getlocation {
        x: Int64Type
        y: Int64Type
    }
    export interface getnearby {
        entity_type: NameType
        entity_id: UInt64Type
        recharge: boolean
    }
    export interface getplayer {
        account: NameType
    }
    export interface getsummaries {
        owner: NameType
        entity_type?: NameType
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
    export interface logcancel {
        log: Type.cancel_log
    }
    export interface logresolve {
        log: Type.resolve_log
    }
    export interface payloan {
        account: NameType
        amount: UInt64Type
    }
    export interface purgesupply {
        max_rows?: UInt64Type
    }
    export interface recharge {
        entity_type: NameType
        id: UInt64Type
    }
    export interface resolve {
        entity_type: NameType
        id: UInt64Type
    }
    export interface salt {
        salt: UInt64Type
    }
    export interface sellgoods {
        ship_id: UInt64Type
        good_id: UInt16Type
        quantity: UInt32Type
    }
    export interface takeloan {
        account: NameType
        amount: UInt64Type
    }
    export interface transfer {
        source_type: NameType
        source_id: UInt64Type
        dest_type: NameType
        dest_id: UInt64Type
        good_id: UInt16Type
        quantity: UInt32Type
    }
    export interface travel {
        entity_type: NameType
        id: UInt64Type
        x: Int64Type
        y: Int64Type
        recharge: boolean
    }
    export interface updatecredit {
        account: NameType
        amount: Int64Type
    }
    export interface updatedebt {
        account: NameType
        amount: Int64Type
    }
    export interface wipe {}
    export interface wipesequence {}
}
export interface ActionNameParams {
    advance: ActionParams.advance
    buygoods: ActionParams.buygoods
    buyship: ActionParams.buyship
    buywarehouse: ActionParams.buywarehouse
    cancel: ActionParams.cancel
    cleartable: ActionParams.cleartable
    commit: ActionParams.commit
    enable: ActionParams.enable
    getentities: ActionParams.getentities
    getentity: ActionParams.getentity
    getgoods: ActionParams.getgoods
    getlocation: ActionParams.getlocation
    getnearby: ActionParams.getnearby
    getplayer: ActionParams.getplayer
    getsummaries: ActionParams.getsummaries
    hash: ActionParams.hash
    hash512: ActionParams.hash512
    init: ActionParams.init
    join: ActionParams.join
    logcancel: ActionParams.logcancel
    logresolve: ActionParams.logresolve
    payloan: ActionParams.payloan
    purgesupply: ActionParams.purgesupply
    recharge: ActionParams.recharge
    resolve: ActionParams.resolve
    salt: ActionParams.salt
    sellgoods: ActionParams.sellgoods
    takeloan: ActionParams.takeloan
    transfer: ActionParams.transfer
    travel: ActionParams.travel
    updatecredit: ActionParams.updatecredit
    updatedebt: ActionParams.updatedebt
    wipe: ActionParams.wipe
    wipesequence: ActionParams.wipesequence
}
export type ActionNames = keyof ActionNameParams
export interface ActionReturnValues {
    buygoods: Types.task_results
    cancel: Types.cancel_results
    getentities: Types.entity_info[]
    getentity: Types.entity_info
    getgoods: Types.goods_info
    getlocation: Types.location_info
    getnearby: Types.nearby_info
    getplayer: Types.player_info
    getsummaries: Types.entity_summary[]
    hash: Checksum256
    hash512: Checksum512
    recharge: Types.task_results
    resolve: Types.resolve_results
    sellgoods: Types.task_results
    transfer: Types.task_results
    travel: Types.task_results
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
