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
    'DmVvc2lvOjphYmkvMS4yAhVCX3ZlY3Rvcl9lbnRpdHlfcmVmX0UMZW50aXR5X3JlZltdDWxvY2F0aW9uX3R5cGUFdWludDhUB2FkdmFuY2UAAgZyZXZlYWwGc3RyaW5nBmNvbW1pdAtjaGVja3N1bTI1NgxidXljb250YWluZXIAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcIYnV5aXRlbXMABAtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIHYnV5c2hpcAACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwxidXl3YXJlaG91c2UAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcGY2FuY2VsAAMLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQFY291bnQGdWludDY0DmNhbmNlbF9yZXN1bHRzAAYJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lD2NhbmNlbGxlZF9jb3VudAV1aW50OBBzY2hlZHVsZV9zdGFydGVkC3RpbWVfcG9pbnQ/C2VudGl0eWdyb3VwB3VpbnQ2ND8NZ3JvdXBfbWVtYmVycxZCX3ZlY3Rvcl9lbnRpdHlfcmVmX0U/CmNhcmdvX2l0ZW0ABAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIJdW5pdF9jb3N0BnVpbnQ2NARzZWVkB3VpbnQ2ND8JY2FyZ29fcm93AAYCaWQGdWludDY0CWVudGl0eV9pZAZ1aW50NjQHaXRlbV9pZAZ1aW50NjQIcXVhbnRpdHkGdWludDY0CXVuaXRfY29zdAZ1aW50NjQEc2VlZAZ1aW50NjQJY2xlYW5yc3ZwAAIFZXBvY2gGdWludDY0CG1heF9yb3dzBnVpbnQ2NApjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8GY29tbWl0AAEGY29tbWl0C2NoZWNrc3VtMjU2CWNvbmZpZ2xvZwABBmNvbmZpZwtnYW1lX2NvbmZpZw1jb250YWluZXJfcm93AAgCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIaHVsbG1hc3MGdWludDMyCGNhcGFjaXR5BnVpbnQzMgljYXJnb21hc3MGdWludDMyCHNjaGVkdWxlCXNjaGVkdWxlPwtjb29yZGluYXRlcwADAXgFaW50NjQBeQVpbnQ2NAF6B3VpbnQxNj8GZW5hYmxlAAEHZW5hYmxlZARib29sDGVuZXJneV9zdGF0cwACCGNhcGFjaXR5BnVpbnQxNghyZWNoYXJnZQZ1aW50MTYUZW50aXR5X2N1cnJlbnRfc3RhdGUAAgtjb29yZGluYXRlcwtjb29yZGluYXRlcwZlbmVyZ3kGdWludDE2D2VudGl0eV9kZWZhdWx0cwAPDXNoaXBfaHVsbG1hc3MGdWludDMyDXNoaXBfY2FwYWNpdHkGdWludDMyC3NoaXBfZW5lcmd5BnVpbnQxNgZzaGlwX3oGdWludDE2DHNoaXBfZW5naW5lcw5tb3ZlbWVudF9zdGF0cw5zaGlwX2dlbmVyYXRvcgxlbmVyZ3lfc3RhdHMMc2hpcF9sb2FkZXJzDGxvYWRlcl9zdGF0cwpzaGlwX3RyYWRlC3RyYWRlX3N0YXRzDnNoaXBfZXh0cmFjdG9yD2V4dHJhY3Rvcl9zdGF0cxJ3YXJlaG91c2VfY2FwYWNpdHkGdWludDMyC3dhcmVob3VzZV96BnVpbnQxNhF3YXJlaG91c2VfbG9hZGVycwxsb2FkZXJfc3RhdHMSY29udGFpbmVyX2h1bGxtYXNzBnVpbnQzMhJjb250YWluZXJfY2FwYWNpdHkGdWludDMyC2NvbnRhaW5lcl96BnVpbnQxNgtlbnRpdHlfaW5mbwAVBHR5cGUEbmFtZQJpZAZ1aW50NjQFb3duZXIEbmFtZQtlbnRpdHlfbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMJY2FyZ29tYXNzBnVpbnQzMgVjYXJnbwxjYXJnb19pdGVtW10HbG9hZGVycw1sb2FkZXJfc3RhdHM/BmVuZXJneQd1aW50MTY/CGh1bGxtYXNzB3VpbnQzMj8HZW5naW5lcw9tb3ZlbWVudF9zdGF0cz8JZ2VuZXJhdG9yDWVuZXJneV9zdGF0cz8IY2FwYWNpdHkHdWludDMyPwlleHRyYWN0b3IQZXh0cmFjdG9yX3N0YXRzPwdpc19pZGxlBGJvb2wMY3VycmVudF90YXNrBXRhc2s/FGN1cnJlbnRfdGFza19lbGFwc2VkBnVpbnQzMhZjdXJyZW50X3Rhc2tfcmVtYWluaW5nBnVpbnQzMg1wZW5kaW5nX3Rhc2tzBnRhc2tbXQdpZGxlX2F0C3RpbWVfcG9pbnQ/CHNjaGVkdWxlCXNjaGVkdWxlPwplbnRpdHlfcmVmAAILZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0DmVudGl0eV9zdW1tYXJ5AAgEdHlwZQRuYW1lAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2VudGl0eV9uYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwdpc19pZGxlBGJvb2wOcmVzb2x2ZWRfY291bnQGdWludDMyDXBlbmRpbmdfY291bnQGdWludDMyEGVudGl0eV90YXNrX2luZm8ABAllbnRpdHlfaWQGdWludDY0C2VudGl0eV90eXBlBG5hbWUKdGFza19jb3VudAV1aW50OBBzY2hlZHVsZV9zdGFydGVkCnRpbWVfcG9pbnQPZW50aXR5Z3JvdXBfcm93AAICaWQGdWludDY0DHBhcnRpY2lwYW50cwxlbnRpdHlfcmVmW10HZXh0cmFjdAAEC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0B3N0cmF0dW0GdWludDE2CHF1YW50aXR5BnVpbnQzMg9leHRyYWN0b3Jfc3RhdHMABQRyYXRlBnVpbnQxNgVkcmFpbgZ1aW50MTYKZWZmaWNpZW5jeQZ1aW50MTYFZGVwdGgGdWludDE2BWRyaWxsBnVpbnQxNgtnYW1lX2NvbmZpZwADB3ZlcnNpb24GdWludDMyCGRlZmF1bHRzD2VudGl0eV9kZWZhdWx0cwVpdGVtcwppdGVtX2RlZltdCWdldGNvbmZpZwAAC2dldGVudGl0aWVzAAIFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQVuYW1lPwlnZXRlbnRpdHkAAgtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQIZ2V0aXRlbXMAAAtnZXRsb2NhdGlvbgACAXgFaW50NjQBeQVpbnQ2NApnZXRsb2NkYXRhAAIBeAVpbnQ2NAF5BWludDY0CWdldG5lYXJieQADC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhyZWNoYXJnZQRib29sCWdldHBsYXllcgABB2FjY291bnQEbmFtZQpnZXRzdGFydGVyAAAMZ2V0c3VtbWFyaWVzAAIFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQVuYW1lPwtncm91cHRyYXZlbAAECGVudGl0aWVzDGVudGl0eV9yZWZbXQF4BWludDY0AXkFaW50NjQIcmVjaGFyZ2UEYm9vbARoYXNoAAEFdmFsdWUGc3RyaW5nB2hhc2g1MTIAAQV2YWx1ZQZzdHJpbmcEaW5pdAABBHNlZWQLY2hlY2tzdW0yNTYIaXRlbV9kZWYAAwJpZAZ1aW50MTYKYmFzZV9wcmljZQZ1aW50MzIEbWFzcwZ1aW50MzIKaXRlbXNfaW5mbwABBWl0ZW1zCml0ZW1fZGVmW10Eam9pbgABB2FjY291bnQEbmFtZQxsb2FkZXJfc3RhdHMAAwRtYXNzBnVpbnQzMgZ0aHJ1c3QGdWludDE2CHF1YW50aXR5BXVpbnQ4EGxvY2F0aW9uX2Rlcml2ZWQAAgxzdGF0aWNfcHJvcHMPbG9jYXRpb25fc3RhdGljC2Vwb2NoX3Byb3BzDmxvY2F0aW9uX2Vwb2NoDmxvY2F0aW9uX2Vwb2NoAAMGYWN0aXZlBGJvb2wFc2VlZDAFdWludDgFc2VlZDEFdWludDgNbG9jYXRpb25faW5mbwADBmNvb3Jkcwtjb29yZGluYXRlcwlpc19zeXN0ZW0EYm9vbAVpdGVtcw9sb2NhdGlvbl9pdGVtW10NbG9jYXRpb25faXRlbQAFAmlkBnVpbnQxNgVwcmljZQZ1aW50MzIGc3VwcGx5BnVpbnQxNhFyYXJpdHlfbXVsdGlwbGllcgZ1aW50MzITbG9jYXRpb25fbXVsdGlwbGllcgZ1aW50MzIMbG9jYXRpb25fcm93AAYCaWQGdWludDY0BW93bmVyBG5hbWULY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMJY2FyZ29tYXNzBnVpbnQzMgVjYXJnbwxjYXJnb19pdGVtW10Ic2NoZWR1bGUJc2NoZWR1bGU/D2xvY2F0aW9uX3N0YXRpYwAFBmNvb3Jkcwtjb29yZGluYXRlcwR0eXBlDWxvY2F0aW9uX3R5cGUHc3VidHlwZQV1aW50OAVzZWVkMAV1aW50OAVzZWVkMQV1aW50OA5tb3ZlbWVudF9zdGF0cwACBnRocnVzdAZ1aW50MzIFZHJhaW4GdWludDE2C25lYXJieV9pbmZvAAUKY2FuX3RyYXZlbARib29sB2N1cnJlbnQUZW50aXR5X2N1cnJlbnRfc3RhdGUJcHJvamVjdGVkFGVudGl0eV9jdXJyZW50X3N0YXRlCm1heF9lbmVyZ3kGdWludDE2B3N5c3RlbXMPbmVhcmJ5X3N5c3RlbVtdDW5lYXJieV9zeXN0ZW0ABAhkaXN0YW5jZQZ1aW50NjQLZW5lcmd5X2Nvc3QGdWludDY0C2ZsaWdodF90aW1lBnVpbnQzMghsb2NhdGlvbg1sb2NhdGlvbl9pbmZvBm5vdGlmeQABBWV2ZW50CnRhc2tfZXZlbnQHcGF5bG9hbgACB2FjY291bnQEbmFtZQZhbW91bnQGdWludDY0C3BsYXllcl9pbmZvAA0Fb3duZXIEbmFtZQlpc19wbGF5ZXIEYm9vbAxjb21wYW55X25hbWUGc3RyaW5nB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDMyCG5ldHdvcnRoBWludDY0DmF2YWlsYWJsZV9sb2FuBnVpbnQ2NA9uZXh0X3NoaXBfcHJpY2UGdWludDY0FG5leHRfd2FyZWhvdXNlX3ByaWNlBnVpbnQ2NBRuZXh0X2NvbnRhaW5lcl9wcmljZQZ1aW50NjQKc2hpcF9jb3VudAZ1aW50NjQPd2FyZWhvdXNlX2NvdW50BnVpbnQ2NA9jb250YWluZXJfY291bnQGdWludDY0CnBsYXllcl9yb3cABAVvd25lcgRuYW1lB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDMyCG5ldHdvcnRoBWludDY0C3B1cmdlc3VwcGx5AAEIbWF4X3Jvd3MHdWludDY0PwhyZWNoYXJnZQACC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0C3Jlc2VydmVfcm93AAICaWQGdWludDY0CXJlbWFpbmluZwZ1aW50MzIHcmVzb2x2ZQADC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0BWNvdW50B3VpbnQ2ND8PcmVzb2x2ZV9yZXN1bHRzAAYJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lDnJlc29sdmVkX2NvdW50BXVpbnQ4FG5ld19zY2hlZHVsZV9zdGFydGVkC3RpbWVfcG9pbnQ/C2VudGl0eWdyb3VwB3VpbnQ2ND8NZ3JvdXBfbWVtYmVycxZCX3ZlY3Rvcl9lbnRpdHlfcmVmX0U/BHNhbHQAAQRzYWx0BnVpbnQ2NAhzY2hlZHVsZQACB3N0YXJ0ZWQKdGltZV9wb2ludAV0YXNrcwZ0YXNrW10Jc2VsbGl0ZW1zAAQLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQHaXRlbV9pZAZ1aW50MTYIcXVhbnRpdHkGdWludDMyDHNlcXVlbmNlX3JvdwACA2tleQRuYW1lBXZhbHVlBnVpbnQ2NAhzaGlwX3JvdwAOAmlkBnVpbnQ2NAVvd25lcgRuYW1lBG5hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCGh1bGxtYXNzBnVpbnQzMghjYXBhY2l0eQZ1aW50MzIGZW5lcmd5BnVpbnQxNgljYXJnb21hc3MGdWludDMyB2VuZ2luZXMObW92ZW1lbnRfc3RhdHMJZ2VuZXJhdG9yDGVuZXJneV9zdGF0cwdsb2FkZXJzDGxvYWRlcl9zdGF0cwV0cmFkZQx0cmFkZV9zdGF0cz8JZXh0cmFjdG9yEGV4dHJhY3Rvcl9zdGF0cz8Ic2NoZWR1bGUJc2NoZWR1bGU/DHN0YXJ0ZXJfaW5mbwADB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDY0BHNoaXALZW50aXR5X2luZm8Jc3RhdGVfcm93AAYHZW5hYmxlZARib29sBWVwb2NoBnVpbnQzMgRzYWx0BnVpbnQ2NAVzaGlwcwZ1aW50MzIEc2VlZAtjaGVja3N1bTI1NgZjb21taXQLY2hlY2tzdW0yNTYKc3VwcGx5X3JvdwAFAmlkBnVpbnQ2NAtjb29yZGluYXRlcwtjb29yZGluYXRlcwVlcG9jaAZ1aW50NjQHaXRlbV9pZAZ1aW50MTYGc3VwcGx5BnVpbnQxNgh0YWtlbG9hbgACB2FjY291bnQEbmFtZQZhbW91bnQGdWludDY0BHRhc2sACQR0eXBlBXVpbnQ4CGR1cmF0aW9uBnVpbnQzMgpjYW5jZWxhYmxlBXVpbnQ4C2Nvb3JkaW5hdGVzDGNvb3JkaW5hdGVzPwVjYXJnbwxjYXJnb19pdGVtW10MZW50aXR5dGFyZ2V0C2VudGl0eV9yZWY/C2VudGl0eWdyb3VwB3VpbnQ2ND8HY3JlZGl0cwZpbnQ2ND8LZW5lcmd5X2Nvc3QHdWludDE2Pwp0YXNrX2V2ZW50AAkKZXZlbnRfdHlwZQV1aW50OAVvd25lcgRuYW1lC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAp0YXNrX2luZGV4BXVpbnQ4BHRhc2sEdGFzawlzdGFydHNfYXQKdGltZV9wb2ludAxjb21wbGV0ZXNfYXQKdGltZV9wb2ludApuZXdfZW5lcmd5B3VpbnQxNj8MdGFza19yZXN1bHRzAAEIZW50aXRpZXMSZW50aXR5X3Rhc2tfaW5mb1tdC3RyYWRlX3N0YXRzAAEGbWFyZ2luBnVpbnQxNgh0cmFuc2ZlcgAGC3NvdXJjZV90eXBlBG5hbWUJc291cmNlX2lkBnVpbnQ2NAlkZXN0X3R5cGUEbmFtZQdkZXN0X2lkBnVpbnQ2NAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIGdHJhdmVsAAULZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQBeAVpbnQ2NAF5BWludDY0CHJlY2hhcmdlBGJvb2wJdHlwZXNfcm93AAQCaWQGdWludDY0E2VudGl0eV9zdW1tYXJ5X3R5cGUOZW50aXR5X3N1bW1hcnkRc3RhcnRlcl9pbmZvX3R5cGUMc3RhcnRlcl9pbmZvEGdhbWVfY29uZmlnX3R5cGULZ2FtZV9jb25maWcMdXBkYXRlY3JlZGl0AAIHYWNjb3VudARuYW1lBmFtb3VudAVpbnQ2NAp1cGRhdGVkZWJ0AAIHYWNjb3VudARuYW1lBmFtb3VudAVpbnQ2NA13YXJlaG91c2Vfcm93AAgCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIY2FwYWNpdHkGdWludDMyCWNhcmdvbWFzcwZ1aW50MzIHbG9hZGVycwxsb2FkZXJfc3RhdHMIc2NoZWR1bGUJc2NoZWR1bGU/BHdpcGUAAAx3aXBlc2VxdWVuY2UAACkAAABAoWl2MgdhZHZhbmNl0wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYWR2YW5jZQpzdW1tYXJ5OiAnQWR2YW5jZSB0dXJuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZHZhbmNlIHRoZSBnYW1lIHRvIHRoZSBuZXh0IHR1cm4ucNV0Jk+KvD4MYnV5Y29udGFpbmVyygItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5Y29udGFpbmVyCnN1bW1hcnk6ICdCdXkgYSBuZXcgY29udGFpbmVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyBjb250YWluZXIgYXQgdGhlIGxvY2F0aW9uIG9mIGFuIGlkbGUgc2hpcC4gQ29udGFpbmVycyBwcm92aWRlIGNhcmdvIHN0b3JhZ2UgYnV0IGhhdmUgbm8gbG9hZGVycyBhbmQgY2Fubm90IG1vdmUgaW5kZXBlbmRlbnRseS4AAABYquy8PghidXlpdGVtc90BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eWl0ZW1zCnN1bW1hcnk6ICdCdXkgaXRlbXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGl0ZW1zIGFuZCBhZGQgdGhlbSB0byBhIHNoaXAncyBjYXJnby4AAACguoa9PgdidXlzaGlwxgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5c2hpcApzdW1tYXJ5OiAnQnV5IGEgbmV3IHNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGEgbmV3IHNoaXCgsKZNXcO9PgxidXl3YXJlaG91c2XMAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXl3YXJlaG91c2UKc3VtbWFyeTogJ0J1eSBhIG5ldyB3YXJlaG91c2UnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGEgbmV3IHdhcmVob3VzZSBhdCB0aGUgbG9jYXRpb24gb2YgYW4gaWRsZSBzaGlwLiBXYXJlaG91c2VzIHByb3ZpZGUgY2FyZ28gc3RvcmFnZSB3aXRoIGxvYWRpbmcvdW5sb2FkaW5nIGNhcGFiaWxpdGllcyBidXQgY2Fubm90IG1vdmUuAAAAAESFpkEGY2FuY2VsxwItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2FuY2VsCnN1bW1hcnk6ICdDYW5jZWwgc2NoZWR1bGVkIHRhc2tzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYW5jZWwgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGFza3MgZnJvbSB0aGUgZW5kIG9mIGFuIGVudGl0eSdzIHNjaGVkdWxlLiBUYXNrcyB0aGF0IGFyZSBpbW11dGFibGUgYW5kIGluIHByb2dyZXNzIGNhbm5vdCBiZSBjYW5jZWxsZWQuCgotLS0AAKgb32lURAljbGVhbnJzdnAAAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAABkJyVFBmNvbW1pdPEBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNvbW1pdApzdW1tYXJ5OiAnU2V0IGNvbW1pdCB2YWx1ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2V0IHRoZSBpbml0aWFsIGNvbW1pdCB2YWx1ZSBkdXJpbmcgZ2FtZSBpbml0aWFsaXphdGlvbi4KCi0tLQAAYDQytyZFCWNvbmZpZ2xvZwAAAAAAqHjMVAZlbmFibGXiAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBlbmFibGUKc3VtbWFyeTogJ1NldCBlbmFibGVkIHN0YXRlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGlzIGdhbWUgb2YgU2hpcGxvYWQuCgotLS0AAAAgI3NzVwdleHRyYWN0oQMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZXh0cmFjdApzdW1tYXJ5OiAnRXh0cmFjdCByZXNvdXJjZXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkV4dHJhY3QgcmVzb3VyY2VzIGF0IHRoZSBzaGlwJ3MgY3VycmVudCBsb2NhdGlvbi4gT25seSB3b3JrcyBhdCBleHRyYWN0YWJsZSBsb2NhdGlvbiB0eXBlcy4gU2NoZWR1bGVzIGFuIGV4dHJhY3Rpb24gdGFzayB0aGF0IGNvbnN1bWVzIGVuZXJneSBhbmQgeWllbGRzIGNhcmdvIGJhc2VkIG9uIHRoZSBzaGlwJ3MgZXh0cmFjdG9yIHN0YXRzIGFuZCB0aGUgbG9jYXRpb24ncyByZXNvdXJjZSBjb21wb3NpdGlvbi4AAGBuTYqyYglnZXRjb25maWcAALBy2eWpsmILZ2V0ZW50aXRpZXOkAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRlbnRpdGllcwpzdW1tYXJ5OiAnR2V0IGFsbCBlbnRpdGllcyBmb3IgYSBwbGF5ZXInCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJldHVybnMgZnVsbCBlbnRpdHkgaW5mbyBmb3IgYWxsIGVudGl0aWVzIG93bmVkIGJ5IGEgcGxheWVyLiBPcHRpb25hbGx5IGZpbHRlciBieSBlbnRpdHkgdHlwZS4AAPDZ5amyYglnZXRlbnRpdHmiAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRlbnRpdHkKc3VtbWFyeTogJ0dldCBlbnRpdHkgc3RhdGUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJldHVybnMgdGhlIGN1cnJlbnQgc3RhdGUgb2YgYW4gZW50aXR5IGluY2x1ZGluZyBpZGVudGl0eSwgY2FyZ28sIHNjaGVkdWxlIHN0YXRlLCBhbmQgdHlwZS1zcGVjaWZpYyBmaWVsZHMuAAAAWKrssmIIZ2V0aXRlbXOaAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRpdGVtcwpzdW1tYXJ5OiAnR2V0IGFsbCBhdmFpbGFibGUgaXRlbXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgYSBsaXN0IG9mIGFsbCBpdGVtcyBpbiB0aGUgZ2FtZSBpbmNsdWRpbmcgdGhlaXIgaWQsIGJhc2UgcHJpY2UsIGFuZCBtYXNzLgAmddkgGrNiC2dldGxvY2F0aW9u4gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bG9jYXRpb24Kc3VtbWFyeTogJ0dldCBsb2NhdGlvbiBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCBhIGxvY2F0aW9uIGluY2x1ZGluZyB3aGV0aGVyIGEgc3lzdGVtIGV4aXN0cywgYW5kIGZvciBlYWNoIGl0ZW06IHByaWNlLCBzdXBwbHksIHJhcml0eSBtdWx0aXBsaWVyLCBhbmQgbG9jYXRpb24gbXVsdGlwbGllci4AgMkmIRqzYgpnZXRsb2NkYXRh/gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bG9jZGF0YQpzdW1tYXJ5OiAnR2V0IGRlcml2ZWQgbG9jYXRpb24gZGF0YScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBkZXJpdmVkIGxvY2F0aW9uIGRhdGEgaW5jbHVkaW5nIHN0YXRpYyBwcm9wZXJ0aWVzICh0eXBlLCBkaWZmaWN1bHR5LCBzZWVkcykgZnJvbSB0aGUgZ2FtZSBzZWVkIGFuZCBlcG9jaC1zcGVjaWZpYyBwcm9wZXJ0aWVzIChhY3RpdmUsIHNlZWRzKSBmcm9tIHRoZSBjdXJyZW50IGVwb2NoIHNlZWQuAADw5xo1s2IJZ2V0bmVhcmJ53gMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bmVhcmJ5CnN1bW1hcnk6ICdHZXQgbmVhcmJ5IHJlYWNoYWJsZSBzeXN0ZW1zJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIG5lYXJieSBzeXN0ZW1zIHJlYWNoYWJsZSBieSBhbiBlbnRpdHkgZnJvbSBpdHMgcHJvamVjdGVkIGxvY2F0aW9uLiBSZXR1cm5zIGN1cnJlbnQgc3RhdGUgKHdpdGggY29tcGxldGVkIHRhc2tzIHJlc29sdmVkKSwgcHJvamVjdGVkIHN0YXRlIChhZnRlciBhbGwgc2NoZWR1bGVkIHRhc2tzKSwgYW5kIGEgbGlzdCBvZiByZWFjaGFibGUgc3lzdGVtcyB3aXRoIGRpc3RhbmNlLCBlbmVyZ3kgY29zdCwgZmxpZ2h0IHRpbWUsIGFuZCBtYXJrZXQgaW5mb3JtYXRpb24uAAC4yptYs2IJZ2V0cGxheWVy/QItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0cGxheWVyCnN1bW1hcnk6ICdHZXQgcGxheWVyIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IGEgcGxheWVyIGluY2x1ZGluZyBiYWxhbmNlLCBkZWJ0LCBuZXR3b3J0aCwgZW50aXR5IGNvdW50cywgYW5kIHByaWNpbmcgZm9yIG5leHQgcHVyY2hhc2VzLiBSZXR1cm5zIGlzX3BsYXllcj1mYWxzZSBpZiB0aGUgYWNjb3VudCBoYXMgbm90IGpvaW5lZCB0aGUgZ2FtZS4AwFX5moyzYgpnZXRzdGFydGVyhQMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0c3RhcnRlcgpzdW1tYXJ5OiAnR2V0IHN0YXJ0ZXIgc2hpcCBhbmQgYmFsYW5jZSBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyB0aGUgc3RhcnRlciBzaGlwIHN0YXRzIGFuZCBpbml0aWFsIGJhbGFuY2UgYSBuZXcgcGxheWVyIHdvdWxkIHJlY2VpdmUgdXBvbiBqb2luaW5nLiBVc2VkIGZvciBvbmJvYXJkaW5nIFVJIHRvIGRpc3BsYXkgd2hhdCBwbGF5ZXJzIHdpbGwgZ2V0IGJlZm9yZSB0aGV5IHJlZ2lzdGVyLoCVu0ZKjbNiDGdldHN1bW1hcmllc+gCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldHN1bW1hcmllcwpzdW1tYXJ5OiAnR2V0IGVudGl0eSBzdW1tYXJpZXMgZm9yIGEgcGxheWVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm5zIGxpZ2h0d2VpZ2h0IHN1bW1hcmllcyBvZiBhbGwgZW50aXRpZXMgb3duZWQgYnkgYSBwbGF5ZXIgaW5jbHVkaW5nIHR5cGUsIGlkLCBvd25lciwgbmFtZSwgbG9jYXRpb24sIGFuZCBpZGxlIHN0YXR1cy4gT3B0aW9uYWxseSBmaWx0ZXIgYnkgZW50aXR5IHR5cGUuAKLa5uaq6WULZ3JvdXB0cmF2ZWyaBC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBncm91cHRyYXZlbApzdW1tYXJ5OiAnTW92ZSBtdWx0aXBsZSBlbnRpdGllcyB0b2dldGhlcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW5pdGlhdGUgZ3JvdXAgdHJhdmVsIGZvciBtdWx0aXBsZSBlbnRpdGllcyB0byBhIGRlc3RpbmF0aW9uLiBBbGwgZW50aXRpZXMgbXVzdCBiZSBhdCB0aGUgc2FtZSBsb2NhdGlvbiBhbmQgb3duZWQgYnkgdGhlIGNhbGxlci4gQXQgbGVhc3Qgb25lIGVudGl0eSB3aXRoIGVuZ2luZXMgaXMgcmVxdWlyZWQgdG8gcHJvdmlkZSB0aHJ1c3QuIEZsaWdodCBkdXJhdGlvbiBpcyBjYWxjdWxhdGVkIGZyb20gY29tYmluZWQgdGhydXN0IGFuZCB0b3RhbCBtYXNzIG9mIGFsbCBlbnRpdGllcy4gQ3JlYXRlcyBhbiBlbnRpdHlncm91cCBmb3IgYXRvbWljIHJlc29sdXRpb24gYW5kIGNhbmNlbGxhdGlvbi4AAAAAANCwaQRoYXNo/QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaGFzaApzdW1tYXJ5OiAnQ2FsY3VsYXRlIHNoYTI1NiBoYXNoJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGVzIHRoZSBzaGEyNTYgaGFzaCBvZiBhIHN0cmluZyBiYXNlZCB1c2luZyB0aGUgZ2FtZSBzZWVkLgoKLS0tAAAAQITSsGkHaGFzaDUxMvsBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGhhc2g1MTIKc3VtbWFyeTogJ0NhbGN1bGF0ZSBzaGE1MTIgaGFzaCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlcyB0aGUgc2hhNTEyIGhhc2ggb2YgYSBzdHJpbmcgYmFzZWQgdXNpbmcgdGhlIGdhbWUgc2VlZC4AAAAAAJDddARpbml0+gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaW5pdApzdW1tYXJ5OiAnSW5pdGlhbGl6ZSBnYW1lIHNlZWQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYWxpemUgYSB0aGUgZ2FtZXMgc2VlZCBhbmQgc2VlZCB2YWx1ZXMgdG8gYm9vdHN0cmFwIGdhbWUgc3RhdGUuAAAAAAAwHX0Eam9pbskBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGpvaW4Kc3VtbWFyeTogJ0pvaW4gYSBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpKb2luIGEgZ2FtZSBvZiBTaGlwbG9hZAoKLS0tAAAAAPjlMp0Gbm90aWZ5igMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogbm90aWZ5CnN1bW1hcnk6ICdUYXNrIGxpZmVjeWNsZSBub3RpZmljYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkludGVybmFsIGFjdGlvbiB0aGF0IG5vdGlmaWVzIGVudGl0eSBvd25lcnMgb2YgdGFzayBsaWZlY3ljbGUgZXZlbnRzIChyZXNvbHZlZCwgY2FuY2VsbGVkKS4gQ2FsbGVkIGlubGluZSB3aGVuIHRhc2tzIGNoYW5nZSBzdGF0ZS4gVXNlcyByZXF1aXJlX3JlY2lwaWVudCB0byBlbmFibGUgb2ZmLWNoYWluIG1vbml0b3JpbmcgdmlhIGFjdGlvbiB0cmFjZXMuAAAAYBoavakHcGF5bG9hbq8BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHBheWxvYW4Kc3VtbWFyeTogJ0xvYW4gUGF5bWVudCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQB8rFVjxa6uC3B1cmdlc3VwcGx56QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcHVyZ2VzdXBwbHkKc3VtbWFyeTogJ1VwZGF0ZSBHYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJnZSBvbGQgc3VwcGx5IHJlY29yZHMgYW5kIGhlbHAgY2xlYW51cCBnYW1lIHN0YXRlLgAAAIpd05C6CHJlY2hhcmdl0gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcmVjaGFyZ2UKc3VtbWFyeTogJ1JlY2hhcmdlIHNoaXAgZW5lcmd5JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTY2hlZHVsZSBhIHJlY2hhcmdlIHRhc2sgZm9yIGFuIGVudGl0eSB0byByZXN0b3JlIGVuZXJneSB0byBmdWxsIGNhcGFjaXR5LiBUaGUgcmVjaGFyZ2UgZHVyYXRpb24gZGVwZW5kcyBvbiBjdXJyZW50IGVuZXJneSBsZXZlbCBhbmQgcmVjaGFyZ2UgcmF0ZS4KCi0tLQAAAEDtSLG6B3Jlc29sdmXVAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiByZXNvbHZlCnN1bW1hcnk6ICdDb21wbGV0ZSBzY2hlZHVsZWQgdGFza3MnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJlc29sdmUgY29tcGxldGVkIHRhc2tzIGluIGFuIGVudGl0eSdzIHNjaGVkdWxlLCBhcHBseWluZyB0aGVpciBlZmZlY3RzIChyZWNoYXJnZSBlbmVyZ3ksIHVwZGF0ZSBsb2NhdGlvbiwgbG9hZC91bmxvYWQgY2FyZ28pLiBJZiBjb3VudCBpcyBzcGVjaWZpZWQsIHJlc29sdmUgZXhhY3RseSB0aGF0IG1hbnkgdGFza3M7IG90aGVyd2lzZSByZXNvbHZlIGFsbCBjb21wbGV0ZWQgdGFza3MuIEZhaWxzIGlmIGNvdW50IGV4Y2VlZHMgdGhlIG51bWJlciBvZiBjb21wbGV0ZWQgdGFza3MuCgotLS0AAAAAAJCjwQRzYWx03QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2FsdApzdW1tYXJ5OiAnQXBwZW5kIFNhbHQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkZCBhZGRpdGlvbmFsIHNhbHQgdG8gdGhlIG5leHQgZXBvY2ggc2VlZC4KCi0tLQAAwFJlF6PCCXNlbGxpdGVtc9UBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNlbGxpdGVtcwpzdW1tYXJ5OiAnU2VsbCBpdGVtcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2VsbCBpdGVtcyBmcm9tIGEgc2hpcCdzIGNhcmdvLgoKLS0tAAAA09CooMkIdGFrZWxvYW7qAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0YWtlbG9hbgpzdW1tYXJ5OiAnQ3JlZGl0IExvYW4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkJvcnJvdyBjcmVkaXRzIGZyb20gdGhlIGJhbmsgdGhhdCB3aWxsIG5lZWQgdG8gYmUgcmVwYWlkLgAAAFctPM3NCHRyYW5zZmVyyAMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdHJhbnNmZXIKc3VtbWFyeTogJ1RyYW5zZmVyIGNhcmdvIGJldHdlZW4gZW50aXRpZXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRyYW5zZmVyIGNhcmdvIGJldHdlZW4gdHdvIGVudGl0aWVzIGF0IHRoZSBzYW1lIGxvY2F0aW9uLiBCb3RoIGVudGl0aWVzIG11c3QgYmUgb3duZWQgYnkgdGhlIGNhbGxlciBhbmQgYXQgbGVhc3Qgb25lIG11c3QgaGF2ZSBsb2FkZXJzLiBDcmVhdGVzIGxvYWQgYW5kIHVubG9hZCB0YXNrcyBvbiBib3RoIGVudGl0aWVzIHdpdGggZHVyYXRpb24gYmFzZWQgb24gY29tYmluZWQgbG9hZGVyIGNhcGFjaXR5IGFuZCBaLWRpc3RhbmNlIGJldHdlZW4gdGhlbS4AAAAARLXNzQZ0cmF2ZWzLAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWwKc3VtbWFyeTogJ01vdmUgYSBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWF0ZSB0cmF2ZWwgb2YgYW4gZW50aXR5IGZyb20gaXRzIGN1cnJlbnQgbG9jYXRpb24gdG8gYSBuZXcgZGVzdGluYXRpb24uCgotLS0KClRoaXMgYWN0aW9uIGRldGVybWluZXMgdGhlIG1hcmtldCBwcmljZSBvZiBhbGwgaXRlbXMgYXQgYSBnaXZlbiBsb2NhdGlvbi6QXVIXqWxS1Qx1cGRhdGVjcmVkaXTCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1cGRhdGVjcmVkaXQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVjcmVkaXQgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAEA+KqlsUtUKdXBkYXRlZGVidL4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVwZGF0ZWRlYnQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVkZWJ0IGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAAAAoKrjBHdpcGWyAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlCnN1bW1hcnk6ICdERUJVRzogd2lwZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS2g0FTaKqyq4wx3aXBlc2VxdWVuY2XCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlc2VxdWVuY2UKc3VtbWFyeTogJ0RFQlVHOiB3aXBlc2VxdWVuY2UgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tDAAAAAAAyq5BA2k2NAAACWNhcmdvX3JvdwAAuGo6kydFA2k2NAAADWNvbnRhaW5lcl9yb3cAqqaX+ezyVANpNjQAAA9lbnRpdHlncm91cF9yb3cAAACTumwQjQNpNjQAAAxsb2NhdGlvbl9yb3cAAAAAXOVNrANpNjQAAApwbGF5ZXJfcm93AAAAQO2rsLoDaTY0AAALcmVzZXJ2ZV9yb3cAAAAKTaWtwgNpNjQAAAxzZXF1ZW5jZV9yb3cAAAAAAFBdwwNpNjQAAAhzaGlwX3JvdwAAAAAAlU3GA2k2NAAACXN0YXRlX3JvdwAAAAD4WKvGA2k2NAAACnN1cHBseV9yb3cAAAAAAKyqzwNpNjQAAAl0eXBlc19yb3cAAFBY06au4QNpNjQAAA13YXJlaG91c2Vfcm93ARFTaGlwbG9hZCAoU2VydmVyKRFTaGlwbG9hZCAoU2VydmVyKQAAABUAAABYquy8Pgx0YXNrX3Jlc3VsdHMAAAAARIWmQQ5jYW5jZWxfcmVzdWx0cwAAACAjc3NXDHRhc2tfcmVzdWx0cwAAYG5NirJiC2dhbWVfY29uZmlnALBy2eWpsmINZW50aXR5X2luZm9bXQAA8NnlqbJiC2VudGl0eV9pbmZvAAAAWKrssmIKaXRlbXNfaW5mbwAmddkgGrNiDWxvY2F0aW9uX2luZm8AgMkmIRqzYhBsb2NhdGlvbl9kZXJpdmVkAADw5xo1s2ILbmVhcmJ5X2luZm8AALjKm1izYgtwbGF5ZXJfaW5mbwDAVfmajLNiDHN0YXJ0ZXJfaW5mb4CVu0ZKjbNiEGVudGl0eV9zdW1tYXJ5W10Aotrm5qrpZQx0YXNrX3Jlc3VsdHMAAAAAANCwaQtjaGVja3N1bTI1NgAAAECE0rBpC2NoZWNrc3VtNTEyAAAAil3TkLoMdGFza19yZXN1bHRzAAAAQO1IsboPcmVzb2x2ZV9yZXN1bHRzAADAUmUXo8IMdGFza19yZXN1bHRzAAAAVy08zc0MdGFza19yZXN1bHRzAAAAAES1zc0MdGFza19yZXN1bHRz'
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
    @Struct.type('buyitems')
    export class buyitems extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt16)
        declare item_id: UInt16
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
    @Struct.type('cargo_item')
    export class cargo_item extends Struct {
        @Struct.field(UInt16)
        declare item_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
        @Struct.field(UInt64)
        declare unit_cost: UInt64
        @Struct.field(UInt64, {optional: true})
        declare seed?: UInt64
    }
    @Struct.type('cargo_row')
    export class cargo_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt64)
        declare item_id: UInt64
        @Struct.field(UInt64)
        declare quantity: UInt64
        @Struct.field(UInt64)
        declare unit_cost: UInt64
        @Struct.field(UInt64)
        declare seed: UInt64
    }
    @Struct.type('cleanrsvp')
    export class cleanrsvp extends Struct {
        @Struct.field(UInt64)
        declare epoch: UInt64
        @Struct.field(UInt64)
        declare max_rows: UInt64
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
    @Struct.type('movement_stats')
    export class movement_stats extends Struct {
        @Struct.field(UInt32)
        declare thrust: UInt32
        @Struct.field(UInt16)
        declare drain: UInt16
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
    @Struct.type('trade_stats')
    export class trade_stats extends Struct {
        @Struct.field(UInt16)
        declare margin: UInt16
    }
    @Struct.type('extractor_stats')
    export class extractor_stats extends Struct {
        @Struct.field(UInt16)
        declare rate: UInt16
        @Struct.field(UInt16)
        declare drain: UInt16
        @Struct.field(UInt16)
        declare efficiency: UInt16
        @Struct.field(UInt16)
        declare depth: UInt16
        @Struct.field(UInt16)
        declare drill: UInt16
    }
    @Struct.type('warp_stats')
    export class warp_stats extends Struct {
        @Struct.field(UInt32)
        declare range: UInt32
    }
    @Struct.type('entity_defaults')
    export class entity_defaults extends Struct {
        @Struct.field(UInt32)
        declare ship_hullmass: UInt32
        @Struct.field(UInt32)
        declare ship_capacity: UInt32
        @Struct.field(UInt16)
        declare ship_energy: UInt16
        @Struct.field(UInt16)
        declare ship_z: UInt16
        @Struct.field(movement_stats)
        declare ship_engines: movement_stats
        @Struct.field(energy_stats)
        declare ship_generator: energy_stats
        @Struct.field(loader_stats)
        declare ship_loaders: loader_stats
        @Struct.field(trade_stats)
        declare ship_trade: trade_stats
        @Struct.field(extractor_stats)
        declare ship_extractor: extractor_stats
        @Struct.field(UInt32)
        declare warehouse_capacity: UInt32
        @Struct.field(UInt16)
        declare warehouse_z: UInt16
        @Struct.field(loader_stats)
        declare warehouse_loaders: loader_stats
        @Struct.field(UInt32)
        declare container_hullmass: UInt32
        @Struct.field(UInt32)
        declare container_capacity: UInt32
        @Struct.field(UInt16)
        declare container_z: UInt16
    }
    @Struct.type('item_def')
    export class item_def extends Struct {
        @Struct.field(UInt16)
        declare id: UInt16
        @Struct.field(UInt32)
        declare base_price: UInt32
        @Struct.field(UInt32)
        declare mass: UInt32
    }
    @Struct.type('game_config')
    export class game_config extends Struct {
        @Struct.field(UInt32)
        declare version: UInt32
        @Struct.field(entity_defaults)
        declare defaults: entity_defaults
        @Struct.field(item_def, {array: true})
        declare items: item_def[]
    }
    @Struct.type('configlog')
    export class configlog extends Struct {
        @Struct.field(game_config)
        declare config: game_config
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
    @Struct.type('entity_current_state')
    export class entity_current_state extends Struct {
        @Struct.field(coordinates)
        declare coordinates: coordinates
        @Struct.field(UInt16)
        declare energy: UInt16
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
        @Struct.field(warp_stats, {optional: true})
        declare warp?: warp_stats
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
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt16)
        declare stratum: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
    }
    @Struct.type('getconfig')
    export class getconfig extends Struct {}
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
    @Struct.type('getitems')
    export class getitems extends Struct {}
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
    @Struct.type('items_info')
    export class items_info extends Struct {
        @Struct.field(item_def, {array: true})
        declare items: item_def[]
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
    @Struct.type('location_item')
    export class location_item extends Struct {
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
        @Struct.field(location_item, {array: true})
        declare items: location_item[]
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
    @Struct.type('reserve_row')
    export class reserve_row extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt32)
        declare remaining: UInt32
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
    @Struct.type('sellitems')
    export class sellitems extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt16)
        declare item_id: UInt16
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
        @Struct.field(warp_stats, {optional: true})
        declare warp?: warp_stats
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
        declare item_id: UInt16
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
        declare item_id: UInt16
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
        @Struct.field(game_config)
        declare game_config_type: game_config
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
    reserve: Types.reserve_row,
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
    reserve: Types.reserve_row
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
        export interface game_config {
            version: UInt32Type
            defaults: Type.entity_defaults
            items: Type.item_def[]
        }
        export interface entity_defaults {
            ship_hullmass: UInt32Type
            ship_capacity: UInt32Type
            ship_energy: UInt16Type
            ship_z: UInt16Type
            ship_engines: Type.movement_stats
            ship_generator: Type.energy_stats
            ship_loaders: Type.loader_stats
            ship_trade: Type.trade_stats
            ship_extractor: Type.extractor_stats
            warehouse_capacity: UInt32Type
            warehouse_z: UInt16Type
            warehouse_loaders: Type.loader_stats
            container_hullmass: UInt32Type
            container_capacity: UInt32Type
            container_z: UInt16Type
        }
        export interface movement_stats {
            thrust: UInt32Type
            drain: UInt16Type
        }
        export interface energy_stats {
            capacity: UInt16Type
            recharge: UInt16Type
        }
        export interface loader_stats {
            mass: UInt32Type
            thrust: UInt16Type
            quantity: UInt8Type
        }
        export interface trade_stats {
            margin: UInt16Type
        }
        export interface extractor_stats {
            rate: UInt16Type
            drain: UInt16Type
            efficiency: UInt16Type
            depth: UInt16Type
            drill: UInt16Type
        }
        export interface item_def {
            id: UInt16Type
            base_price: UInt32Type
            mass: UInt32Type
        }
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
            item_id: UInt16Type
            quantity: UInt32Type
            unit_cost: UInt64Type
            seed?: UInt64Type
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
    export interface buyitems {
        entity_type: NameType
        id: UInt64Type
        item_id: UInt16Type
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
    export interface cleanrsvp {
        epoch: UInt64Type
        max_rows: UInt64Type
    }
    export interface cleartable {
        table_name: NameType
        scope?: NameType
        max_rows?: UInt64Type
    }
    export interface commit {
        commit: Checksum256Type
    }
    export interface configlog {
        config: Type.game_config
    }
    export interface enable {
        enabled: boolean
    }
    export interface extract {
        entity_type: NameType
        id: UInt64Type
        stratum: UInt16Type
        quantity: UInt32Type
    }
    export interface getconfig {}
    export interface getentities {
        owner: NameType
        entity_type?: NameType
    }
    export interface getentity {
        entity_type: NameType
        entity_id: UInt64Type
    }
    export interface getitems {}
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
    export interface sellitems {
        entity_type: NameType
        id: UInt64Type
        item_id: UInt16Type
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
        item_id: UInt16Type
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
    buyitems: ActionParams.buyitems
    buyship: ActionParams.buyship
    buywarehouse: ActionParams.buywarehouse
    cancel: ActionParams.cancel
    cleanrsvp: ActionParams.cleanrsvp
    cleartable: ActionParams.cleartable
    commit: ActionParams.commit
    configlog: ActionParams.configlog
    enable: ActionParams.enable
    extract: ActionParams.extract
    getconfig: ActionParams.getconfig
    getentities: ActionParams.getentities
    getentity: ActionParams.getentity
    getitems: ActionParams.getitems
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
    sellitems: ActionParams.sellitems
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
    buyitems: Types.task_results
    cancel: Types.cancel_results
    extract: Types.task_results
    getconfig: Types.game_config
    getentities: Types.entity_info[]
    getentity: Types.entity_info
    getitems: Types.items_info
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
    sellitems: Types.task_results
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
