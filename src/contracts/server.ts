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
    'DmVvc2lvOjphYmkvMS4yAhVCX3ZlY3Rvcl9lbnRpdHlfcmVmX0UMZW50aXR5X3JlZltdDWxvY2F0aW9uX3R5cGUFdWludDhaB2FkdmFuY2UAAgZyZXZlYWwGc3RyaW5nBmNvbW1pdAtjaGVja3N1bTI1NgxidXljb250YWluZXIAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcIYnV5aXRlbXMABAtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIHYnV5c2hpcAACB2FjY291bnQEbmFtZQRuYW1lBnN0cmluZwxidXl3YXJlaG91c2UAAwdhY2NvdW50BG5hbWUHc2hpcF9pZAZ1aW50NjQEbmFtZQZzdHJpbmcGY2FuY2VsAAMLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQFY291bnQGdWludDY0DmNhbmNlbF9yZXN1bHRzAAYJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lD2NhbmNlbGxlZF9jb3VudAV1aW50OBBzY2hlZHVsZV9zdGFydGVkC3RpbWVfcG9pbnQ/C2VudGl0eWdyb3VwB3VpbnQ2ND8NZ3JvdXBfbWVtYmVycxZCX3ZlY3Rvcl9lbnRpdHlfcmVmX0U/CmNhcmdvX2l0ZW0ABAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIJdW5pdF9jb3N0BnVpbnQ2NARzZWVkB3VpbnQ2ND8JY2FyZ29fcm93AAYCaWQGdWludDY0CWVudGl0eV9pZAZ1aW50NjQHaXRlbV9pZAZ1aW50NjQIcXVhbnRpdHkGdWludDY0CXVuaXRfY29zdAZ1aW50NjQEc2VlZAZ1aW50NjQJY2xlYW5yc3ZwAAIFZXBvY2gGdWludDY0CG1heF9yb3dzBnVpbnQ2NApjbGVhcnRhYmxlAAMKdGFibGVfbmFtZQRuYW1lBXNjb3BlBW5hbWU/CG1heF9yb3dzB3VpbnQ2ND8GY29tbWl0AAEGY29tbWl0C2NoZWNrc3VtMjU2CWNvbmZpZ2xvZwABBmNvbmZpZwtnYW1lX2NvbmZpZw1jb250YWluZXJfcm93AAgCaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIaHVsbG1hc3MGdWludDMyCGNhcGFjaXR5BnVpbnQzMgljYXJnb21hc3MGdWludDMyCHNjaGVkdWxlCXNjaGVkdWxlPwtjb29yZGluYXRlcwADAXgFaW50NjQBeQVpbnQ2NAF6B3VpbnQxNj8GZW5hYmxlAAEHZW5hYmxlZARib29sDGVuZXJneV9zdGF0cwACCGNhcGFjaXR5BnVpbnQxNghyZWNoYXJnZQZ1aW50MTYUZW50aXR5X2N1cnJlbnRfc3RhdGUAAgtjb29yZGluYXRlcwtjb29yZGluYXRlcwZlbmVyZ3kGdWludDE2D2VudGl0eV9kZWZhdWx0cwAQDXNoaXBfaHVsbG1hc3MGdWludDMyDXNoaXBfY2FwYWNpdHkGdWludDMyC3NoaXBfZW5lcmd5BnVpbnQxNgZzaGlwX3oGdWludDE2DHNoaXBfZW5naW5lcw5tb3ZlbWVudF9zdGF0cw5zaGlwX2dlbmVyYXRvcgxlbmVyZ3lfc3RhdHMMc2hpcF9sb2FkZXJzDGxvYWRlcl9zdGF0cwpzaGlwX3RyYWRlC3RyYWRlX3N0YXRzDnNoaXBfZXh0cmFjdG9yD2V4dHJhY3Rvcl9zdGF0cwlzaGlwX3dhcnAKd2FycF9zdGF0cxJ3YXJlaG91c2VfY2FwYWNpdHkGdWludDMyC3dhcmVob3VzZV96BnVpbnQxNhF3YXJlaG91c2VfbG9hZGVycwxsb2FkZXJfc3RhdHMSY29udGFpbmVyX2h1bGxtYXNzBnVpbnQzMhJjb250YWluZXJfY2FwYWNpdHkGdWludDMyC2NvbnRhaW5lcl96BnVpbnQxNgtlbnRpdHlfaW5mbwAWBHR5cGUEbmFtZQJpZAZ1aW50NjQFb3duZXIEbmFtZQtlbnRpdHlfbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMJY2FyZ29tYXNzBnVpbnQzMgVjYXJnbwxjYXJnb19pdGVtW10HbG9hZGVycw1sb2FkZXJfc3RhdHM/BmVuZXJneQd1aW50MTY/CGh1bGxtYXNzB3VpbnQzMj8HZW5naW5lcw9tb3ZlbWVudF9zdGF0cz8JZ2VuZXJhdG9yDWVuZXJneV9zdGF0cz8IY2FwYWNpdHkHdWludDMyPwlleHRyYWN0b3IQZXh0cmFjdG9yX3N0YXRzPwR3YXJwC3dhcnBfc3RhdHM/B2lzX2lkbGUEYm9vbAxjdXJyZW50X3Rhc2sFdGFzaz8UY3VycmVudF90YXNrX2VsYXBzZWQGdWludDMyFmN1cnJlbnRfdGFza19yZW1haW5pbmcGdWludDMyDXBlbmRpbmdfdGFza3MGdGFza1tdB2lkbGVfYXQLdGltZV9wb2ludD8Ic2NoZWR1bGUJc2NoZWR1bGU/CmVudGl0eV9yZWYAAgtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQOZW50aXR5X3N1bW1hcnkACAR0eXBlBG5hbWUCaWQGdWludDY0BW93bmVyBG5hbWULZW50aXR5X25hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzB2lzX2lkbGUEYm9vbA5yZXNvbHZlZF9jb3VudAZ1aW50MzINcGVuZGluZ19jb3VudAZ1aW50MzIQZW50aXR5X3Rhc2tfaW5mbwAECWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQp0YXNrX2NvdW50BXVpbnQ4EHNjaGVkdWxlX3N0YXJ0ZWQKdGltZV9wb2ludA9lbnRpdHlncm91cF9yb3cAAgJpZAZ1aW50NjQMcGFydGljaXBhbnRzDGVudGl0eV9yZWZbXQdleHRyYWN0AAQLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQHc3RyYXR1bQZ1aW50MTYIcXVhbnRpdHkGdWludDMyD2V4dHJhY3Rvcl9zdGF0cwAFBHJhdGUGdWludDE2BWRyYWluBnVpbnQxNgplZmZpY2llbmN5BnVpbnQxNgVkZXB0aAZ1aW50MTYFZHJpbGwGdWludDE2C2dhbWVfY29uZmlnAAMHdmVyc2lvbgZ1aW50MzIIZGVmYXVsdHMPZW50aXR5X2RlZmF1bHRzBWl0ZW1zCml0ZW1fZGVmW10JZ2V0Y29uZmlnAAALZ2V0ZW50aXRpZXMAAgVvd25lcgRuYW1lC2VudGl0eV90eXBlBW5hbWU/CWdldGVudGl0eQACC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhnZXRpdGVtcwAAC2dldGxvY2F0aW9uAAIBeAVpbnQ2NAF5BWludDY0CmdldGxvY2RhdGEAAgF4BWludDY0AXkFaW50NjQJZ2V0bmVhcmJ5AAMLZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0CHJlY2hhcmdlBGJvb2wJZ2V0cGxheWVyAAEHYWNjb3VudARuYW1lCmdldHN0YXJ0ZXIAAApnZXRzdHJhdHVtAAMBeAVpbnQ2NAF5BWludDY0B3N0cmF0dW0GdWludDE2DGdldHN1bW1hcmllcwACBW93bmVyBG5hbWULZW50aXR5X3R5cGUFbmFtZT8LZ3JvdXB0cmF2ZWwABAhlbnRpdGllcwxlbnRpdHlfcmVmW10BeAVpbnQ2NAF5BWludDY0CHJlY2hhcmdlBGJvb2wEaGFzaAABBXZhbHVlBnN0cmluZwdoYXNoNTEyAAEFdmFsdWUGc3RyaW5nBGluaXQAAQRzZWVkC2NoZWNrc3VtMjU2CGl0ZW1fZGVmAAMCaWQGdWludDE2CmJhc2VfcHJpY2UGdWludDMyBG1hc3MGdWludDMyCml0ZW1zX2luZm8AAQVpdGVtcwppdGVtX2RlZltdBGpvaW4AAQdhY2NvdW50BG5hbWUMbG9hZGVyX3N0YXRzAAMEbWFzcwZ1aW50MzIGdGhydXN0BnVpbnQxNghxdWFudGl0eQV1aW50OBBsb2NhdGlvbl9kZXJpdmVkAAMMc3RhdGljX3Byb3BzD2xvY2F0aW9uX3N0YXRpYwtlcG9jaF9wcm9wcw5sb2NhdGlvbl9lcG9jaARzaXplBnVpbnQxNg5sb2NhdGlvbl9lcG9jaAADBmFjdGl2ZQRib29sBXNlZWQwBXVpbnQ4BXNlZWQxBXVpbnQ4DWxvY2F0aW9uX2luZm8AAwZjb29yZHMLY29vcmRpbmF0ZXMJaXNfc3lzdGVtBGJvb2wFaXRlbXMPbG9jYXRpb25faXRlbVtdDWxvY2F0aW9uX2l0ZW0ABQJpZAZ1aW50MTYFcHJpY2UGdWludDMyBnN1cHBseQZ1aW50MTYRcmFyaXR5X211bHRpcGxpZXIGdWludDMyE2xvY2F0aW9uX211bHRpcGxpZXIGdWludDMyDGxvY2F0aW9uX3JvdwAGAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCWNhcmdvbWFzcwZ1aW50MzIFY2FyZ28MY2FyZ29faXRlbVtdCHNjaGVkdWxlCXNjaGVkdWxlPw9sb2NhdGlvbl9zdGF0aWMABQZjb29yZHMLY29vcmRpbmF0ZXMEdHlwZQ1sb2NhdGlvbl90eXBlB3N1YnR5cGUFdWludDgFc2VlZDAFdWludDgFc2VlZDEFdWludDgObW92ZW1lbnRfc3RhdHMAAgZ0aHJ1c3QGdWludDMyBWRyYWluBnVpbnQxNgtuZWFyYnlfaW5mbwAFCmNhbl90cmF2ZWwEYm9vbAdjdXJyZW50FGVudGl0eV9jdXJyZW50X3N0YXRlCXByb2plY3RlZBRlbnRpdHlfY3VycmVudF9zdGF0ZQptYXhfZW5lcmd5BnVpbnQxNgdzeXN0ZW1zD25lYXJieV9zeXN0ZW1bXQ1uZWFyYnlfc3lzdGVtAAQIZGlzdGFuY2UGdWludDY0C2VuZXJneV9jb3N0BnVpbnQ2NAtmbGlnaHRfdGltZQZ1aW50MzIIbG9jYXRpb24NbG9jYXRpb25faW5mbwZub3RpZnkAAQVldmVudAp0YXNrX2V2ZW50B3BheWxvYW4AAgdhY2NvdW50BG5hbWUGYW1vdW50BnVpbnQ2NAtwbGF5ZXJfaW5mbwANBW93bmVyBG5hbWUJaXNfcGxheWVyBGJvb2wMY29tcGFueV9uYW1lBnN0cmluZwdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQzMghuZXR3b3J0aAVpbnQ2NA5hdmFpbGFibGVfbG9hbgZ1aW50NjQPbmV4dF9zaGlwX3ByaWNlBnVpbnQ2NBRuZXh0X3dhcmVob3VzZV9wcmljZQZ1aW50NjQUbmV4dF9jb250YWluZXJfcHJpY2UGdWludDY0CnNoaXBfY291bnQGdWludDY0D3dhcmVob3VzZV9jb3VudAZ1aW50NjQPY29udGFpbmVyX2NvdW50BnVpbnQ2NApwbGF5ZXJfcm93AAQFb3duZXIEbmFtZQdiYWxhbmNlBnVpbnQ2NARkZWJ0BnVpbnQzMghuZXR3b3J0aAVpbnQ2NAtwdXJnZXN1cHBseQABCG1heF9yb3dzB3VpbnQ2ND8IcmVjaGFyZ2UAAgtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAtyZXNlcnZlX3JvdwACAmlkBnVpbnQ2NAlyZW1haW5pbmcGdWludDMyB3Jlc29sdmUAAwtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAVjb3VudAd1aW50NjQ/D3Jlc29sdmVfcmVzdWx0cwAGCWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQ5yZXNvbHZlZF9jb3VudAV1aW50OBRuZXdfc2NoZWR1bGVfc3RhcnRlZAt0aW1lX3BvaW50PwtlbnRpdHlncm91cAd1aW50NjQ/DWdyb3VwX21lbWJlcnMWQl92ZWN0b3JfZW50aXR5X3JlZl9FPw5yZXNvdXJjZV9zdGF0cwAEBnB1cml0eQZ1aW50MTYHZGVuc2l0eQZ1aW50MTYKcmVhY3Rpdml0eQZ1aW50MTYJcmVzb25hbmNlBnVpbnQxNgRzYWx0AAEEc2FsdAZ1aW50NjQIc2NoZWR1bGUAAgdzdGFydGVkCnRpbWVfcG9pbnQFdGFza3MGdGFza1tdCXNlbGxpdGVtcwAEC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0B2l0ZW1faWQGdWludDE2CHF1YW50aXR5BnVpbnQzMgxzZXF1ZW5jZV9yb3cAAgNrZXkEbmFtZQV2YWx1ZQZ1aW50NjQIc2hpcF9yb3cADwJpZAZ1aW50NjQFb3duZXIEbmFtZQRuYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwhodWxsbWFzcwZ1aW50MzIIY2FwYWNpdHkGdWludDMyBmVuZXJneQZ1aW50MTYJY2FyZ29tYXNzBnVpbnQzMgdlbmdpbmVzDm1vdmVtZW50X3N0YXRzCWdlbmVyYXRvcgxlbmVyZ3lfc3RhdHMHbG9hZGVycwxsb2FkZXJfc3RhdHMFdHJhZGUMdHJhZGVfc3RhdHM/CWV4dHJhY3RvchBleHRyYWN0b3Jfc3RhdHM/BHdhcnALd2FycF9zdGF0cz8Ic2NoZWR1bGUJc2NoZWR1bGU/DHN0YXJ0ZXJfaW5mbwADB2JhbGFuY2UGdWludDY0BGRlYnQGdWludDY0BHNoaXALZW50aXR5X2luZm8Jc3RhdGVfcm93AAYHZW5hYmxlZARib29sBWVwb2NoBnVpbnQzMgRzYWx0BnVpbnQ2NAVzaGlwcwZ1aW50MzIEc2VlZAtjaGVja3N1bTI1NgZjb21taXQLY2hlY2tzdW0yNTYMc3RyYXR1bV9kYXRhAAIHc3RyYXR1bQxzdHJhdHVtX2luZm8Fc3RhdHMOcmVzb3VyY2Vfc3RhdHMMc3RyYXR1bV9pbmZvAAQHaXRlbV9pZAZ1aW50MTYEc2VlZAZ1aW50NjQIcmljaG5lc3MGdWludDE2B3Jlc2VydmUGdWludDMyCnN1cHBseV9yb3cABQJpZAZ1aW50NjQLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMFZXBvY2gGdWludDY0B2l0ZW1faWQGdWludDE2BnN1cHBseQZ1aW50MTYIdGFrZWxvYW4AAgdhY2NvdW50BG5hbWUGYW1vdW50BnVpbnQ2NAR0YXNrAAkEdHlwZQV1aW50OAhkdXJhdGlvbgZ1aW50MzIKY2FuY2VsYWJsZQV1aW50OAtjb29yZGluYXRlcwxjb29yZGluYXRlcz8FY2FyZ28MY2FyZ29faXRlbVtdDGVudGl0eXRhcmdldAtlbnRpdHlfcmVmPwtlbnRpdHlncm91cAd1aW50NjQ/B2NyZWRpdHMGaW50NjQ/C2VuZXJneV9jb3N0B3VpbnQxNj8KdGFza19ldmVudAAJCmV2ZW50X3R5cGUFdWludDgFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQKdGFza19pbmRleAV1aW50OAR0YXNrBHRhc2sJc3RhcnRzX2F0CnRpbWVfcG9pbnQMY29tcGxldGVzX2F0CnRpbWVfcG9pbnQKbmV3X2VuZXJneQd1aW50MTY/DHRhc2tfcmVzdWx0cwABCGVudGl0aWVzEmVudGl0eV90YXNrX2luZm9bXQt0cmFkZV9zdGF0cwABBm1hcmdpbgZ1aW50MTYIdHJhbnNmZXIABgtzb3VyY2VfdHlwZQRuYW1lCXNvdXJjZV9pZAZ1aW50NjQJZGVzdF90eXBlBG5hbWUHZGVzdF9pZAZ1aW50NjQHaXRlbV9pZAZ1aW50MTYIcXVhbnRpdHkGdWludDMyBnRyYXZlbAAFC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0AXgFaW50NjQBeQVpbnQ2NAhyZWNoYXJnZQRib29sCXR5cGVzX3JvdwAEAmlkBnVpbnQ2NBNlbnRpdHlfc3VtbWFyeV90eXBlDmVudGl0eV9zdW1tYXJ5EXN0YXJ0ZXJfaW5mb190eXBlDHN0YXJ0ZXJfaW5mbxBnYW1lX2NvbmZpZ190eXBlC2dhbWVfY29uZmlnDHVwZGF0ZWNyZWRpdAACB2FjY291bnQEbmFtZQZhbW91bnQFaW50NjQKdXBkYXRlZGVidAACB2FjY291bnQEbmFtZQZhbW91bnQFaW50NjQNd2FyZWhvdXNlX3JvdwAIAmlkBnVpbnQ2NAVvd25lcgRuYW1lBG5hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCGNhcGFjaXR5BnVpbnQzMgljYXJnb21hc3MGdWludDMyB2xvYWRlcnMMbG9hZGVyX3N0YXRzCHNjaGVkdWxlCXNjaGVkdWxlPwR3YXJwAAQLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQBeAVpbnQ2NAF5BWludDY0CndhcnBfc3RhdHMAAQVyYW5nZQZ1aW50MzIEd2lwZQAADHdpcGVzZXF1ZW5jZQAAKwAAAEChaXYyB2FkdmFuY2XTAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBhZHZhbmNlCnN1bW1hcnk6ICdBZHZhbmNlIHR1cm4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkdmFuY2UgdGhlIGdhbWUgdG8gdGhlIG5leHQgdHVybi5w1XQmT4q8PgxidXljb250YWluZXLKAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXljb250YWluZXIKc3VtbWFyeTogJ0J1eSBhIG5ldyBjb250YWluZXInCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClB1cmNoYXNlIGEgbmV3IGNvbnRhaW5lciBhdCB0aGUgbG9jYXRpb24gb2YgYW4gaWRsZSBzaGlwLiBDb250YWluZXJzIHByb3ZpZGUgY2FyZ28gc3RvcmFnZSBidXQgaGF2ZSBubyBsb2FkZXJzIGFuZCBjYW5ub3QgbW92ZSBpbmRlcGVuZGVudGx5LgAAAFiq7Lw+CGJ1eWl0ZW1z3QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYnV5aXRlbXMKc3VtbWFyeTogJ0J1eSBpdGVtcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUHVyY2hhc2UgaXRlbXMgYW5kIGFkZCB0aGVtIHRvIGEgc2hpcCdzIGNhcmdvLgAAAKC6hr0+B2J1eXNoaXDGAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBidXlzaGlwCnN1bW1hcnk6ICdCdXkgYSBuZXcgc2hpcCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUHVyY2hhc2UgYSBuZXcgc2hpcKCwpk1dw70+DGJ1eXdhcmVob3VzZcwCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGJ1eXdhcmVob3VzZQpzdW1tYXJ5OiAnQnV5IGEgbmV3IHdhcmVob3VzZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUHVyY2hhc2UgYSBuZXcgd2FyZWhvdXNlIGF0IHRoZSBsb2NhdGlvbiBvZiBhbiBpZGxlIHNoaXAuIFdhcmVob3VzZXMgcHJvdmlkZSBjYXJnbyBzdG9yYWdlIHdpdGggbG9hZGluZy91bmxvYWRpbmcgY2FwYWJpbGl0aWVzIGJ1dCBjYW5ub3QgbW92ZS4AAAAARIWmQQZjYW5jZWzHAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBjYW5jZWwKc3VtbWFyeTogJ0NhbmNlbCBzY2hlZHVsZWQgdGFza3MnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbmNlbCB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiB0YXNrcyBmcm9tIHRoZSBlbmQgb2YgYW4gZW50aXR5J3Mgc2NoZWR1bGUuIFRhc2tzIHRoYXQgYXJlIGltbXV0YWJsZSBhbmQgaW4gcHJvZ3Jlc3MgY2Fubm90IGJlIGNhbmNlbGxlZC4KCi0tLQAAqBvfaVRECWNsZWFucnN2cAAAgIrH5GtURApjbGVhcnRhYmxlvgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2xlYXJ0YWJsZQpzdW1tYXJ5OiAnREVCVUc6IGNsZWFydGFibGUgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAAAAAGQnJUUGY29tbWl08QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY29tbWl0CnN1bW1hcnk6ICdTZXQgY29tbWl0IHZhbHVlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTZXQgdGhlIGluaXRpYWwgY29tbWl0IHZhbHVlIGR1cmluZyBnYW1lIGluaXRpYWxpemF0aW9uLgoKLS0tAABgNDK3JkUJY29uZmlnbG9nAAAAAACoeMxUBmVuYWJsZeIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnU2V0IGVuYWJsZWQgc3RhdGUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoaXMgZ2FtZSBvZiBTaGlwbG9hZC4KCi0tLQAAACAjc3NXB2V4dHJhY3ShAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBleHRyYWN0CnN1bW1hcnk6ICdFeHRyYWN0IHJlc291cmNlcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRXh0cmFjdCByZXNvdXJjZXMgYXQgdGhlIHNoaXAncyBjdXJyZW50IGxvY2F0aW9uLiBPbmx5IHdvcmtzIGF0IGV4dHJhY3RhYmxlIGxvY2F0aW9uIHR5cGVzLiBTY2hlZHVsZXMgYW4gZXh0cmFjdGlvbiB0YXNrIHRoYXQgY29uc3VtZXMgZW5lcmd5IGFuZCB5aWVsZHMgY2FyZ28gYmFzZWQgb24gdGhlIHNoaXAncyBleHRyYWN0b3Igc3RhdHMgYW5kIHRoZSBsb2NhdGlvbidzIHJlc291cmNlIGNvbXBvc2l0aW9uLgAAYG5NirJiCWdldGNvbmZpZwAAsHLZ5amyYgtnZXRlbnRpdGllc6QCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGVudGl0aWVzCnN1bW1hcnk6ICdHZXQgYWxsIGVudGl0aWVzIGZvciBhIHBsYXllcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyBmdWxsIGVudGl0eSBpbmZvIGZvciBhbGwgZW50aXRpZXMgb3duZWQgYnkgYSBwbGF5ZXIuIE9wdGlvbmFsbHkgZmlsdGVyIGJ5IGVudGl0eSB0eXBlLgAA8NnlqbJiCWdldGVudGl0eaICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGVudGl0eQpzdW1tYXJ5OiAnR2V0IGVudGl0eSBzdGF0ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyB0aGUgY3VycmVudCBzdGF0ZSBvZiBhbiBlbnRpdHkgaW5jbHVkaW5nIGlkZW50aXR5LCBjYXJnbywgc2NoZWR1bGUgc3RhdGUsIGFuZCB0eXBlLXNwZWNpZmljIGZpZWxkcy4AAABYquyyYghnZXRpdGVtc5oCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGl0ZW1zCnN1bW1hcnk6ICdHZXQgYWxsIGF2YWlsYWJsZSBpdGVtcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBhIGxpc3Qgb2YgYWxsIGl0ZW1zIGluIHRoZSBnYW1lIGluY2x1ZGluZyB0aGVpciBpZCwgYmFzZSBwcmljZSwgYW5kIG1hc3MuACZ12SAas2ILZ2V0bG9jYXRpb27iAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRsb2NhdGlvbgpzdW1tYXJ5OiAnR2V0IGxvY2F0aW9uIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IGEgbG9jYXRpb24gaW5jbHVkaW5nIHdoZXRoZXIgYSBzeXN0ZW0gZXhpc3RzLCBhbmQgZm9yIGVhY2ggaXRlbTogcHJpY2UsIHN1cHBseSwgcmFyaXR5IG11bHRpcGxpZXIsIGFuZCBsb2NhdGlvbiBtdWx0aXBsaWVyLgCAySYhGrNiCmdldGxvY2RhdGH+Ai0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRsb2NkYXRhCnN1bW1hcnk6ICdHZXQgZGVyaXZlZCBsb2NhdGlvbiBkYXRhJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGRlcml2ZWQgbG9jYXRpb24gZGF0YSBpbmNsdWRpbmcgc3RhdGljIHByb3BlcnRpZXMgKHR5cGUsIGRpZmZpY3VsdHksIHNlZWRzKSBmcm9tIHRoZSBnYW1lIHNlZWQgYW5kIGVwb2NoLXNwZWNpZmljIHByb3BlcnRpZXMgKGFjdGl2ZSwgc2VlZHMpIGZyb20gdGhlIGN1cnJlbnQgZXBvY2ggc2VlZC4AAPDnGjWzYglnZXRuZWFyYnneAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRuZWFyYnkKc3VtbWFyeTogJ0dldCBuZWFyYnkgcmVhY2hhYmxlIHN5c3RlbXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgbmVhcmJ5IHN5c3RlbXMgcmVhY2hhYmxlIGJ5IGFuIGVudGl0eSBmcm9tIGl0cyBwcm9qZWN0ZWQgbG9jYXRpb24uIFJldHVybnMgY3VycmVudCBzdGF0ZSAod2l0aCBjb21wbGV0ZWQgdGFza3MgcmVzb2x2ZWQpLCBwcm9qZWN0ZWQgc3RhdGUgKGFmdGVyIGFsbCBzY2hlZHVsZWQgdGFza3MpLCBhbmQgYSBsaXN0IG9mIHJlYWNoYWJsZSBzeXN0ZW1zIHdpdGggZGlzdGFuY2UsIGVuZXJneSBjb3N0LCBmbGlnaHQgdGltZSwgYW5kIG1hcmtldCBpbmZvcm1hdGlvbi4AALjKm1izYglnZXRwbGF5ZXL9Ai0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRwbGF5ZXIKc3VtbWFyeTogJ0dldCBwbGF5ZXIgaW5mb3JtYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgYSBwbGF5ZXIgaW5jbHVkaW5nIGJhbGFuY2UsIGRlYnQsIG5ldHdvcnRoLCBlbnRpdHkgY291bnRzLCBhbmQgcHJpY2luZyBmb3IgbmV4dCBwdXJjaGFzZXMuIFJldHVybnMgaXNfcGxheWVyPWZhbHNlIGlmIHRoZSBhY2NvdW50IGhhcyBub3Qgam9pbmVkIHRoZSBnYW1lLgDAVfmajLNiCmdldHN0YXJ0ZXKFAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRzdGFydGVyCnN1bW1hcnk6ICdHZXQgc3RhcnRlciBzaGlwIGFuZCBiYWxhbmNlIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIHRoZSBzdGFydGVyIHNoaXAgc3RhdHMgYW5kIGluaXRpYWwgYmFsYW5jZSBhIG5ldyBwbGF5ZXIgd291bGQgcmVjZWl2ZSB1cG9uIGpvaW5pbmcuIFVzZWQgZm9yIG9uYm9hcmRpbmcgVUkgdG8gZGlzcGxheSB3aGF0IHBsYXllcnMgd2lsbCBnZXQgYmVmb3JlIHRoZXkgcmVnaXN0ZXIuAIDU2dyMs2IKZ2V0c3RyYXR1bQCAlbtGSo2zYgxnZXRzdW1tYXJpZXPoAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRzdW1tYXJpZXMKc3VtbWFyeTogJ0dldCBlbnRpdHkgc3VtbWFyaWVzIGZvciBhIHBsYXllcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyBsaWdodHdlaWdodCBzdW1tYXJpZXMgb2YgYWxsIGVudGl0aWVzIG93bmVkIGJ5IGEgcGxheWVyIGluY2x1ZGluZyB0eXBlLCBpZCwgb3duZXIsIG5hbWUsIGxvY2F0aW9uLCBhbmQgaWRsZSBzdGF0dXMuIE9wdGlvbmFsbHkgZmlsdGVyIGJ5IGVudGl0eSB0eXBlLgCi2ubmqullC2dyb3VwdHJhdmVsmgQtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ3JvdXB0cmF2ZWwKc3VtbWFyeTogJ01vdmUgbXVsdGlwbGUgZW50aXRpZXMgdG9nZXRoZXInCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYXRlIGdyb3VwIHRyYXZlbCBmb3IgbXVsdGlwbGUgZW50aXRpZXMgdG8gYSBkZXN0aW5hdGlvbi4gQWxsIGVudGl0aWVzIG11c3QgYmUgYXQgdGhlIHNhbWUgbG9jYXRpb24gYW5kIG93bmVkIGJ5IHRoZSBjYWxsZXIuIEF0IGxlYXN0IG9uZSBlbnRpdHkgd2l0aCBlbmdpbmVzIGlzIHJlcXVpcmVkIHRvIHByb3ZpZGUgdGhydXN0LiBGbGlnaHQgZHVyYXRpb24gaXMgY2FsY3VsYXRlZCBmcm9tIGNvbWJpbmVkIHRocnVzdCBhbmQgdG90YWwgbWFzcyBvZiBhbGwgZW50aXRpZXMuIENyZWF0ZXMgYW4gZW50aXR5Z3JvdXAgZm9yIGF0b21pYyByZXNvbHV0aW9uIGFuZCBjYW5jZWxsYXRpb24uAAAAAADQsGkEaGFzaP0BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGhhc2gKc3VtbWFyeTogJ0NhbGN1bGF0ZSBzaGEyNTYgaGFzaCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlcyB0aGUgc2hhMjU2IGhhc2ggb2YgYSBzdHJpbmcgYmFzZWQgdXNpbmcgdGhlIGdhbWUgc2VlZC4KCi0tLQAAAECE0rBpB2hhc2g1MTL7AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBoYXNoNTEyCnN1bW1hcnk6ICdDYWxjdWxhdGUgc2hhNTEyIGhhc2gnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbGN1bGF0ZXMgdGhlIHNoYTUxMiBoYXNoIG9mIGEgc3RyaW5nIGJhc2VkIHVzaW5nIHRoZSBnYW1lIHNlZWQuAAAAAACQ3XQEaW5pdPoBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGluaXQKc3VtbWFyeTogJ0luaXRpYWxpemUgZ2FtZSBzZWVkJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWFsaXplIGEgdGhlIGdhbWVzIHNlZWQgYW5kIHNlZWQgdmFsdWVzIHRvIGJvb3RzdHJhcCBnYW1lIHN0YXRlLgAAAAAAMB19BGpvaW7JAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBqb2luCnN1bW1hcnk6ICdKb2luIGEgZ2FtZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSm9pbiBhIGdhbWUgb2YgU2hpcGxvYWQKCi0tLQAAAAD45TKdBm5vdGlmeYoDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IG5vdGlmeQpzdW1tYXJ5OiAnVGFzayBsaWZlY3ljbGUgbm90aWZpY2F0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbnRlcm5hbCBhY3Rpb24gdGhhdCBub3RpZmllcyBlbnRpdHkgb3duZXJzIG9mIHRhc2sgbGlmZWN5Y2xlIGV2ZW50cyAocmVzb2x2ZWQsIGNhbmNlbGxlZCkuIENhbGxlZCBpbmxpbmUgd2hlbiB0YXNrcyBjaGFuZ2Ugc3RhdGUuIFVzZXMgcmVxdWlyZV9yZWNpcGllbnQgdG8gZW5hYmxlIG9mZi1jaGFpbiBtb25pdG9yaW5nIHZpYSBhY3Rpb24gdHJhY2VzLgAAAGAaGr2pB3BheWxvYW6vAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBwYXlsb2FuCnN1bW1hcnk6ICdMb2FuIFBheW1lbnQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0AfKxVY8WurgtwdXJnZXN1cHBseekBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHB1cmdlc3VwcGx5CnN1bW1hcnk6ICdVcGRhdGUgR2FtZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUHVyZ2Ugb2xkIHN1cHBseSByZWNvcmRzIGFuZCBoZWxwIGNsZWFudXAgZ2FtZSBzdGF0ZS4AAACKXdOQughyZWNoYXJnZdICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHJlY2hhcmdlCnN1bW1hcnk6ICdSZWNoYXJnZSBzaGlwIGVuZXJneScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2NoZWR1bGUgYSByZWNoYXJnZSB0YXNrIGZvciBhbiBlbnRpdHkgdG8gcmVzdG9yZSBlbmVyZ3kgdG8gZnVsbCBjYXBhY2l0eS4gVGhlIHJlY2hhcmdlIGR1cmF0aW9uIGRlcGVuZHMgb24gY3VycmVudCBlbmVyZ3kgbGV2ZWwgYW5kIHJlY2hhcmdlIHJhdGUuCgotLS0AAABA7UixugdyZXNvbHZl1QMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcmVzb2x2ZQpzdW1tYXJ5OiAnQ29tcGxldGUgc2NoZWR1bGVkIHRhc2tzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXNvbHZlIGNvbXBsZXRlZCB0YXNrcyBpbiBhbiBlbnRpdHkncyBzY2hlZHVsZSwgYXBwbHlpbmcgdGhlaXIgZWZmZWN0cyAocmVjaGFyZ2UgZW5lcmd5LCB1cGRhdGUgbG9jYXRpb24sIGxvYWQvdW5sb2FkIGNhcmdvKS4gSWYgY291bnQgaXMgc3BlY2lmaWVkLCByZXNvbHZlIGV4YWN0bHkgdGhhdCBtYW55IHRhc2tzOyBvdGhlcndpc2UgcmVzb2x2ZSBhbGwgY29tcGxldGVkIHRhc2tzLiBGYWlscyBpZiBjb3VudCBleGNlZWRzIHRoZSBudW1iZXIgb2YgY29tcGxldGVkIHRhc2tzLgoKLS0tAAAAAACQo8EEc2FsdN0BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNhbHQKc3VtbWFyeTogJ0FwcGVuZCBTYWx0JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZGQgYWRkaXRpb25hbCBzYWx0IHRvIHRoZSBuZXh0IGVwb2NoIHNlZWQuCgotLS0AAMBSZRejwglzZWxsaXRlbXPVAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBzZWxsaXRlbXMKc3VtbWFyeTogJ1NlbGwgaXRlbXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClNlbGwgaXRlbXMgZnJvbSBhIHNoaXAncyBjYXJnby4KCi0tLQAAANPQqKDJCHRha2Vsb2Fu6gEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdGFrZWxvYW4Kc3VtbWFyeTogJ0NyZWRpdCBMb2FuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpCb3Jyb3cgY3JlZGl0cyBmcm9tIHRoZSBiYW5rIHRoYXQgd2lsbCBuZWVkIHRvIGJlIHJlcGFpZC4AAABXLTzNzQh0cmFuc2ZlcsgDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHRyYW5zZmVyCnN1bW1hcnk6ICdUcmFuc2ZlciBjYXJnbyBiZXR3ZWVuIGVudGl0aWVzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUcmFuc2ZlciBjYXJnbyBiZXR3ZWVuIHR3byBlbnRpdGllcyBhdCB0aGUgc2FtZSBsb2NhdGlvbi4gQm90aCBlbnRpdGllcyBtdXN0IGJlIG93bmVkIGJ5IHRoZSBjYWxsZXIgYW5kIGF0IGxlYXN0IG9uZSBtdXN0IGhhdmUgbG9hZGVycy4gQ3JlYXRlcyBsb2FkIGFuZCB1bmxvYWQgdGFza3Mgb24gYm90aCBlbnRpdGllcyB3aXRoIGR1cmF0aW9uIGJhc2VkIG9uIGNvbWJpbmVkIGxvYWRlciBjYXBhY2l0eSBhbmQgWi1kaXN0YW5jZSBiZXR3ZWVuIHRoZW0uAAAAAES1zc0GdHJhdmVsywItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdHJhdmVsCnN1bW1hcnk6ICdNb3ZlIGEgc2hpcCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW5pdGlhdGUgdHJhdmVsIG9mIGFuIGVudGl0eSBmcm9tIGl0cyBjdXJyZW50IGxvY2F0aW9uIHRvIGEgbmV3IGRlc3RpbmF0aW9uLgoKLS0tCgpUaGlzIGFjdGlvbiBkZXRlcm1pbmVzIHRoZSBtYXJrZXQgcHJpY2Ugb2YgYWxsIGl0ZW1zIGF0IGEgZ2l2ZW4gbG9jYXRpb24ukF1SF6lsUtUMdXBkYXRlY3JlZGl0wgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdXBkYXRlY3JlZGl0CnN1bW1hcnk6ICdERUJVRzogdXBkYXRlY3JlZGl0IGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQBAPiqpbFLVCnVwZGF0ZWRlYnS+AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB1cGRhdGVkZWJ0CnN1bW1hcnk6ICdERUJVRzogdXBkYXRlZGVidCBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0AAAAAAFCv4QR3YXJwAAAAAAAAoKrjBHdpcGWyAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlCnN1bW1hcnk6ICdERUJVRzogd2lwZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS2g0FTaKqyq4wx3aXBlc2VxdWVuY2XCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlc2VxdWVuY2UKc3VtbWFyeTogJ0RFQlVHOiB3aXBlc2VxdWVuY2UgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tDAAAAAAAyq5BA2k2NAAACWNhcmdvX3JvdwAAuGo6kydFA2k2NAAADWNvbnRhaW5lcl9yb3cAqqaX+ezyVANpNjQAAA9lbnRpdHlncm91cF9yb3cAAACTumwQjQNpNjQAAAxsb2NhdGlvbl9yb3cAAAAAXOVNrANpNjQAAApwbGF5ZXJfcm93AAAAQO2rsLoDaTY0AAALcmVzZXJ2ZV9yb3cAAAAKTaWtwgNpNjQAAAxzZXF1ZW5jZV9yb3cAAAAAAFBdwwNpNjQAAAhzaGlwX3JvdwAAAAAAlU3GA2k2NAAACXN0YXRlX3JvdwAAAAD4WKvGA2k2NAAACnN1cHBseV9yb3cAAAAAAKyqzwNpNjQAAAl0eXBlc19yb3cAAFBY06au4QNpNjQAAA13YXJlaG91c2Vfcm93ARFTaGlwbG9hZCAoU2VydmVyKRFTaGlwbG9hZCAoU2VydmVyKQAAABcAAABYquy8Pgx0YXNrX3Jlc3VsdHMAAAAARIWmQQ5jYW5jZWxfcmVzdWx0cwAAACAjc3NXDHRhc2tfcmVzdWx0cwAAYG5NirJiC2dhbWVfY29uZmlnALBy2eWpsmINZW50aXR5X2luZm9bXQAA8NnlqbJiC2VudGl0eV9pbmZvAAAAWKrssmIKaXRlbXNfaW5mbwAmddkgGrNiDWxvY2F0aW9uX2luZm8AgMkmIRqzYhBsb2NhdGlvbl9kZXJpdmVkAADw5xo1s2ILbmVhcmJ5X2luZm8AALjKm1izYgtwbGF5ZXJfaW5mbwDAVfmajLNiDHN0YXJ0ZXJfaW5mbwCA1NncjLNiDHN0cmF0dW1fZGF0YYCVu0ZKjbNiEGVudGl0eV9zdW1tYXJ5W10Aotrm5qrpZQx0YXNrX3Jlc3VsdHMAAAAAANCwaQtjaGVja3N1bTI1NgAAAECE0rBpC2NoZWNrc3VtNTEyAAAAil3TkLoMdGFza19yZXN1bHRzAAAAQO1IsboPcmVzb2x2ZV9yZXN1bHRzAADAUmUXo8IMdGFza19yZXN1bHRzAAAAVy08zc0MdGFza19yZXN1bHRzAAAAAES1zc0MdGFza19yZXN1bHRzAAAAAABQr+EMdGFza19yZXN1bHRz'
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
        declare purity: UInt16
        @Struct.field(UInt16)
        declare density: UInt16
        @Struct.field(UInt16)
        declare reactivity: UInt16
        @Struct.field(UInt16)
        declare resonance: UInt16
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
