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
    'DmVvc2lvOjphYmkvMS4yAhVCX3ZlY3Rvcl9lbnRpdHlfcmVmX0UMZW50aXR5X3JlZltdDWxvY2F0aW9uX3R5cGUFdWludDhQB2FkdmFuY2UAAgZyZXZlYWwGc3RyaW5nBmNvbW1pdAtjaGVja3N1bTI1NgxidXljb250YWluZXIAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcIYnV5Z29vZHMABAtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAdnb29kX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIHYnV5c2hpcAACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwxidXl3YXJlaG91c2UAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcGY2FuY2VsAAMLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQFY291bnQGdWludDY0DmNhbmNlbF9yZXN1bHRzAAYJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lD2NhbmNlbGxlZF9jb3VudAV1aW50OBBzY2hlZHVsZV9zdGFydGVkC3RpbWVfcG9pbnQ/C2VudGl0eWdyb3VwB3VpbnQ2ND8NZ3JvdXBfbWVtYmVycxZCX3ZlY3Rvcl9lbnRpdHlfcmVmX0U/CmNhcmdvX2l0ZW0ABAdnb29kX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIJdW5pdF9jb3N0BnVpbnQ2NAdtaXh0dXJlDW1peHR1cmVfaW5mbz8JY2FyZ29fcm93AAUCaWQGdWludDY0CWVudGl0eV9pZAZ1aW50NjQHZ29vZF9pZAZ1aW50NjQIcXVhbnRpdHkGdWludDY0CXVuaXRfY29zdAZ1aW50NjQKY2xlYXJ0YWJsZQADCnRhYmxlX25hbWUEbmFtZQVzY29wZQVuYW1lPwhtYXhfcm93cwd1aW50NjQ/BmNvbW1pdAABBmNvbW1pdAtjaGVja3N1bTI1Ng1jb250YWluZXJfcm93AAgCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIaHVsbG1hc3MGdWludDMyCGNhcGFjaXR5BnVpbnQzMgljYXJnb21hc3MGdWludDMyCHNjaGVkdWxlCXNjaGVkdWxlPwtjb29yZGluYXRlcwADAXgFaW50NjQBeQVpbnQ2NAF6B3VpbnQxNj8GZW5hYmxlAAEHZW5hYmxlZARib29sDGVuZXJneV9zdGF0cwACCGNhcGFjaXR5BnVpbnQxNghyZWNoYXJnZQZ1aW50MTYUZW50aXR5X2N1cnJlbnRfc3RhdGUAAgtjb29yZGluYXRlcwtjb29yZGluYXRlcwZlbmVyZ3kGdWludDE2C2VudGl0eV9pbmZvABUEdHlwZQRuYW1lAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2VudGl0eV9uYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwljYXJnb21hc3MGdWludDMyBWNhcmdvDGNhcmdvX2l0ZW1bXQdsb2FkZXJzDWxvYWRlcl9zdGF0cz8GZW5lcmd5B3VpbnQxNj8IaHVsbG1hc3MHdWludDMyPwdlbmdpbmVzD21vdmVtZW50X3N0YXRzPwlnZW5lcmF0b3INZW5lcmd5X3N0YXRzPwhjYXBhY2l0eQd1aW50MzI/CWV4dHJhY3RvchBleHRyYWN0b3Jfc3RhdHM/B2lzX2lkbGUEYm9vbAxjdXJyZW50X3Rhc2sFdGFzaz8UY3VycmVudF90YXNrX2VsYXBzZWQGdWludDMyFmN1cnJlbnRfdGFza19yZW1haW5pbmcGdWludDMyDXBlbmRpbmdfdGFza3MGdGFza1tdB2lkbGVfYXQLdGltZV9wb2ludD8Ic2NoZWR1bGUJc2NoZWR1bGU/CmVudGl0eV9yZWYAAgtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQOZW50aXR5X3N1bW1hcnkACAR0eXBlBG5hbWUCaWQGdWludDY0BW93bmVyBG5hbWULZW50aXR5X25hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzB2lzX2lkbGUEYm9vbA5yZXNvbHZlZF9jb3VudAZ1aW50MzINcGVuZGluZ19jb3VudAZ1aW50MzIQZW50aXR5X3Rhc2tfaW5mbwAECWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQp0YXNrX2NvdW50BXVpbnQ4EHNjaGVkdWxlX3N0YXJ0ZWQKdGltZV9wb2ludA9lbnRpdHlncm91cF9yb3cAAgJpZAZ1aW50NjQMcGFydGljaXBhbnRzDGVudGl0eV9yZWZbXQdleHRyYWN0AAEHc2hpcF9pZAZ1aW50NjQPZXh0cmFjdG9yX3N0YXRzAAMEcmF0ZQZ1aW50MTYFZHJhaW4GdWludDE2CmVmZmljaWVuY3kGdWludDE2C2dldGVudGl0aWVzAAIFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQVuYW1lPwlnZXRlbnRpdHkAAgtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQIZ2V0Z29vZHMAAAtnZXRsb2NhdGlvbgACAXgFaW50NjQBeQVpbnQ2NApnZXRsb2NkYXRhAAIBeAVpbnQ2NAF5BWludDY0CWdldG5lYXJieQADC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhyZWNoYXJnZQRib29sCWdldHBsYXllcgABB2FjY291bnQEbmFtZQpnZXRzdGFydGVyAAAMZ2V0c3VtbWFyaWVzAAIFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQVuYW1lPwRnb29kAAMCaWQGdWludDE2CmJhc2VfcHJpY2UGdWludDMyBG1hc3MGdWludDMyCmdvb2RzX2luZm8AAQVnb29kcwZnb29kW10LZ3JvdXB0cmF2ZWwABAhlbnRpdGllcwxlbnRpdHlfcmVmW10BeAVpbnQ2NAF5BWludDY0CHJlY2hhcmdlBGJvb2wEaGFzaAABBXZhbHVlBnN0cmluZwdoYXNoNTEyAAEFdmFsdWUGc3RyaW5nBGluaXQAAQRzZWVkC2NoZWNrc3VtMjU2BGpvaW4AAQdhY2NvdW50BG5hbWUMbG9hZGVyX3N0YXRzAAMEbWFzcwZ1aW50MzIGdGhydXN0BnVpbnQxNghxdWFudGl0eQV1aW50OBBsb2NhdGlvbl9kZXJpdmVkAAIMc3RhdGljX3Byb3BzD2xvY2F0aW9uX3N0YXRpYwtlcG9jaF9wcm9wcw5sb2NhdGlvbl9lcG9jaA5sb2NhdGlvbl9lcG9jaAADBmFjdGl2ZQRib29sBXNlZWQwBXVpbnQ4BXNlZWQxBXVpbnQ4DWxvY2F0aW9uX2dvb2QABQJpZAZ1aW50MTYFcHJpY2UGdWludDMyBnN1cHBseQZ1aW50MTYRcmFyaXR5X211bHRpcGxpZXIGdWludDMyE2xvY2F0aW9uX211bHRpcGxpZXIGdWludDMyDWxvY2F0aW9uX2luZm8AAwZjb29yZHMLY29vcmRpbmF0ZXMJaXNfc3lzdGVtBGJvb2wFZ29vZHMPbG9jYXRpb25fZ29vZFtdDGxvY2F0aW9uX3JvdwAGAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCWNhcmdvbWFzcwZ1aW50MzIFY2FyZ28MY2FyZ29faXRlbVtdCHNjaGVkdWxlCXNjaGVkdWxlPw9sb2NhdGlvbl9zdGF0aWMABQZjb29yZHMLY29vcmRpbmF0ZXMEdHlwZQ1sb2NhdGlvbl90eXBlB3N1YnR5cGUFdWludDgFc2VlZDAFdWludDgFc2VlZDEFdWludDgRbWl4dHVyZV9jb21wb25lbnQAAgdnb29kX2lkBnVpbnQxNgZwdXJpdHkGdWludDE2DG1peHR1cmVfaW5mbwABCmNvbXBvbmVudHMTbWl4dHVyZV9jb21wb25lbnRbXQ5tb3ZlbWVudF9zdGF0cwACBnRocnVzdAZ1aW50MzIFZHJhaW4GdWludDE2C25lYXJieV9pbmZvAAUKY2FuX3RyYXZlbARib29sB2N1cnJlbnQUZW50aXR5X2N1cnJlbnRfc3RhdGUJcHJvamVjdGVkFGVudGl0eV9jdXJyZW50X3N0YXRlCm1heF9lbmVyZ3kGdWludDE2B3N5c3RlbXMPbmVhcmJ5X3N5c3RlbVtdDW5lYXJieV9zeXN0ZW0ABAhkaXN0YW5jZQZ1aW50NjQLZW5lcmd5X2Nvc3QGdWludDY0C2ZsaWdodF90aW1lBnVpbnQzMghsb2NhdGlvbg1sb2NhdGlvbl9pbmZvBm5vdGlmeQABBWV2ZW50CnRhc2tfZXZlbnQHcGF5bG9hbgACB2FjY291bnQEbmFtZQZhbW91bnQGdWludDY0C3BsYXllcl9pbmZvAA0Fb3duZXIEbmFtZQlpc19wbGF5ZXIEYm9vbAxjb21wYW55X25hbWUGc3RyaW5nB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDMyCG5ldHdvcnRoBWludDY0DmF2YWlsYWJsZV9sb2FuBnVpbnQ2NA9uZXh0X3NoaXBfcHJpY2UGdWludDY0FG5leHRfd2FyZWhvdXNlX3ByaWNlBnVpbnQ2NBRuZXh0X2NvbnRhaW5lcl9wcmljZQZ1aW50NjQKc2hpcF9jb3VudAZ1aW50NjQPd2FyZWhvdXNlX2NvdW50BnVpbnQ2NA9jb250YWluZXJfY291bnQGdWludDY0CnBsYXllcl9yb3cABAVvd25lcgRuYW1lB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDMyCG5ldHdvcnRoBWludDY0C3B1cmdlc3VwcGx5AAEIbWF4X3Jvd3MHdWludDY0PwhyZWNoYXJnZQACC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0B3Jlc29sdmUAAwtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAVjb3VudAd1aW50NjQ/D3Jlc29sdmVfcmVzdWx0cwAGCWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQ5yZXNvbHZlZF9jb3VudAV1aW50OBRuZXdfc2NoZWR1bGVfc3RhcnRlZAt0aW1lX3BvaW50PwtlbnRpdHlncm91cAd1aW50NjQ/DWdyb3VwX21lbWJlcnMWQl92ZWN0b3JfZW50aXR5X3JlZl9FPwRzYWx0AAEEc2FsdAZ1aW50NjQIc2NoZWR1bGUAAgdzdGFydGVkCnRpbWVfcG9pbnQFdGFza3MGdGFza1tdCXNlbGxnb29kcwAEC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0B2dvb2RfaWQGdWludDE2CHF1YW50aXR5BnVpbnQzMgxzZXF1ZW5jZV9yb3cAAgNrZXkEbmFtZQV2YWx1ZQZ1aW50NjQIc2hpcF9yb3cADgJpZAZ1aW50NjQFb3duZXIEbmFtZQRuYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwhodWxsbWFzcwZ1aW50MzIIY2FwYWNpdHkGdWludDMyBmVuZXJneQZ1aW50MTYJY2FyZ29tYXNzBnVpbnQzMgdlbmdpbmVzDm1vdmVtZW50X3N0YXRzCWdlbmVyYXRvcgxlbmVyZ3lfc3RhdHMHbG9hZGVycwxsb2FkZXJfc3RhdHMFdHJhZGUMdHJhZGVfc3RhdHM/CWV4dHJhY3RvchBleHRyYWN0b3Jfc3RhdHM/CHNjaGVkdWxlCXNjaGVkdWxlPwxzdGFydGVyX2luZm8AAwdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQ2NARzaGlwC2VudGl0eV9pbmZvCXN0YXRlX3JvdwAGB2VuYWJsZWQEYm9vbAVlcG9jaAZ1aW50MzIEc2FsdAZ1aW50NjQFc2hpcHMGdWludDMyBHNlZWQLY2hlY2tzdW0yNTYGY29tbWl0C2NoZWNrc3VtMjU2CnN1cHBseV9yb3cABQJpZAZ1aW50NjQLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMFZXBvY2gGdWludDY0B2dvb2RfaWQGdWludDE2BnN1cHBseQZ1aW50MTYIdGFrZWxvYW4AAgdhY2NvdW50BG5hbWUGYW1vdW50BnVpbnQ2NAR0YXNrAAkEdHlwZQV1aW50OAhkdXJhdGlvbgZ1aW50MzIKY2FuY2VsYWJsZQV1aW50OAtjb29yZGluYXRlcwxjb29yZGluYXRlcz8FY2FyZ28MY2FyZ29faXRlbVtdDGVudGl0eXRhcmdldAtlbnRpdHlfcmVmPwtlbnRpdHlncm91cAd1aW50NjQ/B2NyZWRpdHMGaW50NjQ/C2VuZXJneV9jb3N0B3VpbnQxNj8KdGFza19ldmVudAAOCmV2ZW50X3R5cGUFdWludDgFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQKdGFza19pbmRleAV1aW50OAR0YXNrBHRhc2sJc3RhcnRzX2F0CnRpbWVfcG9pbnQMY29tcGxldGVzX2F0CnRpbWVfcG9pbnQKbmV3X2VuZXJneQd1aW50MTY/D25ld19jb29yZGluYXRlcwxjb29yZGluYXRlcz8PY2FyZ29tYXNzX2RlbHRhBWludDY0C2NhcmdvX2FkZGVkDGNhcmdvX2l0ZW1bXQ1jYXJnb19yZW1vdmVkDGNhcmdvX2l0ZW1bXQdjcmVkaXRzBmludDY0Pwx0YXNrX3Jlc3VsdHMAAQhlbnRpdGllcxJlbnRpdHlfdGFza19pbmZvW10LdHJhZGVfc3RhdHMAAQZtYXJnaW4GdWludDE2CHRyYW5zZmVyAAYLc291cmNlX3R5cGUEbmFtZQlzb3VyY2VfaWQGdWludDY0CWRlc3RfdHlwZQRuYW1lB2Rlc3RfaWQGdWludDY0B2dvb2RfaWQGdWludDE2CHF1YW50aXR5BnVpbnQzMgZ0cmF2ZWwABQtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAF4BWludDY0AXkFaW50NjQIcmVjaGFyZ2UEYm9vbAl0eXBlc19yb3cAAwJpZAZ1aW50NjQTZW50aXR5X3N1bW1hcnlfdHlwZQ5lbnRpdHlfc3VtbWFyeRFzdGFydGVyX2luZm9fdHlwZQxzdGFydGVyX2luZm8MdXBkYXRlY3JlZGl0AAIHYWNjb3VudARuYW1lBmFtb3VudAVpbnQ2NAp1cGRhdGVkZWJ0AAIHYWNjb3VudARuYW1lBmFtb3VudAVpbnQ2NA13YXJlaG91c2Vfcm93AAgCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIY2FwYWNpdHkGdWludDMyCWNhcmdvbWFzcwZ1aW50MzIHbG9hZGVycwxsb2FkZXJfc3RhdHMIc2NoZWR1bGUJc2NoZWR1bGU/BHdpcGUAAAx3aXBlc2VxdWVuY2UAACYAAABAoWl2MgdhZHZhbmNl0wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYWR2YW5jZQpzdW1tYXJ5OiAnQWR2YW5jZSB0dXJuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZHZhbmNlIHRoZSBnYW1lIHRvIHRoZSBuZXh0IHR1cm4ucNV0Jk+KvD4MYnV5Y29udGFpbmVyygItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5Y29udGFpbmVyCnN1bW1hcnk6ICdCdXkgYSBuZXcgY29udGFpbmVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyBjb250YWluZXIgYXQgdGhlIGxvY2F0aW9uIG9mIGFuIGlkbGUgc2hpcC4gQ29udGFpbmVycyBwcm92aWRlIGNhcmdvIHN0b3JhZ2UgYnV0IGhhdmUgbm8gbG9hZGVycyBhbmQgY2Fubm90IG1vdmUgaW5kZXBlbmRlbnRseS4AAAA4Ucq8PghidXlnb29kc90BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eWdvb2RzCnN1bW1hcnk6ICdCdXkgZ29vZHMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGdvb2RzIGFuZCBhZGQgdGhlbSB0byBhIHNoaXAncyBjYXJnby4AAACguoa9PgdidXlzaGlwxgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5c2hpcApzdW1tYXJ5OiAnQnV5IGEgbmV3IHNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGEgbmV3IHNoaXCgsKZNXcO9PgxidXl3YXJlaG91c2XMAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXl3YXJlaG91c2UKc3VtbWFyeTogJ0J1eSBhIG5ldyB3YXJlaG91c2UnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGEgbmV3IHdhcmVob3VzZSBhdCB0aGUgbG9jYXRpb24gb2YgYW4gaWRsZSBzaGlwLiBXYXJlaG91c2VzIHByb3ZpZGUgY2FyZ28gc3RvcmFnZSB3aXRoIGxvYWRpbmcvdW5sb2FkaW5nIGNhcGFiaWxpdGllcyBidXQgY2Fubm90IG1vdmUuAAAAAESFpkEGY2FuY2VsxwItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2FuY2VsCnN1bW1hcnk6ICdDYW5jZWwgc2NoZWR1bGVkIHRhc2tzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYW5jZWwgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGFza3MgZnJvbSB0aGUgZW5kIG9mIGFuIGVudGl0eSdzIHNjaGVkdWxlLiBUYXNrcyB0aGF0IGFyZSBpbW11dGFibGUgYW5kIGluIHByb2dyZXNzIGNhbm5vdCBiZSBjYW5jZWxsZWQuCgotLS0AgIrH5GtURApjbGVhcnRhYmxlvgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2xlYXJ0YWJsZQpzdW1tYXJ5OiAnREVCVUc6IGNsZWFydGFibGUgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAAAAAGQnJUUGY29tbWl08QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY29tbWl0CnN1bW1hcnk6ICdTZXQgY29tbWl0IHZhbHVlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTZXQgdGhlIGluaXRpYWwgY29tbWl0IHZhbHVlIGR1cmluZyBnYW1lIGluaXRpYWxpemF0aW9uLgoKLS0tAAAAAKh4zFQGZW5hYmxl4gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZW5hYmxlCnN1bW1hcnk6ICdTZXQgZW5hYmxlZCBzdGF0ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRW5hYmxlIG9yIGRpc2FibGUgdGhpcyBnYW1lIG9mIFNoaXBsb2FkLgoKLS0tAAAAICNzc1cHZXh0cmFjdKADLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGV4dHJhY3QKc3VtbWFyeTogJ0V4dHJhY3QgcmVzb3VyY2VzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpFeHRyYWN0IHJlc291cmNlcyBhdCB0aGUgc2hpcCdzIGN1cnJlbnQgbG9jYXRpb24uIE9ubHkgd29ya3MgYXQgZXh0cmFjdGFibGUgbG9jYXRpb24gdHlwZXMuIFNjaGVkdWxlcyBhbiBleHRyYWN0aW9uIHRhc2sgdGhhdCBjb25zdW1lcyBlbmVyZ3kgYW5kIHlpZWxkcyBjYXJnbyBiYXNlZCBvbiB0aGUgc2hpcCdzIGV4dHJhY3RvciBzdGF0cyBhbmQgdGhlIGxvY2F0aW9uJ3MgbWl4dHVyZSBjb21wb3NpdGlvbi4AsHLZ5amyYgtnZXRlbnRpdGllc6QCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGVudGl0aWVzCnN1bW1hcnk6ICdHZXQgYWxsIGVudGl0aWVzIGZvciBhIHBsYXllcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyBmdWxsIGVudGl0eSBpbmZvIGZvciBhbGwgZW50aXRpZXMgb3duZWQgYnkgYSBwbGF5ZXIuIE9wdGlvbmFsbHkgZmlsdGVyIGJ5IGVudGl0eSB0eXBlLgAA8NnlqbJiCWdldGVudGl0eaICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGVudGl0eQpzdW1tYXJ5OiAnR2V0IGVudGl0eSBzdGF0ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyB0aGUgY3VycmVudCBzdGF0ZSBvZiBhbiBlbnRpdHkgaW5jbHVkaW5nIGlkZW50aXR5LCBjYXJnbywgc2NoZWR1bGUgc3RhdGUsIGFuZCB0eXBlLXNwZWNpZmljIGZpZWxkcy4AAAA4UcqyYghnZXRnb29kc6oCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGdvb2RzCnN1bW1hcnk6ICdHZXQgYWxsIGF2YWlsYWJsZSBnb29kcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBhIGxpc3Qgb2YgYWxsIHRyYWRlYWJsZSBnb29kcyBpbiB0aGUgZ2FtZSBpbmNsdWRpbmcgdGhlaXIgaWQsIG5hbWUsIGJhc2UgcHJpY2UsIGFuZCBtYXNzLgAmddkgGrNiC2dldGxvY2F0aW9u4gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bG9jYXRpb24Kc3VtbWFyeTogJ0dldCBsb2NhdGlvbiBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCBhIGxvY2F0aW9uIGluY2x1ZGluZyB3aGV0aGVyIGEgc3lzdGVtIGV4aXN0cywgYW5kIGZvciBlYWNoIGdvb2Q6IHByaWNlLCBzdXBwbHksIHJhcml0eSBtdWx0aXBsaWVyLCBhbmQgbG9jYXRpb24gbXVsdGlwbGllci4AgMkmIRqzYgpnZXRsb2NkYXRh/gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bG9jZGF0YQpzdW1tYXJ5OiAnR2V0IGRlcml2ZWQgbG9jYXRpb24gZGF0YScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBkZXJpdmVkIGxvY2F0aW9uIGRhdGEgaW5jbHVkaW5nIHN0YXRpYyBwcm9wZXJ0aWVzICh0eXBlLCBkaWZmaWN1bHR5LCBzZWVkcykgZnJvbSB0aGUgZ2FtZSBzZWVkIGFuZCBlcG9jaC1zcGVjaWZpYyBwcm9wZXJ0aWVzIChhY3RpdmUsIHNlZWRzKSBmcm9tIHRoZSBjdXJyZW50IGVwb2NoIHNlZWQuAADw5xo1s2IJZ2V0bmVhcmJ53gMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bmVhcmJ5CnN1bW1hcnk6ICdHZXQgbmVhcmJ5IHJlYWNoYWJsZSBzeXN0ZW1zJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIG5lYXJieSBzeXN0ZW1zIHJlYWNoYWJsZSBieSBhbiBlbnRpdHkgZnJvbSBpdHMgcHJvamVjdGVkIGxvY2F0aW9uLiBSZXR1cm5zIGN1cnJlbnQgc3RhdGUgKHdpdGggY29tcGxldGVkIHRhc2tzIHJlc29sdmVkKSwgcHJvamVjdGVkIHN0YXRlIChhZnRlciBhbGwgc2NoZWR1bGVkIHRhc2tzKSwgYW5kIGEgbGlzdCBvZiByZWFjaGFibGUgc3lzdGVtcyB3aXRoIGRpc3RhbmNlLCBlbmVyZ3kgY29zdCwgZmxpZ2h0IHRpbWUsIGFuZCBtYXJrZXQgaW5mb3JtYXRpb24uAAC4yptYs2IJZ2V0cGxheWVy/QItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0cGxheWVyCnN1bW1hcnk6ICdHZXQgcGxheWVyIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IGEgcGxheWVyIGluY2x1ZGluZyBiYWxhbmNlLCBkZWJ0LCBuZXR3b3J0aCwgZW50aXR5IGNvdW50cywgYW5kIHByaWNpbmcgZm9yIG5leHQgcHVyY2hhc2VzLiBSZXR1cm5zIGlzX3BsYXllcj1mYWxzZSBpZiB0aGUgYWNjb3VudCBoYXMgbm90IGpvaW5lZCB0aGUgZ2FtZS4AwFX5moyzYgpnZXRzdGFydGVyhQMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0c3RhcnRlcgpzdW1tYXJ5OiAnR2V0IHN0YXJ0ZXIgc2hpcCBhbmQgYmFsYW5jZSBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyB0aGUgc3RhcnRlciBzaGlwIHN0YXRzIGFuZCBpbml0aWFsIGJhbGFuY2UgYSBuZXcgcGxheWVyIHdvdWxkIHJlY2VpdmUgdXBvbiBqb2luaW5nLiBVc2VkIGZvciBvbmJvYXJkaW5nIFVJIHRvIGRpc3BsYXkgd2hhdCBwbGF5ZXJzIHdpbGwgZ2V0IGJlZm9yZSB0aGV5IHJlZ2lzdGVyLoCVu0ZKjbNiDGdldHN1bW1hcmllc+gCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldHN1bW1hcmllcwpzdW1tYXJ5OiAnR2V0IGVudGl0eSBzdW1tYXJpZXMgZm9yIGEgcGxheWVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm5zIGxpZ2h0d2VpZ2h0IHN1bW1hcmllcyBvZiBhbGwgZW50aXRpZXMgb3duZWQgYnkgYSBwbGF5ZXIgaW5jbHVkaW5nIHR5cGUsIGlkLCBvd25lciwgbmFtZSwgbG9jYXRpb24sIGFuZCBpZGxlIHN0YXR1cy4gT3B0aW9uYWxseSBmaWx0ZXIgYnkgZW50aXR5IHR5cGUuAKLa5uaq6WULZ3JvdXB0cmF2ZWyaBC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBncm91cHRyYXZlbApzdW1tYXJ5OiAnTW92ZSBtdWx0aXBsZSBlbnRpdGllcyB0b2dldGhlcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW5pdGlhdGUgZ3JvdXAgdHJhdmVsIGZvciBtdWx0aXBsZSBlbnRpdGllcyB0byBhIGRlc3RpbmF0aW9uLiBBbGwgZW50aXRpZXMgbXVzdCBiZSBhdCB0aGUgc2FtZSBsb2NhdGlvbiBhbmQgb3duZWQgYnkgdGhlIGNhbGxlci4gQXQgbGVhc3Qgb25lIGVudGl0eSB3aXRoIGVuZ2luZXMgaXMgcmVxdWlyZWQgdG8gcHJvdmlkZSB0aHJ1c3QuIEZsaWdodCBkdXJhdGlvbiBpcyBjYWxjdWxhdGVkIGZyb20gY29tYmluZWQgdGhydXN0IGFuZCB0b3RhbCBtYXNzIG9mIGFsbCBlbnRpdGllcy4gQ3JlYXRlcyBhbiBlbnRpdHlncm91cCBmb3IgYXRvbWljIHJlc29sdXRpb24gYW5kIGNhbmNlbGxhdGlvbi4AAAAAANCwaQRoYXNo/QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaGFzaApzdW1tYXJ5OiAnQ2FsY3VsYXRlIHNoYTI1NiBoYXNoJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGVzIHRoZSBzaGEyNTYgaGFzaCBvZiBhIHN0cmluZyBiYXNlZCB1c2luZyB0aGUgZ2FtZSBzZWVkLgoKLS0tAAAAQITSsGkHaGFzaDUxMvsBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGhhc2g1MTIKc3VtbWFyeTogJ0NhbGN1bGF0ZSBzaGE1MTIgaGFzaCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlcyB0aGUgc2hhNTEyIGhhc2ggb2YgYSBzdHJpbmcgYmFzZWQgdXNpbmcgdGhlIGdhbWUgc2VlZC4AAAAAAJDddARpbml0+gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaW5pdApzdW1tYXJ5OiAnSW5pdGlhbGl6ZSBnYW1lIHNlZWQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYWxpemUgYSB0aGUgZ2FtZXMgc2VlZCBhbmQgc2VlZCB2YWx1ZXMgdG8gYm9vdHN0cmFwIGdhbWUgc3RhdGUuAAAAAAAwHX0Eam9pbskBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGpvaW4Kc3VtbWFyeTogJ0pvaW4gYSBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpKb2luIGEgZ2FtZSBvZiBTaGlwbG9hZAoKLS0tAAAAAPjlMp0Gbm90aWZ5igMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogbm90aWZ5CnN1bW1hcnk6ICdUYXNrIGxpZmVjeWNsZSBub3RpZmljYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkludGVybmFsIGFjdGlvbiB0aGF0IG5vdGlmaWVzIGVudGl0eSBvd25lcnMgb2YgdGFzayBsaWZlY3ljbGUgZXZlbnRzIChyZXNvbHZlZCwgY2FuY2VsbGVkKS4gQ2FsbGVkIGlubGluZSB3aGVuIHRhc2tzIGNoYW5nZSBzdGF0ZS4gVXNlcyByZXF1aXJlX3JlY2lwaWVudCB0byBlbmFibGUgb2ZmLWNoYWluIG1vbml0b3JpbmcgdmlhIGFjdGlvbiB0cmFjZXMuAAAAYBoavakHcGF5bG9hbq8BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHBheWxvYW4Kc3VtbWFyeTogJ0xvYW4gUGF5bWVudCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQB8rFVjxa6uC3B1cmdlc3VwcGx56QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcHVyZ2VzdXBwbHkKc3VtbWFyeTogJ1VwZGF0ZSBHYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJnZSBvbGQgc3VwcGx5IHJlY29yZHMgYW5kIGhlbHAgY2xlYW51cCBnYW1lIHN0YXRlLgAAAIpd05C6CHJlY2hhcmdl0gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcmVjaGFyZ2UKc3VtbWFyeTogJ1JlY2hhcmdlIHNoaXAgZW5lcmd5JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTY2hlZHVsZSBhIHJlY2hhcmdlIHRhc2sgZm9yIGFuIGVudGl0eSB0byByZXN0b3JlIGVuZXJneSB0byBmdWxsIGNhcGFjaXR5LiBUaGUgcmVjaGFyZ2UgZHVyYXRpb24gZGVwZW5kcyBvbiBjdXJyZW50IGVuZXJneSBsZXZlbCBhbmQgcmVjaGFyZ2UgcmF0ZS4KCi0tLQAAAEDtSLG6B3Jlc29sdmXVAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiByZXNvbHZlCnN1bW1hcnk6ICdDb21wbGV0ZSBzY2hlZHVsZWQgdGFza3MnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJlc29sdmUgY29tcGxldGVkIHRhc2tzIGluIGFuIGVudGl0eSdzIHNjaGVkdWxlLCBhcHBseWluZyB0aGVpciBlZmZlY3RzIChyZWNoYXJnZSBlbmVyZ3ksIHVwZGF0ZSBsb2NhdGlvbiwgbG9hZC91bmxvYWQgY2FyZ28pLiBJZiBjb3VudCBpcyBzcGVjaWZpZWQsIHJlc29sdmUgZXhhY3RseSB0aGF0IG1hbnkgdGFza3M7IG90aGVyd2lzZSByZXNvbHZlIGFsbCBjb21wbGV0ZWQgdGFza3MuIEZhaWxzIGlmIGNvdW50IGV4Y2VlZHMgdGhlIG51bWJlciBvZiBjb21wbGV0ZWQgdGFza3MuCgotLS0AAAAAAJCjwQRzYWx03QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2FsdApzdW1tYXJ5OiAnQXBwZW5kIFNhbHQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkZCBhZGRpdGlvbmFsIHNhbHQgdG8gdGhlIG5leHQgZXBvY2ggc2VlZC4KCi0tLQAAwIlSFqPCCXNlbGxnb29kc9UBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNlbGxnb29kcwpzdW1tYXJ5OiAnU2VsbCBnb29kcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2VsbCBnb29kcyBmcm9tIGEgc2hpcCdzIGNhcmdvLgoKLS0tAAAA09CooMkIdGFrZWxvYW7qAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0YWtlbG9hbgpzdW1tYXJ5OiAnQ3JlZGl0IExvYW4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkJvcnJvdyBjcmVkaXRzIGZyb20gdGhlIGJhbmsgdGhhdCB3aWxsIG5lZWQgdG8gYmUgcmVwYWlkLgAAAFctPM3NCHRyYW5zZmVyyAMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdHJhbnNmZXIKc3VtbWFyeTogJ1RyYW5zZmVyIGNhcmdvIGJldHdlZW4gZW50aXRpZXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRyYW5zZmVyIGNhcmdvIGJldHdlZW4gdHdvIGVudGl0aWVzIGF0IHRoZSBzYW1lIGxvY2F0aW9uLiBCb3RoIGVudGl0aWVzIG11c3QgYmUgb3duZWQgYnkgdGhlIGNhbGxlciBhbmQgYXQgbGVhc3Qgb25lIG11c3QgaGF2ZSBsb2FkZXJzLiBDcmVhdGVzIGxvYWQgYW5kIHVubG9hZCB0YXNrcyBvbiBib3RoIGVudGl0aWVzIHdpdGggZHVyYXRpb24gYmFzZWQgb24gY29tYmluZWQgbG9hZGVyIGNhcGFjaXR5IGFuZCBaLWRpc3RhbmNlIGJldHdlZW4gdGhlbS4AAAAARLXNzQZ0cmF2ZWzLAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWwKc3VtbWFyeTogJ01vdmUgYSBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWF0ZSB0cmF2ZWwgb2YgYW4gZW50aXR5IGZyb20gaXRzIGN1cnJlbnQgbG9jYXRpb24gdG8gYSBuZXcgZGVzdGluYXRpb24uCgotLS0KClRoaXMgYWN0aW9uIGRldGVybWluZXMgdGhlIG1hcmtldCBwcmljZSBvZiBhbGwgZ29vZHMgYXQgYSBnaXZlbiBsb2NhdGlvbi6QXVIXqWxS1Qx1cGRhdGVjcmVkaXTCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1cGRhdGVjcmVkaXQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVjcmVkaXQgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAEA+KqlsUtUKdXBkYXRlZGVidL4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVwZGF0ZWRlYnQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVkZWJ0IGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAAAAoKrjBHdpcGWyAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlCnN1bW1hcnk6ICdERUJVRzogd2lwZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS2g0FTaKqyq4wx3aXBlc2VxdWVuY2XCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlc2VxdWVuY2UKc3VtbWFyeTogJ0RFQlVHOiB3aXBlc2VxdWVuY2UgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCwAAAAAAyq5BA2k2NAAACWNhcmdvX3JvdwAAuGo6kydFA2k2NAAADWNvbnRhaW5lcl9yb3cAqqaX+ezyVANpNjQAAA9lbnRpdHlncm91cF9yb3cAAACTumwQjQNpNjQAAAxsb2NhdGlvbl9yb3cAAAAAXOVNrANpNjQAAApwbGF5ZXJfcm93AAAACk2lrcIDaTY0AAAMc2VxdWVuY2Vfcm93AAAAAABQXcMDaTY0AAAIc2hpcF9yb3cAAAAAAJVNxgNpNjQAAAlzdGF0ZV9yb3cAAAAA+FirxgNpNjQAAApzdXBwbHlfcm93AAAAAACsqs8DaTY0AAAJdHlwZXNfcm93AABQWNOmruEDaTY0AAANd2FyZWhvdXNlX3JvdwERU2hpcGxvYWQgKFNlcnZlcikRU2hpcGxvYWQgKFNlcnZlcikAAAAUAAAAOFHKvD4MdGFza19yZXN1bHRzAAAAAESFpkEOY2FuY2VsX3Jlc3VsdHMAAAAgI3NzVwx0YXNrX3Jlc3VsdHMAsHLZ5amyYg1lbnRpdHlfaW5mb1tdAADw2eWpsmILZW50aXR5X2luZm8AAAA4UcqyYgpnb29kc19pbmZvACZ12SAas2INbG9jYXRpb25faW5mbwCAySYhGrNiEGxvY2F0aW9uX2Rlcml2ZWQAAPDnGjWzYgtuZWFyYnlfaW5mbwAAuMqbWLNiC3BsYXllcl9pbmZvAMBV+ZqMs2IMc3RhcnRlcl9pbmZvgJW7RkqNs2IQZW50aXR5X3N1bW1hcnlbXQCi2ubmqullDHRhc2tfcmVzdWx0cwAAAAAA0LBpC2NoZWNrc3VtMjU2AAAAQITSsGkLY2hlY2tzdW01MTIAAACKXdOQugx0YXNrX3Jlc3VsdHMAAABA7Uixug9yZXNvbHZlX3Jlc3VsdHMAAMCJUhajwgx0YXNrX3Jlc3VsdHMAAABXLTzNzQx0YXNrX3Jlc3VsdHMAAAAARLXNzQx0YXNrX3Jlc3VsdHM='
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
    @Struct.type('buycontainer')
    export class buycontainer extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(UInt64)
        declare ship_id: UInt64
        @Struct.field('string')
        declare name: string
    }
    @Struct.type('buygoods')
    export class buygoods extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
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
    @Struct.type('entity_ref')
    export class entity_ref extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare entity_id: UInt64
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
        @Struct.field(UInt64, {optional: true})
        declare entitygroup?: UInt64
        @Struct.field(entity_ref, {array: true, optional: true})
        declare group_members?: entity_ref[]
    }
    @Struct.type('mixture_component')
    export class mixture_component extends Struct {
        @Struct.field(UInt16)
        declare good_id: UInt16
        @Struct.field(UInt16)
        declare purity: UInt16
    }
    @Struct.type('mixture_info')
    export class mixture_info extends Struct {
        @Struct.field(mixture_component, {array: true})
        declare components: mixture_component[]
    }
    @Struct.type('cargo_item')
    export class cargo_item extends Struct {
        @Struct.field(UInt16)
        declare good_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
        @Struct.field(UInt64)
        declare unit_cost: UInt64
        @Struct.field(mixture_info, {optional: true})
        declare mixture?: mixture_info
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
    @Struct.type('coordinates')
    export class coordinates extends Struct {
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
        @Struct.field(UInt16, {optional: true})
        declare z?: UInt16
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
        declare coordinates?: coordinates
        @Struct.field(cargo_item, {array: true})
        declare cargo: cargo_item[]
        @Struct.field(entity_ref, {optional: true})
        declare entitytarget?: entity_ref
        @Struct.field(UInt64, {optional: true})
        declare entitygroup?: UInt64
        @Struct.field(Int64, {optional: true})
        declare credits?: Int64
        @Struct.field(UInt16, {optional: true})
        declare energy_cost?: UInt16
    }
    @Struct.type('schedule')
    export class schedule extends Struct {
        @Struct.field(TimePoint)
        declare started: TimePoint
        @Struct.field(task, {array: true})
        declare tasks: task[]
    }
    @Struct.type('container_row')
    export class container_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Name)
        declare owner: Name
        @Struct.field('string')
        declare name: string
        @Struct.field(coordinates)
        declare coordinates: coordinates
        @Struct.field(UInt32)
        declare hullmass: UInt32
        @Struct.field(UInt32)
        declare capacity: UInt32
        @Struct.field(UInt32)
        declare cargomass: UInt32
        @Struct.field(schedule, {optional: true})
        declare schedule?: schedule
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
    @Struct.type('entity_current_state')
    export class entity_current_state extends Struct {
        @Struct.field(coordinates)
        declare coordinates: coordinates
        @Struct.field(UInt16)
        declare energy: UInt16
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
    @Struct.type('extractor_stats')
    export class extractor_stats extends Struct {
        @Struct.field(UInt16)
        declare rate: UInt16
        @Struct.field(UInt16)
        declare drain: UInt16
        @Struct.field(UInt16)
        declare efficiency: UInt16
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
        declare coordinates: coordinates
        @Struct.field(UInt32)
        declare cargomass: UInt32
        @Struct.field(cargo_item, {array: true})
        declare cargo: cargo_item[]
        @Struct.field(loader_stats, {optional: true})
        declare loaders?: loader_stats
        @Struct.field(UInt16, {optional: true})
        declare energy?: UInt16
        @Struct.field(UInt32, {optional: true})
        declare hullmass?: UInt32
        @Struct.field(movement_stats, {optional: true})
        declare engines?: movement_stats
        @Struct.field(energy_stats, {optional: true})
        declare generator?: energy_stats
        @Struct.field(UInt32, {optional: true})
        declare capacity?: UInt32
        @Struct.field(extractor_stats, {optional: true})
        declare extractor?: extractor_stats
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
        declare coordinates: coordinates
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
    @Struct.type('entitygroup_row')
    export class entitygroup_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(entity_ref, {array: true})
        declare participants: entity_ref[]
    }
    @Struct.type('extract')
    export class extract extends Struct {
        @Struct.field(UInt64)
        declare ship_id: UInt64
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
    @Struct.type('getlocdata')
    export class getlocdata extends Struct {
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
    @Struct.type('getstarter')
    export class getstarter extends Struct {}
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
    @Struct.type('grouptravel')
    export class grouptravel extends Struct {
        @Struct.field(entity_ref, {array: true})
        declare entities: entity_ref[]
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
        @Struct.field('bool')
        declare recharge: boolean
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
    @Struct.type('location_static')
    export class location_static extends Struct {
        @Struct.field(coordinates)
        declare coords: coordinates
        @Struct.field(UInt8)
        declare type: UInt8
        @Struct.field(UInt8)
        declare subtype: UInt8
        @Struct.field(UInt8)
        declare seed0: UInt8
        @Struct.field(UInt8)
        declare seed1: UInt8
    }
    @Struct.type('location_epoch')
    export class location_epoch extends Struct {
        @Struct.field('bool')
        declare active: boolean
        @Struct.field(UInt8)
        declare seed0: UInt8
        @Struct.field(UInt8)
        declare seed1: UInt8
    }
    @Struct.type('location_derived')
    export class location_derived extends Struct {
        @Struct.field(location_static)
        declare static_props: location_static
        @Struct.field(location_epoch)
        declare epoch_props: location_epoch
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
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(coordinates)
        declare coordinates: coordinates
        @Struct.field(UInt32)
        declare cargomass: UInt32
        @Struct.field(cargo_item, {array: true})
        declare cargo: cargo_item[]
        @Struct.field(schedule, {optional: true})
        declare schedule?: schedule
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
        @Struct.field(entity_current_state)
        declare current: entity_current_state
        @Struct.field(entity_current_state)
        declare projected: entity_current_state
        @Struct.field(UInt16)
        declare max_energy: UInt16
        @Struct.field(nearby_system, {array: true})
        declare systems: nearby_system[]
    }
    @Struct.type('task_event')
    export class task_event extends Struct {
        @Struct.field(UInt8)
        declare event_type: UInt8
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
        declare starts_at: TimePoint
        @Struct.field(TimePoint)
        declare completes_at: TimePoint
        @Struct.field(UInt16, {optional: true})
        declare new_energy?: UInt16
        @Struct.field(coordinates, {optional: true})
        declare new_coordinates?: coordinates
        @Struct.field(Int64)
        declare cargomass_delta: Int64
        @Struct.field(cargo_item, {array: true})
        declare cargo_added: cargo_item[]
        @Struct.field(cargo_item, {array: true})
        declare cargo_removed: cargo_item[]
        @Struct.field(Int64, {optional: true})
        declare credits?: Int64
    }
    @Struct.type('notify')
    export class notify extends Struct {
        @Struct.field(task_event)
        declare event: task_event
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
        declare next_container_price: UInt64
        @Struct.field(UInt64)
        declare ship_count: UInt64
        @Struct.field(UInt64)
        declare warehouse_count: UInt64
        @Struct.field(UInt64)
        declare container_count: UInt64
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
        @Struct.field(UInt64, {optional: true})
        declare count?: UInt64
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
        @Struct.field(UInt64, {optional: true})
        declare entitygroup?: UInt64
        @Struct.field(entity_ref, {array: true, optional: true})
        declare group_members?: entity_ref[]
    }
    @Struct.type('salt')
    export class salt extends Struct {
        @Struct.field(UInt64)
        declare salt: UInt64
    }
    @Struct.type('sellgoods')
    export class sellgoods extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
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
    @Struct.type('trade_stats')
    export class trade_stats extends Struct {
        @Struct.field(UInt16)
        declare margin: UInt16
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
        declare coordinates: coordinates
        @Struct.field(UInt32)
        declare hullmass: UInt32
        @Struct.field(UInt32)
        declare capacity: UInt32
        @Struct.field(UInt16)
        declare energy: UInt16
        @Struct.field(UInt32)
        declare cargomass: UInt32
        @Struct.field(movement_stats)
        declare engines: movement_stats
        @Struct.field(energy_stats)
        declare generator: energy_stats
        @Struct.field(loader_stats)
        declare loaders: loader_stats
        @Struct.field(trade_stats, {optional: true})
        declare trade?: trade_stats
        @Struct.field(extractor_stats, {optional: true})
        declare extractor?: extractor_stats
        @Struct.field(schedule, {optional: true})
        declare schedule?: schedule
    }
    @Struct.type('starter_info')
    export class starter_info extends Struct {
        @Struct.field(UInt64)
        declare balance: UInt64
        @Struct.field(UInt64)
        declare debt: UInt64
        @Struct.field(entity_info)
        declare ship: entity_info
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
    @Struct.type('supply_row')
    export class supply_row extends Struct {
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
        @Struct.field(starter_info)
        declare starter_info_type: starter_info
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
        declare coordinates: coordinates
        @Struct.field(UInt32)
        declare capacity: UInt32
        @Struct.field(UInt32)
        declare cargomass: UInt32
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
    container: Types.container_row,
    entitygroup: Types.entitygroup_row,
    location: Types.location_row,
    player: Types.player_row,
    sequence: Types.sequence_row,
    ship: Types.ship_row,
    state: Types.state_row,
    supply: Types.supply_row,
    types: Types.types_row,
    warehouse: Types.warehouse_row,
}
export interface TableTypes {
    cargo: Types.cargo_row
    container: Types.container_row
    entitygroup: Types.entitygroup_row
    location: Types.location_row
    player: Types.player_row
    sequence: Types.sequence_row
    ship: Types.ship_row
    state: Types.state_row
    supply: Types.supply_row
    types: Types.types_row
    warehouse: Types.warehouse_row
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {
        export interface entity_ref {
            entity_type: NameType
            entity_id: UInt64Type
        }
        export interface task_event {
            event_type: UInt8Type
            owner: NameType
            entity_type: NameType
            entity_id: UInt64Type
            task_index: UInt8Type
            task: Type.task
            starts_at: TimePointType
            completes_at: TimePointType
            new_energy?: UInt16Type
            new_coordinates?: Type.coordinates
            cargomass_delta: Int64Type
            cargo_added: Type.cargo_item[]
            cargo_removed: Type.cargo_item[]
            credits?: Int64Type
        }
        export interface task {
            type: UInt8Type
            duration: UInt32Type
            cancelable: UInt8Type
            coordinates?: Type.coordinates
            cargo: Type.cargo_item[]
            entitytarget?: Type.entity_ref
            entitygroup?: UInt64Type
            credits?: Int64Type
            energy_cost?: UInt16Type
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
            mixture?: Type.mixture_info
        }
        export interface mixture_info {
            components: Type.mixture_component[]
        }
        export interface mixture_component {
            good_id: UInt16Type
            purity: UInt16Type
        }
    }
    export interface advance {
        reveal: string
        commit: Checksum256Type
    }
    export interface buycontainer {
        account: NameType
        ship_id: UInt64Type
        name: string
    }
    export interface buygoods {
        entity_type: NameType
        id: UInt64Type
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
    export interface extract {
        ship_id: UInt64Type
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
    export interface getlocdata {
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
    export interface getstarter {}
    export interface getsummaries {
        owner: NameType
        entity_type?: NameType
    }
    export interface grouptravel {
        entities: Type.entity_ref[]
        x: Int64Type
        y: Int64Type
        recharge: boolean
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
    export interface notify {
        event: Type.task_event
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
        count?: UInt64Type
    }
    export interface salt {
        salt: UInt64Type
    }
    export interface sellgoods {
        entity_type: NameType
        id: UInt64Type
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
    buycontainer: ActionParams.buycontainer
    buygoods: ActionParams.buygoods
    buyship: ActionParams.buyship
    buywarehouse: ActionParams.buywarehouse
    cancel: ActionParams.cancel
    cleartable: ActionParams.cleartable
    commit: ActionParams.commit
    enable: ActionParams.enable
    extract: ActionParams.extract
    getentities: ActionParams.getentities
    getentity: ActionParams.getentity
    getgoods: ActionParams.getgoods
    getlocation: ActionParams.getlocation
    getlocdata: ActionParams.getlocdata
    getnearby: ActionParams.getnearby
    getplayer: ActionParams.getplayer
    getstarter: ActionParams.getstarter
    getsummaries: ActionParams.getsummaries
    grouptravel: ActionParams.grouptravel
    hash: ActionParams.hash
    hash512: ActionParams.hash512
    init: ActionParams.init
    join: ActionParams.join
    notify: ActionParams.notify
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
    extract: Types.task_results
    getentities: Types.entity_info[]
    getentity: Types.entity_info
    getgoods: Types.goods_info
    getlocation: Types.location_info
    getlocdata: Types.location_derived
    getnearby: Types.nearby_info
    getplayer: Types.player_info
    getstarter: Types.starter_info
    getsummaries: Types.entity_summary[]
    grouptravel: Types.task_results
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
