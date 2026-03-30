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
    'DmVvc2lvOjphYmkvMS4yAhVCX3ZlY3Rvcl9lbnRpdHlfcmVmX0UMZW50aXR5X3JlZltdDWxvY2F0aW9uX3R5cGUFdWludDhaB2FkdmFuY2UAAgZyZXZlYWwGc3RyaW5nBmNvbW1pdAtjaGVja3N1bTI1NgxidXljb250YWluZXIAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcIYnV5aXRlbXMABAtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIHYnV5c2hpcAACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwxidXl3YXJlaG91c2UAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcGY2FuY2VsAAMLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQFY291bnQGdWludDY0DmNhbmNlbF9yZXN1bHRzAAYJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lD2NhbmNlbGxlZF9jb3VudAV1aW50OBBzY2hlZHVsZV9zdGFydGVkC3RpbWVfcG9pbnQ/C2VudGl0eWdyb3VwB3VpbnQ2ND8NZ3JvdXBfbWVtYmVycxZCX3ZlY3Rvcl9lbnRpdHlfcmVmX0U/CmNhcmdvX2l0ZW0ABAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIJdW5pdF9jb3N0BnVpbnQ2NARzZWVkB3VpbnQ2ND8JY2FyZ29fcm93AAYCaWQGdWludDY0CWVudGl0eV9pZAZ1aW50NjQHaXRlbV9pZAZ1aW50NjQIcXVhbnRpdHkGdWludDY0CXVuaXRfY29zdAZ1aW50NjQEc2VlZAZ1aW50NjQJY2xlYW5yc3ZwAAIFZXBvY2gGdWludDY0CG1heF9yb3dzBnVpbnQ2NApjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8GY29tbWl0AAEGY29tbWl0C2NoZWNrc3VtMjU2CWNvbmZpZ2xvZwABBmNvbmZpZwtnYW1lX2NvbmZpZw1jb250YWluZXJfcm93AAgCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIaHVsbG1hc3MGdWludDMyCGNhcGFjaXR5BnVpbnQzMgljYXJnb21hc3MGdWludDMyCHNjaGVkdWxlCXNjaGVkdWxlPwtjb29yZGluYXRlcwADAXgFaW50NjQBeQVpbnQ2NAF6B3VpbnQxNj8GZW5hYmxlAAEHZW5hYmxlZARib29sDGVuZXJneV9zdGF0cwACCGNhcGFjaXR5BnVpbnQxNghyZWNoYXJnZQZ1aW50MTYUZW50aXR5X2N1cnJlbnRfc3RhdGUAAgtjb29yZGluYXRlcwtjb29yZGluYXRlcwZlbmVyZ3kGdWludDE2D2VudGl0eV9kZWZhdWx0cwAQDXNoaXBfaHVsbG1hc3MGdWludDMyDXNoaXBfY2FwYWNpdHkGdWludDMyC3NoaXBfZW5lcmd5BnVpbnQxNgZzaGlwX3oGdWludDE2DHNoaXBfZW5naW5lcw5tb3ZlbWVudF9zdGF0cw5zaGlwX2dlbmVyYXRvcgxlbmVyZ3lfc3RhdHMMc2hpcF9sb2FkZXJzDGxvYWRlcl9zdGF0cwpzaGlwX3RyYWRlC3RyYWRlX3N0YXRzDnNoaXBfZXh0cmFjdG9yD2V4dHJhY3Rvcl9zdGF0cwlzaGlwX3dhcnAKd2FycF9zdGF0cxJ3YXJlaG91c2VfY2FwYWNpdHkGdWludDMyC3dhcmVob3VzZV96BnVpbnQxNhF3YXJlaG91c2VfbG9hZGVycwxsb2FkZXJfc3RhdHMSY29udGFpbmVyX2h1bGxtYXNzBnVpbnQzMhJjb250YWluZXJfY2FwYWNpdHkGdWludDMyC2NvbnRhaW5lcl96BnVpbnQxNgtlbnRpdHlfaW5mbwAWBHR5cGUEbmFtZQJpZAZ1aW50NjQFb3duZXIEbmFtZQtlbnRpdHlfbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMJY2FyZ29tYXNzBnVpbnQzMgVjYXJnbwxjYXJnb19pdGVtW10HbG9hZGVycw1sb2FkZXJfc3RhdHM/BmVuZXJneQd1aW50MTY/CGh1bGxtYXNzB3VpbnQzMj8HZW5naW5lcw9tb3ZlbWVudF9zdGF0cz8JZ2VuZXJhdG9yDWVuZXJneV9zdGF0cz8IY2FwYWNpdHkHdWludDMyPwlleHRyYWN0b3IQZXh0cmFjdG9yX3N0YXRzPwR3YXJwC3dhcnBfc3RhdHM/B2lzX2lkbGUEYm9vbAxjdXJyZW50X3Rhc2sFdGFzaz8UY3VycmVudF90YXNrX2VsYXBzZWQGdWludDMyFmN1cnJlbnRfdGFza19yZW1haW5pbmcGdWludDMyDXBlbmRpbmdfdGFza3MGdGFza1tdB2lkbGVfYXQLdGltZV9wb2ludD8Ic2NoZWR1bGUJc2NoZWR1bGU/CmVudGl0eV9yZWYAAgtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQOZW50aXR5X3N1bW1hcnkACAR0eXBlBG5hbWUCaWQGdWludDY0BW93bmVyBG5hbWULZW50aXR5X25hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzB2lzX2lkbGUEYm9vbA5yZXNvbHZlZF9jb3VudAZ1aW50MzINcGVuZGluZ19jb3VudAZ1aW50MzIQZW50aXR5X3Rhc2tfaW5mbwAECWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQp0YXNrX2NvdW50BXVpbnQ4EHNjaGVkdWxlX3N0YXJ0ZWQKdGltZV9wb2ludA9lbnRpdHlncm91cF9yb3cAAgJpZAZ1aW50NjQMcGFydGljaXBhbnRzDGVudGl0eV9yZWZbXQdleHRyYWN0AAQLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQHc3RyYXR1bQZ1aW50MTYIcXVhbnRpdHkGdWludDMyD2V4dHJhY3Rvcl9zdGF0cwAFBHJhdGUGdWludDE2BWRyYWluBnVpbnQxNgplZmZpY2llbmN5BnVpbnQxNgVkZXB0aAZ1aW50MTYFZHJpbGwGdWludDE2C2dhbWVfY29uZmlnAAMHdmVyc2lvbgZ1aW50MzIIZGVmYXVsdHMPZW50aXR5X2RlZmF1bHRzBWl0ZW1zCml0ZW1fZGVmW10JZ2V0Y29uZmlnAAALZ2V0ZW50aXRpZXMAAgVvd25lcgRuYW1lC2VudGl0eV90eXBlBW5hbWU/CWdldGVudGl0eQACC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhnZXRpdGVtcwAAC2dldGxvY2F0aW9uAAIBeAVpbnQ2NAF5BWludDY0CmdldGxvY2RhdGEAAgF4BWludDY0AXkFaW50NjQJZ2V0bmVhcmJ5AAMLZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0CHJlY2hhcmdlBGJvb2wJZ2V0cGxheWVyAAEHYWNjb3VudARuYW1lCmdldHN0YXJ0ZXIAAApnZXRzdHJhdHVtAAMBeAVpbnQ2NAF5BWludDY0B3N0cmF0dW0GdWludDE2DGdldHN1bW1hcmllcwACBW93bmVyBG5hbWULZW50aXR5X3R5cGUFbmFtZT8LZ3JvdXB0cmF2ZWwABAhlbnRpdGllcwxlbnRpdHlfcmVmW10BeAVpbnQ2NAF5BWludDY0CHJlY2hhcmdlBGJvb2wEaGFzaAABBXZhbHVlBnN0cmluZwdoYXNoNTEyAAEFdmFsdWUGc3RyaW5nBGluaXQAAQRzZWVkC2NoZWNrc3VtMjU2CGl0ZW1fZGVmAAMCaWQGdWludDE2CmJhc2VfcHJpY2UGdWludDMyBG1hc3MGdWludDMyCml0ZW1zX2luZm8AAQVpdGVtcwppdGVtX2RlZltdBGpvaW4AAQdhY2NvdW50BG5hbWUMbG9hZGVyX3N0YXRzAAMEbWFzcwZ1aW50MzIGdGhydXN0BnVpbnQxNghxdWFudGl0eQV1aW50OBBsb2NhdGlvbl9kZXJpdmVkAAMMc3RhdGljX3Byb3BzD2xvY2F0aW9uX3N0YXRpYwtlcG9jaF9wcm9wcw5sb2NhdGlvbl9lcG9jaARzaXplBnVpbnQxNg5sb2NhdGlvbl9lcG9jaAADBmFjdGl2ZQRib29sBXNlZWQwBXVpbnQ4BXNlZWQxBXVpbnQ4DWxvY2F0aW9uX2luZm8AAwZjb29yZHMLY29vcmRpbmF0ZXMJaXNfc3lzdGVtBGJvb2wFaXRlbXMPbG9jYXRpb25faXRlbVtdDWxvY2F0aW9uX2l0ZW0ABQJpZAZ1aW50MTYFcHJpY2UGdWludDMyBnN1cHBseQZ1aW50MTYRcmFyaXR5X211bHRpcGxpZXIGdWludDMyE2xvY2F0aW9uX211bHRpcGxpZXIGdWludDMyDGxvY2F0aW9uX3JvdwAGAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCWNhcmdvbWFzcwZ1aW50MzIFY2FyZ28MY2FyZ29faXRlbVtdCHNjaGVkdWxlCXNjaGVkdWxlPw9sb2NhdGlvbl9zdGF0aWMABQZjb29yZHMLY29vcmRpbmF0ZXMEdHlwZQ1sb2NhdGlvbl90eXBlB3N1YnR5cGUFdWludDgFc2VlZDAFdWludDgFc2VlZDEFdWludDgObW92ZW1lbnRfc3RhdHMAAgZ0aHJ1c3QGdWludDMyBWRyYWluBnVpbnQxNgtuZWFyYnlfaW5mbwAFCmNhbl90cmF2ZWwEYm9vbAdjdXJyZW50FGVudGl0eV9jdXJyZW50X3N0YXRlCXByb2plY3RlZBRlbnRpdHlfY3VycmVudF9zdGF0ZQptYXhfZW5lcmd5BnVpbnQxNgdzeXN0ZW1zD25lYXJieV9zeXN0ZW1bXQ1uZWFyYnlfc3lzdGVtAAQIZGlzdGFuY2UGdWludDY0C2VuZXJneV9jb3N0BnVpbnQ2NAtmbGlnaHRfdGltZQZ1aW50MzIIbG9jYXRpb24NbG9jYXRpb25faW5mbwZub3RpZnkAAQVldmVudAp0YXNrX2V2ZW50B3BheWxvYW4AAgdhY2NvdW50BG5hbWUGYW1vdW50BnVpbnQ2NAtwbGF5ZXJfaW5mbwANBW93bmVyBG5hbWUJaXNfcGxheWVyBGJvb2wMY29tcGFueV9uYW1lBnN0cmluZwdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQzMghuZXR3b3J0aAVpbnQ2NA5hdmFpbGFibGVfbG9hbgZ1aW50NjQPbmV4dF9zaGlwX3ByaWNlBnVpbnQ2NBRuZXh0X3dhcmVob3VzZV9wcmljZQZ1aW50NjQUbmV4dF9jb250YWluZXJfcHJpY2UGdWludDY0CnNoaXBfY291bnQGdWludDY0D3dhcmVob3VzZV9jb3VudAZ1aW50NjQPY29udGFpbmVyX2NvdW50BnVpbnQ2NApwbGF5ZXJfcm93AAQFb3duZXIEbmFtZQdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQzMghuZXR3b3J0aAVpbnQ2NAtwdXJnZXN1cHBseQABCG1heF9yb3dzB3VpbnQ2ND8IcmVjaGFyZ2UAAgtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAtyZXNlcnZlX3JvdwACAmlkBnVpbnQ2NAlyZW1haW5pbmcGdWludDMyB3Jlc29sdmUAAwtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAVjb3VudAd1aW50NjQ/D3Jlc29sdmVfcmVzdWx0cwAGCWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQ5yZXNvbHZlZF9jb3VudAV1aW50OBRuZXdfc2NoZWR1bGVfc3RhcnRlZAt0aW1lX3BvaW50PwtlbnRpdHlncm91cAd1aW50NjQ/DWdyb3VwX21lbWJlcnMWQl92ZWN0b3JfZW50aXR5X3JlZl9FPw5yZXNvdXJjZV9zdGF0cwADBXN0YXQxBnVpbnQxNgVzdGF0MgZ1aW50MTYFc3RhdDMGdWludDE2BHNhbHQAAQRzYWx0BnVpbnQ2NAhzY2hlZHVsZQACB3N0YXJ0ZWQKdGltZV9wb2ludAV0YXNrcwZ0YXNrW10Jc2VsbGl0ZW1zAAQLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQHaXRlbV9pZAZ1aW50MTYIcXVhbnRpdHkGdWludDMyDHNlcXVlbmNlX3JvdwACA2tleQRuYW1lBXZhbHVlBnVpbnQ2NAhzaGlwX3JvdwAPAmlkBnVpbnQ2NAVvd25lcgRuYW1lBG5hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCGh1bGxtYXNzBnVpbnQzMghjYXBhY2l0eQZ1aW50MzIGZW5lcmd5BnVpbnQxNgljYXJnb21hc3MGdWludDMyB2VuZ2luZXMObW92ZW1lbnRfc3RhdHMJZ2VuZXJhdG9yDGVuZXJneV9zdGF0cwdsb2FkZXJzDGxvYWRlcl9zdGF0cwV0cmFkZQx0cmFkZV9zdGF0cz8JZXh0cmFjdG9yEGV4dHJhY3Rvcl9zdGF0cz8Ed2FycAt3YXJwX3N0YXRzPwhzY2hlZHVsZQlzY2hlZHVsZT8Mc3RhcnRlcl9pbmZvAAMHYmFsYW5jZQZ1aW50NjQEZGVidAZ1aW50NjQEc2hpcAtlbnRpdHlfaW5mbwlzdGF0ZV9yb3cABgdlbmFibGVkBGJvb2wFZXBvY2gGdWludDMyBHNhbHQGdWludDY0BXNoaXBzBnVpbnQzMgRzZWVkC2NoZWNrc3VtMjU2BmNvbW1pdAtjaGVja3N1bTI1NgxzdHJhdHVtX2RhdGEAAgdzdHJhdHVtDHN0cmF0dW1faW5mbwVzdGF0cw5yZXNvdXJjZV9zdGF0cwxzdHJhdHVtX2luZm8ABAdpdGVtX2lkBnVpbnQxNgRzZWVkBnVpbnQ2NAhyaWNobmVzcwZ1aW50MTYHcmVzZXJ2ZQZ1aW50MzIKc3VwcGx5X3JvdwAFAmlkBnVpbnQ2NAtjb29yZGluYXRlcwtjb29yZGluYXRlcwVlcG9jaAZ1aW50NjQHaXRlbV9pZAZ1aW50MTYGc3VwcGx5BnVpbnQxNgh0YWtlbG9hbgACB2FjY291bnQEbmFtZQZhbW91bnQGdWludDY0BHRhc2sACQR0eXBlBXVpbnQ4CGR1cmF0aW9uBnVpbnQzMgpjYW5jZWxhYmxlBXVpbnQ4C2Nvb3JkaW5hdGVzDGNvb3JkaW5hdGVzPwVjYXJnbwxjYXJnb19pdGVtW10MZW50aXR5dGFyZ2V0C2VudGl0eV9yZWY/C2VudGl0eWdyb3VwB3VpbnQ2ND8HY3JlZGl0cwZpbnQ2ND8LZW5lcmd5X2Nvc3QHdWludDE2Pwp0YXNrX2V2ZW50AAkKZXZlbnRfdHlwZQV1aW50OAVvd25lcgRuYW1lC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAp0YXNrX2luZGV4BXVpbnQ4BHRhc2sEdGFzawlzdGFydHNfYXQKdGltZV9wb2ludAxjb21wbGV0ZXNfYXQKdGltZV9wb2ludApuZXdfZW5lcmd5B3VpbnQxNj8MdGFza19yZXN1bHRzAAEIZW50aXRpZXMSZW50aXR5X3Rhc2tfaW5mb1tdC3RyYWRlX3N0YXRzAAEGbWFyZ2luBnVpbnQxNgh0cmFuc2ZlcgAGC3NvdXJjZV90eXBlBG5hbWUJc291cmNlX2lkBnVpbnQ2NAlkZXN0X3R5cGUEbmFtZQdkZXN0X2lkBnVpbnQ2NAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIGdHJhdmVsAAULZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQBeAVpbnQ2NAF5BWludDY0CHJlY2hhcmdlBGJvb2wJdHlwZXNfcm93AAQCaWQGdWludDY0E2VudGl0eV9zdW1tYXJ5X3R5cGUOZW50aXR5X3N1bW1hcnkRc3RhcnRlcl9pbmZvX3R5cGUMc3RhcnRlcl9pbmZvEGdhbWVfY29uZmlnX3R5cGULZ2FtZV9jb25maWcMdXBkYXRlY3JlZGl0AAIHYWNjb3VudARuYW1lBmFtb3VudAVpbnQ2NAp1cGRhdGVkZWJ0AAIHYWNjb3VudARuYW1lBmFtb3VudAVpbnQ2NA13YXJlaG91c2Vfcm93AAgCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIY2FwYWNpdHkGdWludDMyCWNhcmdvbWFzcwZ1aW50MzIHbG9hZGVycwxsb2FkZXJfc3RhdHMIc2NoZWR1bGUJc2NoZWR1bGU/BHdhcnAABAtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAF4BWludDY0AXkFaW50NjQKd2FycF9zdGF0cwABBXJhbmdlBnVpbnQzMgR3aXBlAAAMd2lwZXNlcXVlbmNlAAArAAAAQKFpdjIHYWR2YW5jZdMBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGFkdmFuY2UKc3VtbWFyeTogJ0FkdmFuY2UgdHVybicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQWR2YW5jZSB0aGUgZ2FtZSB0byB0aGUgbmV4dCB0dXJuLnDVdCZPirw+DGJ1eWNvbnRhaW5lcsoCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eWNvbnRhaW5lcgpzdW1tYXJ5OiAnQnV5IGEgbmV3IGNvbnRhaW5lcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUHVyY2hhc2UgYSBuZXcgY29udGFpbmVyIGF0IHRoZSBsb2NhdGlvbiBvZiBhbiBpZGxlIHNoaXAuIENvbnRhaW5lcnMgcHJvdmlkZSBjYXJnbyBzdG9yYWdlIGJ1dCBoYXZlIG5vIGxvYWRlcnMgYW5kIGNhbm5vdCBtb3ZlIGluZGVwZW5kZW50bHkuAAAAWKrsvD4IYnV5aXRlbXPdAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXlpdGVtcwpzdW1tYXJ5OiAnQnV5IGl0ZW1zJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBpdGVtcyBhbmQgYWRkIHRoZW0gdG8gYSBzaGlwJ3MgY2FyZ28uAAAAoLqGvT4HYnV5c2hpcMYBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eXNoaXAKc3VtbWFyeTogJ0J1eSBhIG5ldyBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyBzaGlwoLCmTV3DvT4MYnV5d2FyZWhvdXNlzAItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5d2FyZWhvdXNlCnN1bW1hcnk6ICdCdXkgYSBuZXcgd2FyZWhvdXNlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJjaGFzZSBhIG5ldyB3YXJlaG91c2UgYXQgdGhlIGxvY2F0aW9uIG9mIGFuIGlkbGUgc2hpcC4gV2FyZWhvdXNlcyBwcm92aWRlIGNhcmdvIHN0b3JhZ2Ugd2l0aCBsb2FkaW5nL3VubG9hZGluZyBjYXBhYmlsaXRpZXMgYnV0IGNhbm5vdCBtb3ZlLgAAAABEhaZBBmNhbmNlbMcCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNhbmNlbApzdW1tYXJ5OiAnQ2FuY2VsIHNjaGVkdWxlZCB0YXNrcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FuY2VsIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIHRhc2tzIGZyb20gdGhlIGVuZCBvZiBhbiBlbnRpdHkncyBzY2hlZHVsZS4gVGFza3MgdGhhdCBhcmUgaW1tdXRhYmxlIGFuZCBpbiBwcm9ncmVzcyBjYW5ub3QgYmUgY2FuY2VsbGVkLgoKLS0tAACoG99pVEQJY2xlYW5yc3ZwAACAisfka1RECmNsZWFydGFibGW+AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBjbGVhcnRhYmxlCnN1bW1hcnk6ICdERUJVRzogY2xlYXJ0YWJsZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0AAAAAZCclRQZjb21taXTxAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBjb21taXQKc3VtbWFyeTogJ1NldCBjb21taXQgdmFsdWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClNldCB0aGUgaW5pdGlhbCBjb21taXQgdmFsdWUgZHVyaW5nIGdhbWUgaW5pdGlhbGl6YXRpb24uCgotLS0AAGA0MrcmRQljb25maWdsb2cAAAAAAKh4zFQGZW5hYmxl4gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZW5hYmxlCnN1bW1hcnk6ICdTZXQgZW5hYmxlZCBzdGF0ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRW5hYmxlIG9yIGRpc2FibGUgdGhpcyBnYW1lIG9mIFNoaXBsb2FkLgoKLS0tAAAAICNzc1cHZXh0cmFjdKEDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGV4dHJhY3QKc3VtbWFyeTogJ0V4dHJhY3QgcmVzb3VyY2VzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpFeHRyYWN0IHJlc291cmNlcyBhdCB0aGUgc2hpcCdzIGN1cnJlbnQgbG9jYXRpb24uIE9ubHkgd29ya3MgYXQgZXh0cmFjdGFibGUgbG9jYXRpb24gdHlwZXMuIFNjaGVkdWxlcyBhbiBleHRyYWN0aW9uIHRhc2sgdGhhdCBjb25zdW1lcyBlbmVyZ3kgYW5kIHlpZWxkcyBjYXJnbyBiYXNlZCBvbiB0aGUgc2hpcCdzIGV4dHJhY3RvciBzdGF0cyBhbmQgdGhlIGxvY2F0aW9uJ3MgcmVzb3VyY2UgY29tcG9zaXRpb24uAABgbk2KsmIJZ2V0Y29uZmlnAACwctnlqbJiC2dldGVudGl0aWVzpAItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0ZW50aXRpZXMKc3VtbWFyeTogJ0dldCBhbGwgZW50aXRpZXMgZm9yIGEgcGxheWVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm5zIGZ1bGwgZW50aXR5IGluZm8gZm9yIGFsbCBlbnRpdGllcyBvd25lZCBieSBhIHBsYXllci4gT3B0aW9uYWxseSBmaWx0ZXIgYnkgZW50aXR5IHR5cGUuAADw2eWpsmIJZ2V0ZW50aXR5ogItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0ZW50aXR5CnN1bW1hcnk6ICdHZXQgZW50aXR5IHN0YXRlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm5zIHRoZSBjdXJyZW50IHN0YXRlIG9mIGFuIGVudGl0eSBpbmNsdWRpbmcgaWRlbnRpdHksIGNhcmdvLCBzY2hlZHVsZSBzdGF0ZSwgYW5kIHR5cGUtc3BlY2lmaWMgZmllbGRzLgAAAFiq7LJiCGdldGl0ZW1zmgItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0aXRlbXMKc3VtbWFyeTogJ0dldCBhbGwgYXZhaWxhYmxlIGl0ZW1zJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGEgbGlzdCBvZiBhbGwgaXRlbXMgaW4gdGhlIGdhbWUgaW5jbHVkaW5nIHRoZWlyIGlkLCBiYXNlIHByaWNlLCBhbmQgbWFzcy4AJnXZIBqzYgtnZXRsb2NhdGlvbuICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGxvY2F0aW9uCnN1bW1hcnk6ICdHZXQgbG9jYXRpb24gaW5mb3JtYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgYSBsb2NhdGlvbiBpbmNsdWRpbmcgd2hldGhlciBhIHN5c3RlbSBleGlzdHMsIGFuZCBmb3IgZWFjaCBpdGVtOiBwcmljZSwgc3VwcGx5LCByYXJpdHkgbXVsdGlwbGllciwgYW5kIGxvY2F0aW9uIG11bHRpcGxpZXIuAIDJJiEas2IKZ2V0bG9jZGF0Yf4CLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGxvY2RhdGEKc3VtbWFyeTogJ0dldCBkZXJpdmVkIGxvY2F0aW9uIGRhdGEnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgZGVyaXZlZCBsb2NhdGlvbiBkYXRhIGluY2x1ZGluZyBzdGF0aWMgcHJvcGVydGllcyAodHlwZSwgZGlmZmljdWx0eSwgc2VlZHMpIGZyb20gdGhlIGdhbWUgc2VlZCBhbmQgZXBvY2gtc3BlY2lmaWMgcHJvcGVydGllcyAoYWN0aXZlLCBzZWVkcykgZnJvbSB0aGUgY3VycmVudCBlcG9jaCBzZWVkLgAA8OcaNbNiCWdldG5lYXJied4DLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldG5lYXJieQpzdW1tYXJ5OiAnR2V0IG5lYXJieSByZWFjaGFibGUgc3lzdGVtcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBuZWFyYnkgc3lzdGVtcyByZWFjaGFibGUgYnkgYW4gZW50aXR5IGZyb20gaXRzIHByb2plY3RlZCBsb2NhdGlvbi4gUmV0dXJucyBjdXJyZW50IHN0YXRlICh3aXRoIGNvbXBsZXRlZCB0YXNrcyByZXNvbHZlZCksIHByb2plY3RlZCBzdGF0ZSAoYWZ0ZXIgYWxsIHNjaGVkdWxlZCB0YXNrcyksIGFuZCBhIGxpc3Qgb2YgcmVhY2hhYmxlIHN5c3RlbXMgd2l0aCBkaXN0YW5jZSwgZW5lcmd5IGNvc3QsIGZsaWdodCB0aW1lLCBhbmQgbWFya2V0IGluZm9ybWF0aW9uLgAAuMqbWLNiCWdldHBsYXllcv0CLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldHBsYXllcgpzdW1tYXJ5OiAnR2V0IHBsYXllciBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCBhIHBsYXllciBpbmNsdWRpbmcgYmFsYW5jZSwgZGVidCwgbmV0d29ydGgsIGVudGl0eSBjb3VudHMsIGFuZCBwcmljaW5nIGZvciBuZXh0IHB1cmNoYXNlcy4gUmV0dXJucyBpc19wbGF5ZXI9ZmFsc2UgaWYgdGhlIGFjY291bnQgaGFzIG5vdCBqb2luZWQgdGhlIGdhbWUuAMBV+ZqMs2IKZ2V0c3RhcnRlcoUDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldHN0YXJ0ZXIKc3VtbWFyeTogJ0dldCBzdGFydGVyIHNoaXAgYW5kIGJhbGFuY2UgaW5mb3JtYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgdGhlIHN0YXJ0ZXIgc2hpcCBzdGF0cyBhbmQgaW5pdGlhbCBiYWxhbmNlIGEgbmV3IHBsYXllciB3b3VsZCByZWNlaXZlIHVwb24gam9pbmluZy4gVXNlZCBmb3Igb25ib2FyZGluZyBVSSB0byBkaXNwbGF5IHdoYXQgcGxheWVycyB3aWxsIGdldCBiZWZvcmUgdGhleSByZWdpc3Rlci4AgNTZ3IyzYgpnZXRzdHJhdHVtAICVu0ZKjbNiDGdldHN1bW1hcmllc+gCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldHN1bW1hcmllcwpzdW1tYXJ5OiAnR2V0IGVudGl0eSBzdW1tYXJpZXMgZm9yIGEgcGxheWVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXR1cm5zIGxpZ2h0d2VpZ2h0IHN1bW1hcmllcyBvZiBhbGwgZW50aXRpZXMgb3duZWQgYnkgYSBwbGF5ZXIgaW5jbHVkaW5nIHR5cGUsIGlkLCBvd25lciwgbmFtZSwgbG9jYXRpb24sIGFuZCBpZGxlIHN0YXR1cy4gT3B0aW9uYWxseSBmaWx0ZXIgYnkgZW50aXR5IHR5cGUuAKLa5uaq6WULZ3JvdXB0cmF2ZWyaBC0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBncm91cHRyYXZlbApzdW1tYXJ5OiAnTW92ZSBtdWx0aXBsZSBlbnRpdGllcyB0b2dldGhlcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW5pdGlhdGUgZ3JvdXAgdHJhdmVsIGZvciBtdWx0aXBsZSBlbnRpdGllcyB0byBhIGRlc3RpbmF0aW9uLiBBbGwgZW50aXRpZXMgbXVzdCBiZSBhdCB0aGUgc2FtZSBsb2NhdGlvbiBhbmQgb3duZWQgYnkgdGhlIGNhbGxlci4gQXQgbGVhc3Qgb25lIGVudGl0eSB3aXRoIGVuZ2luZXMgaXMgcmVxdWlyZWQgdG8gcHJvdmlkZSB0aHJ1c3QuIEZsaWdodCBkdXJhdGlvbiBpcyBjYWxjdWxhdGVkIGZyb20gY29tYmluZWQgdGhydXN0IGFuZCB0b3RhbCBtYXNzIG9mIGFsbCBlbnRpdGllcy4gQ3JlYXRlcyBhbiBlbnRpdHlncm91cCBmb3IgYXRvbWljIHJlc29sdXRpb24gYW5kIGNhbmNlbGxhdGlvbi4AAAAAANCwaQRoYXNo/QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaGFzaApzdW1tYXJ5OiAnQ2FsY3VsYXRlIHNoYTI1NiBoYXNoJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGVzIHRoZSBzaGEyNTYgaGFzaCBvZiBhIHN0cmluZyBiYXNlZCB1c2luZyB0aGUgZ2FtZSBzZWVkLgoKLS0tAAAAQITSsGkHaGFzaDUxMvsBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGhhc2g1MTIKc3VtbWFyeTogJ0NhbGN1bGF0ZSBzaGE1MTIgaGFzaCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlcyB0aGUgc2hhNTEyIGhhc2ggb2YgYSBzdHJpbmcgYmFzZWQgdXNpbmcgdGhlIGdhbWUgc2VlZC4AAAAAAJDddARpbml0+gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaW5pdApzdW1tYXJ5OiAnSW5pdGlhbGl6ZSBnYW1lIHNlZWQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYWxpemUgYSB0aGUgZ2FtZXMgc2VlZCBhbmQgc2VlZCB2YWx1ZXMgdG8gYm9vdHN0cmFwIGdhbWUgc3RhdGUuAAAAAAAwHX0Eam9pbskBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGpvaW4Kc3VtbWFyeTogJ0pvaW4gYSBnYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpKb2luIGEgZ2FtZSBvZiBTaGlwbG9hZAoKLS0tAAAAAPjlMp0Gbm90aWZ5igMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogbm90aWZ5CnN1bW1hcnk6ICdUYXNrIGxpZmVjeWNsZSBub3RpZmljYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkludGVybmFsIGFjdGlvbiB0aGF0IG5vdGlmaWVzIGVudGl0eSBvd25lcnMgb2YgdGFzayBsaWZlY3ljbGUgZXZlbnRzIChyZXNvbHZlZCwgY2FuY2VsbGVkKS4gQ2FsbGVkIGlubGluZSB3aGVuIHRhc2tzIGNoYW5nZSBzdGF0ZS4gVXNlcyByZXF1aXJlX3JlY2lwaWVudCB0byBlbmFibGUgb2ZmLWNoYWluIG1vbml0b3JpbmcgdmlhIGFjdGlvbiB0cmFjZXMuAAAAYBoavakHcGF5bG9hbq8BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHBheWxvYW4Kc3VtbWFyeTogJ0xvYW4gUGF5bWVudCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQB8rFVjxa6uC3B1cmdlc3VwcGx56QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcHVyZ2VzdXBwbHkKc3VtbWFyeTogJ1VwZGF0ZSBHYW1lJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpQdXJnZSBvbGQgc3VwcGx5IHJlY29yZHMgYW5kIGhlbHAgY2xlYW51cCBnYW1lIHN0YXRlLgAAAIpd05C6CHJlY2hhcmdl0gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcmVjaGFyZ2UKc3VtbWFyeTogJ1JlY2hhcmdlIHNoaXAgZW5lcmd5JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTY2hlZHVsZSBhIHJlY2hhcmdlIHRhc2sgZm9yIGFuIGVudGl0eSB0byByZXN0b3JlIGVuZXJneSB0byBmdWxsIGNhcGFjaXR5LiBUaGUgcmVjaGFyZ2UgZHVyYXRpb24gZGVwZW5kcyBvbiBjdXJyZW50IGVuZXJneSBsZXZlbCBhbmQgcmVjaGFyZ2UgcmF0ZS4KCi0tLQAAAEDtSLG6B3Jlc29sdmXVAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiByZXNvbHZlCnN1bW1hcnk6ICdDb21wbGV0ZSBzY2hlZHVsZWQgdGFza3MnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJlc29sdmUgY29tcGxldGVkIHRhc2tzIGluIGFuIGVudGl0eSdzIHNjaGVkdWxlLCBhcHBseWluZyB0aGVpciBlZmZlY3RzIChyZWNoYXJnZSBlbmVyZ3ksIHVwZGF0ZSBsb2NhdGlvbiwgbG9hZC91bmxvYWQgY2FyZ28pLiBJZiBjb3VudCBpcyBzcGVjaWZpZWQsIHJlc29sdmUgZXhhY3RseSB0aGF0IG1hbnkgdGFza3M7IG90aGVyd2lzZSByZXNvbHZlIGFsbCBjb21wbGV0ZWQgdGFza3MuIEZhaWxzIGlmIGNvdW50IGV4Y2VlZHMgdGhlIG51bWJlciBvZiBjb21wbGV0ZWQgdGFza3MuCgotLS0AAAAAAJCjwQRzYWx03QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2FsdApzdW1tYXJ5OiAnQXBwZW5kIFNhbHQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkZCBhZGRpdGlvbmFsIHNhbHQgdG8gdGhlIG5leHQgZXBvY2ggc2VlZC4KCi0tLQAAwFJlF6PCCXNlbGxpdGVtc9UBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNlbGxpdGVtcwpzdW1tYXJ5OiAnU2VsbCBpdGVtcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2VsbCBpdGVtcyBmcm9tIGEgc2hpcCdzIGNhcmdvLgoKLS0tAAAA09CooMkIdGFrZWxvYW7qAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0YWtlbG9hbgpzdW1tYXJ5OiAnQ3JlZGl0IExvYW4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkJvcnJvdyBjcmVkaXRzIGZyb20gdGhlIGJhbmsgdGhhdCB3aWxsIG5lZWQgdG8gYmUgcmVwYWlkLgAAAFctPM3NCHRyYW5zZmVyyAMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdHJhbnNmZXIKc3VtbWFyeTogJ1RyYW5zZmVyIGNhcmdvIGJldHdlZW4gZW50aXRpZXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRyYW5zZmVyIGNhcmdvIGJldHdlZW4gdHdvIGVudGl0aWVzIGF0IHRoZSBzYW1lIGxvY2F0aW9uLiBCb3RoIGVudGl0aWVzIG11c3QgYmUgb3duZWQgYnkgdGhlIGNhbGxlciBhbmQgYXQgbGVhc3Qgb25lIG11c3QgaGF2ZSBsb2FkZXJzLiBDcmVhdGVzIGxvYWQgYW5kIHVubG9hZCB0YXNrcyBvbiBib3RoIGVudGl0aWVzIHdpdGggZHVyYXRpb24gYmFzZWQgb24gY29tYmluZWQgbG9hZGVyIGNhcGFjaXR5IGFuZCBaLWRpc3RhbmNlIGJldHdlZW4gdGhlbS4AAAAARLXNzQZ0cmF2ZWzLAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWwKc3VtbWFyeTogJ01vdmUgYSBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWF0ZSB0cmF2ZWwgb2YgYW4gZW50aXR5IGZyb20gaXRzIGN1cnJlbnQgbG9jYXRpb24gdG8gYSBuZXcgZGVzdGluYXRpb24uCgotLS0KClRoaXMgYWN0aW9uIGRldGVybWluZXMgdGhlIG1hcmtldCBwcmljZSBvZiBhbGwgaXRlbXMgYXQgYSBnaXZlbiBsb2NhdGlvbi6QXVIXqWxS1Qx1cGRhdGVjcmVkaXTCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1cGRhdGVjcmVkaXQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVjcmVkaXQgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAEA+KqlsUtUKdXBkYXRlZGVidL4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHVwZGF0ZWRlYnQKc3VtbWFyeTogJ0RFQlVHOiB1cGRhdGVkZWJ0IGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAAAAUK/hBHdhcnAAAAAAAACgquMEd2lwZbIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGUKc3VtbWFyeTogJ0RFQlVHOiB3aXBlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLaDQVNoqrKrjDHdpcGVzZXF1ZW5jZcIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGVzZXF1ZW5jZQpzdW1tYXJ5OiAnREVCVUc6IHdpcGVzZXF1ZW5jZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0MAAAAAADKrkEDaTY0AAAJY2FyZ29fcm93AAC4ajqTJ0UDaTY0AAANY29udGFpbmVyX3JvdwCqppf57PJUA2k2NAAAD2VudGl0eWdyb3VwX3JvdwAAAJO6bBCNA2k2NAAADGxvY2F0aW9uX3JvdwAAAABc5U2sA2k2NAAACnBsYXllcl9yb3cAAABA7auwugNpNjQAAAtyZXNlcnZlX3JvdwAAAApNpa3CA2k2NAAADHNlcXVlbmNlX3JvdwAAAAAAUF3DA2k2NAAACHNoaXBfcm93AAAAAACVTcYDaTY0AAAJc3RhdGVfcm93AAAAAPhYq8YDaTY0AAAKc3VwcGx5X3JvdwAAAAAArKrPA2k2NAAACXR5cGVzX3JvdwAAUFjTpq7hA2k2NAAADXdhcmVob3VzZV9yb3cBEVNoaXBsb2FkIChTZXJ2ZXIpEVNoaXBsb2FkIChTZXJ2ZXIpAAAAFwAAAFiq7Lw+DHRhc2tfcmVzdWx0cwAAAABEhaZBDmNhbmNlbF9yZXN1bHRzAAAAICNzc1cMdGFza19yZXN1bHRzAABgbk2KsmILZ2FtZV9jb25maWcAsHLZ5amyYg1lbnRpdHlfaW5mb1tdAADw2eWpsmILZW50aXR5X2luZm8AAABYquyyYgppdGVtc19pbmZvACZ12SAas2INbG9jYXRpb25faW5mbwCAySYhGrNiEGxvY2F0aW9uX2Rlcml2ZWQAAPDnGjWzYgtuZWFyYnlfaW5mbwAAuMqbWLNiC3BsYXllcl9pbmZvAMBV+ZqMs2IMc3RhcnRlcl9pbmZvAIDU2dyMs2IMc3RyYXR1bV9kYXRhgJW7RkqNs2IQZW50aXR5X3N1bW1hcnlbXQCi2ubmqullDHRhc2tfcmVzdWx0cwAAAAAA0LBpC2NoZWNrc3VtMjU2AAAAQITSsGkLY2hlY2tzdW01MTIAAACKXdOQugx0YXNrX3Jlc3VsdHMAAABA7Uixug9yZXNvbHZlX3Jlc3VsdHMAAMBSZRejwgx0YXNrX3Jlc3VsdHMAAABXLTzNzQx0YXNrX3Jlc3VsdHMAAAAARLXNzQx0YXNrX3Jlc3VsdHMAAAAAAFCv4Qx0YXNrX3Jlc3VsdHM='
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
        @Struct.field(warp_stats)
        declare ship_warp: warp_stats
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
    @Struct.type('getstratum')
    export class getstratum extends Struct {
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
        @Struct.field(UInt16)
        declare stratum: UInt16
    }
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
        @Struct.field(UInt16)
        declare size: UInt16
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
    @Struct.type('resource_stats')
    export class resource_stats extends Struct {
        @Struct.field(UInt16)
        declare stat1: UInt16
        @Struct.field(UInt16)
        declare stat2: UInt16
        @Struct.field(UInt16)
        declare stat3: UInt16
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
    @Struct.type('stratum_info')
    export class stratum_info extends Struct {
        @Struct.field(UInt16)
        declare item_id: UInt16
        @Struct.field(UInt64)
        declare seed: UInt64
        @Struct.field(UInt16)
        declare richness: UInt16
        @Struct.field(UInt32)
        declare reserve: UInt32
    }
    @Struct.type('stratum_data')
    export class stratum_data extends Struct {
        @Struct.field(stratum_info)
        declare stratum: stratum_info
        @Struct.field(resource_stats)
        declare stats: resource_stats
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
    @Struct.type('warp')
    export class warp extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
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
            ship_warp: Type.warp_stats
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
        export interface warp_stats {
            range: UInt32Type
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
    export interface getstratum {
        x: Int64Type
        y: Int64Type
        stratum: UInt16Type
    }
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
    export interface warp {
        entity_type: NameType
        id: UInt64Type
        x: Int64Type
        y: Int64Type
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
    getstratum: ActionParams.getstratum
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
    warp: ActionParams.warp
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
    getstratum: Types.stratum_data
    getsummaries: Types.entity_summary[]
    grouptravel: Types.task_results
    hash: Checksum256
    hash512: Checksum512
    recharge: Types.task_results
    resolve: Types.resolve_results
    sellitems: Types.task_results
    transfer: Types.task_results
    travel: Types.task_results
    warp: Types.task_results
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
