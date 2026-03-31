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
    'DmVvc2lvOjphYmkvMS4yAhVCX3ZlY3Rvcl9lbnRpdHlfcmVmX0UMZW50aXR5X3JlZltdDWxvY2F0aW9uX3R5cGUFdWludDhPB2FkdmFuY2UAAgZyZXZlYWwGc3RyaW5nBmNvbW1pdAtjaGVja3N1bTI1NgZjYW5jZWwAAwtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAVjb3VudAZ1aW50NjQOY2FuY2VsX3Jlc3VsdHMABgllbnRpdHlfaWQGdWludDY0C2VudGl0eV90eXBlBG5hbWUPY2FuY2VsbGVkX2NvdW50BXVpbnQ4EHNjaGVkdWxlX3N0YXJ0ZWQLdGltZV9wb2ludD8LZW50aXR5Z3JvdXAHdWludDY0Pw1ncm91cF9tZW1iZXJzFkJfdmVjdG9yX2VudGl0eV9yZWZfRT8KY2FyZ29faXRlbQADB2l0ZW1faWQGdWludDE2CHF1YW50aXR5BnVpbnQzMgRzZWVkB3VpbnQ2ND8JY2FyZ29fcm93AAUCaWQGdWludDY0CWVudGl0eV9pZAZ1aW50NjQHaXRlbV9pZAZ1aW50NjQIcXVhbnRpdHkGdWludDY0BHNlZWQGdWludDY0CWNsZWFucnN2cAACBWVwb2NoBnVpbnQ2NAhtYXhfcm93cwZ1aW50NjQKY2xlYXJ0YWJsZQADCnRhYmxlX25hbWUEbmFtZQVzY29wZQVuYW1lPwhtYXhfcm93cwd1aW50NjQ/BmNvbW1pdAABBmNvbW1pdAtjaGVja3N1bTI1Ngljb25maWdsb2cAAQZjb25maWcLZ2FtZV9jb25maWcNY29udGFpbmVyX3JvdwAIAmlkBnVpbnQ2NAVvd25lcgRuYW1lBG5hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCGh1bGxtYXNzBnVpbnQzMghjYXBhY2l0eQZ1aW50MzIJY2FyZ29tYXNzBnVpbnQzMghzY2hlZHVsZQlzY2hlZHVsZT8LY29vcmRpbmF0ZXMAAwF4BWludDY0AXkFaW50NjQBegd1aW50MTY/DGNyZWF0ZWVudGl0eQAFBW93bmVyBG5hbWULZW50aXR5X3R5cGUEbmFtZQtlbnRpdHlfbmFtZQZzdHJpbmcBeAVpbnQ2NAF5BWludDY0BmVuYWJsZQABB2VuYWJsZWQEYm9vbAxlbmVyZ3lfc3RhdHMAAghjYXBhY2l0eQZ1aW50MTYIcmVjaGFyZ2UGdWludDE2FGVudGl0eV9jdXJyZW50X3N0YXRlAAILY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMGZW5lcmd5BnVpbnQxNg9lbnRpdHlfZGVmYXVsdHMADw1zaGlwX2h1bGxtYXNzBnVpbnQzMg1zaGlwX2NhcGFjaXR5BnVpbnQzMgtzaGlwX2VuZXJneQZ1aW50MTYGc2hpcF96BnVpbnQxNgxzaGlwX2VuZ2luZXMObW92ZW1lbnRfc3RhdHMOc2hpcF9nZW5lcmF0b3IMZW5lcmd5X3N0YXRzDHNoaXBfbG9hZGVycwxsb2FkZXJfc3RhdHMOc2hpcF9leHRyYWN0b3IPZXh0cmFjdG9yX3N0YXRzCXNoaXBfd2FycAp3YXJwX3N0YXRzEndhcmVob3VzZV9jYXBhY2l0eQZ1aW50MzILd2FyZWhvdXNlX3oGdWludDE2EXdhcmVob3VzZV9sb2FkZXJzDGxvYWRlcl9zdGF0cxJjb250YWluZXJfaHVsbG1hc3MGdWludDMyEmNvbnRhaW5lcl9jYXBhY2l0eQZ1aW50MzILY29udGFpbmVyX3oGdWludDE2C2VudGl0eV9pbmZvABYEdHlwZQRuYW1lAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2VudGl0eV9uYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwljYXJnb21hc3MGdWludDMyBWNhcmdvDGNhcmdvX2l0ZW1bXQdsb2FkZXJzDWxvYWRlcl9zdGF0cz8GZW5lcmd5B3VpbnQxNj8IaHVsbG1hc3MHdWludDMyPwdlbmdpbmVzD21vdmVtZW50X3N0YXRzPwlnZW5lcmF0b3INZW5lcmd5X3N0YXRzPwhjYXBhY2l0eQd1aW50MzI/CWV4dHJhY3RvchBleHRyYWN0b3Jfc3RhdHM/BHdhcnALd2FycF9zdGF0cz8HaXNfaWRsZQRib29sDGN1cnJlbnRfdGFzawV0YXNrPxRjdXJyZW50X3Rhc2tfZWxhcHNlZAZ1aW50MzIWY3VycmVudF90YXNrX3JlbWFpbmluZwZ1aW50MzINcGVuZGluZ190YXNrcwZ0YXNrW10HaWRsZV9hdAt0aW1lX3BvaW50PwhzY2hlZHVsZQlzY2hlZHVsZT8KZW50aXR5X3JlZgACC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NA5lbnRpdHlfc3VtbWFyeQAIBHR5cGUEbmFtZQJpZAZ1aW50NjQFb3duZXIEbmFtZQtlbnRpdHlfbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMHaXNfaWRsZQRib29sDnJlc29sdmVkX2NvdW50BnVpbnQzMg1wZW5kaW5nX2NvdW50BnVpbnQzMhBlbnRpdHlfdGFza19pbmZvAAQJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lCnRhc2tfY291bnQFdWludDgQc2NoZWR1bGVfc3RhcnRlZAp0aW1lX3BvaW50D2VudGl0eWdyb3VwX3JvdwACAmlkBnVpbnQ2NAxwYXJ0aWNpcGFudHMMZW50aXR5X3JlZltdB2V4dHJhY3QABAtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAdzdHJhdHVtBnVpbnQxNghxdWFudGl0eQZ1aW50MzIPZXh0cmFjdG9yX3N0YXRzAAUEcmF0ZQZ1aW50MTYFZHJhaW4GdWludDE2CmVmZmljaWVuY3kGdWludDE2BWRlcHRoBnVpbnQxNgVkcmlsbAZ1aW50MTYLZ2FtZV9jb25maWcAAwd2ZXJzaW9uBnVpbnQzMghkZWZhdWx0cw9lbnRpdHlfZGVmYXVsdHMFaXRlbXMKaXRlbV9kZWZbXQlnZXRjb25maWcAAAtnZXRlbnRpdGllcwACBW93bmVyBG5hbWULZW50aXR5X3R5cGUFbmFtZT8JZ2V0ZW50aXR5AAILZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0CGdldGl0ZW1zAAALZ2V0bG9jYXRpb24AAgF4BWludDY0AXkFaW50NjQKZ2V0bG9jZGF0YQACAXgFaW50NjQBeQVpbnQ2NAlnZXRuZWFyYnkAAwtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQIcmVjaGFyZ2UEYm9vbAlnZXRwbGF5ZXIAAQdhY2NvdW50BG5hbWUKZ2V0c3RhcnRlcgAACmdldHN0cmF0dW0AAwF4BWludDY0AXkFaW50NjQHc3RyYXR1bQZ1aW50MTYMZ2V0c3VtbWFyaWVzAAIFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQVuYW1lPwtncm91cHRyYXZlbAAECGVudGl0aWVzDGVudGl0eV9yZWZbXQF4BWludDY0AXkFaW50NjQIcmVjaGFyZ2UEYm9vbARoYXNoAAEFdmFsdWUGc3RyaW5nB2hhc2g1MTIAAQV2YWx1ZQZzdHJpbmcEaW5pdAABBHNlZWQLY2hlY2tzdW0yNTYIaXRlbV9kZWYAAgJpZAZ1aW50MTYEbWFzcwZ1aW50MzIKaXRlbXNfaW5mbwABBWl0ZW1zCml0ZW1fZGVmW10Eam9pbgABB2FjY291bnQEbmFtZQxsb2FkZXJfc3RhdHMAAwRtYXNzBnVpbnQzMgZ0aHJ1c3QGdWludDE2CHF1YW50aXR5BXVpbnQ4EGxvY2F0aW9uX2Rlcml2ZWQAAwxzdGF0aWNfcHJvcHMPbG9jYXRpb25fc3RhdGljC2Vwb2NoX3Byb3BzDmxvY2F0aW9uX2Vwb2NoBHNpemUGdWludDE2DmxvY2F0aW9uX2Vwb2NoAAMGYWN0aXZlBGJvb2wFc2VlZDAFdWludDgFc2VlZDEFdWludDgNbG9jYXRpb25faW5mbwACBmNvb3Jkcwtjb29yZGluYXRlcwlpc19zeXN0ZW0EYm9vbAxsb2NhdGlvbl9yb3cABgJpZAZ1aW50NjQFb3duZXIEbmFtZQtjb29yZGluYXRlcwtjb29yZGluYXRlcwljYXJnb21hc3MGdWludDMyBWNhcmdvDGNhcmdvX2l0ZW1bXQhzY2hlZHVsZQlzY2hlZHVsZT8PbG9jYXRpb25fc3RhdGljAAUGY29vcmRzC2Nvb3JkaW5hdGVzBHR5cGUNbG9jYXRpb25fdHlwZQdzdWJ0eXBlBXVpbnQ4BXNlZWQwBXVpbnQ4BXNlZWQxBXVpbnQ4Dm1vdmVtZW50X3N0YXRzAAIGdGhydXN0BnVpbnQzMgVkcmFpbgZ1aW50MTYLbmVhcmJ5X2luZm8ABQpjYW5fdHJhdmVsBGJvb2wHY3VycmVudBRlbnRpdHlfY3VycmVudF9zdGF0ZQlwcm9qZWN0ZWQUZW50aXR5X2N1cnJlbnRfc3RhdGUKbWF4X2VuZXJneQZ1aW50MTYHc3lzdGVtcw9uZWFyYnlfc3lzdGVtW10NbmVhcmJ5X3N5c3RlbQAECGRpc3RhbmNlBnVpbnQ2NAtlbmVyZ3lfY29zdAZ1aW50NjQLZmxpZ2h0X3RpbWUGdWludDMyCGxvY2F0aW9uDWxvY2F0aW9uX2luZm8Gbm90aWZ5AAEFZXZlbnQKdGFza19ldmVudAtwbGF5ZXJfaW5mbwAGBW93bmVyBG5hbWUJaXNfcGxheWVyBGJvb2wMY29tcGFueV9uYW1lBnN0cmluZwpzaGlwX2NvdW50BnVpbnQ2NA93YXJlaG91c2VfY291bnQGdWludDY0D2NvbnRhaW5lcl9jb3VudAZ1aW50NjQKcGxheWVyX3JvdwABBW93bmVyBG5hbWUIcmVjaGFyZ2UAAgtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAtyZXNlcnZlX3JvdwACAmlkBnVpbnQ2NAlyZW1haW5pbmcGdWludDMyB3Jlc29sdmUAAwtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAVjb3VudAd1aW50NjQ/D3Jlc29sdmVfcmVzdWx0cwAGCWVudGl0eV9pZAZ1aW50NjQLZW50aXR5X3R5cGUEbmFtZQ5yZXNvbHZlZF9jb3VudAV1aW50OBRuZXdfc2NoZWR1bGVfc3RhcnRlZAt0aW1lX3BvaW50PwtlbnRpdHlncm91cAd1aW50NjQ/DWdyb3VwX21lbWJlcnMWQl92ZWN0b3JfZW50aXR5X3JlZl9FPw5yZXNvdXJjZV9zdGF0cwADBXN0YXQxBnVpbnQxNgVzdGF0MgZ1aW50MTYFc3RhdDMGdWludDE2BHNhbHQAAQRzYWx0BnVpbnQ2NAhzY2hlZHVsZQACB3N0YXJ0ZWQKdGltZV9wb2ludAV0YXNrcwZ0YXNrW10Mc2VxdWVuY2Vfcm93AAIDa2V5BG5hbWUFdmFsdWUGdWludDY0CHNoaXBfcm93AA4CaWQGdWludDY0BW93bmVyBG5hbWUEbmFtZQZzdHJpbmcLY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMIaHVsbG1hc3MGdWludDMyCGNhcGFjaXR5BnVpbnQzMgZlbmVyZ3kGdWludDE2CWNhcmdvbWFzcwZ1aW50MzIHZW5naW5lcw5tb3ZlbWVudF9zdGF0cwlnZW5lcmF0b3IMZW5lcmd5X3N0YXRzB2xvYWRlcnMMbG9hZGVyX3N0YXRzCWV4dHJhY3RvchBleHRyYWN0b3Jfc3RhdHM/BHdhcnALd2FycF9zdGF0cz8Ic2NoZWR1bGUJc2NoZWR1bGU/CnNwYXduY2FyZ28AAwllbnRpdHlfaWQGdWludDY0B2l0ZW1faWQGdWludDY0CHF1YW50aXR5BnVpbnQ2NAxzdGFydGVyX2luZm8AAQRzaGlwC2VudGl0eV9pbmZvCXN0YXRlX3JvdwAGB2VuYWJsZWQEYm9vbAVlcG9jaAZ1aW50MzIEc2FsdAZ1aW50NjQFc2hpcHMGdWludDMyBHNlZWQLY2hlY2tzdW0yNTYGY29tbWl0C2NoZWNrc3VtMjU2DHN0cmF0dW1fZGF0YQACB3N0cmF0dW0Mc3RyYXR1bV9pbmZvBXN0YXRzDnJlc291cmNlX3N0YXRzDHN0cmF0dW1faW5mbwAEB2l0ZW1faWQGdWludDE2BHNlZWQGdWludDY0CHJpY2huZXNzBnVpbnQxNgdyZXNlcnZlBnVpbnQzMgR0YXNrAAgEdHlwZQV1aW50OAhkdXJhdGlvbgZ1aW50MzIKY2FuY2VsYWJsZQV1aW50OAtjb29yZGluYXRlcwxjb29yZGluYXRlcz8FY2FyZ28MY2FyZ29faXRlbVtdDGVudGl0eXRhcmdldAtlbnRpdHlfcmVmPwtlbnRpdHlncm91cAd1aW50NjQ/C2VuZXJneV9jb3N0B3VpbnQxNj8KdGFza19ldmVudAAJCmV2ZW50X3R5cGUFdWludDgFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQKdGFza19pbmRleAV1aW50OAR0YXNrBHRhc2sJc3RhcnRzX2F0CnRpbWVfcG9pbnQMY29tcGxldGVzX2F0CnRpbWVfcG9pbnQKbmV3X2VuZXJneQd1aW50MTY/DHRhc2tfcmVzdWx0cwABCGVudGl0aWVzEmVudGl0eV90YXNrX2luZm9bXQh0cmFuc2ZlcgAGC3NvdXJjZV90eXBlBG5hbWUJc291cmNlX2lkBnVpbnQ2NAlkZXN0X3R5cGUEbmFtZQdkZXN0X2lkBnVpbnQ2NAdpdGVtX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIGdHJhdmVsAAULZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQBeAVpbnQ2NAF5BWludDY0CHJlY2hhcmdlBGJvb2wJdHlwZXNfcm93AAQCaWQGdWludDY0E2VudGl0eV9zdW1tYXJ5X3R5cGUOZW50aXR5X3N1bW1hcnkRc3RhcnRlcl9pbmZvX3R5cGUMc3RhcnRlcl9pbmZvEGdhbWVfY29uZmlnX3R5cGULZ2FtZV9jb25maWcNd2FyZWhvdXNlX3JvdwAIAmlkBnVpbnQ2NAVvd25lcgRuYW1lBG5hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCGNhcGFjaXR5BnVpbnQzMgljYXJnb21hc3MGdWludDMyB2xvYWRlcnMMbG9hZGVyX3N0YXRzCHNjaGVkdWxlCXNjaGVkdWxlPwR3YXJwAAQLZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQBeAVpbnQ2NAF5BWludDY0CndhcnBfc3RhdHMAAQVyYW5nZQZ1aW50MzIEd2lwZQAADHdpcGVzZXF1ZW5jZQAAIwAAAEChaXYyB2FkdmFuY2XTAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBhZHZhbmNlCnN1bW1hcnk6ICdBZHZhbmNlIHR1cm4nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkdmFuY2UgdGhlIGdhbWUgdG8gdGhlIG5leHQgdHVybi4AAAAARIWmQQZjYW5jZWzHAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBjYW5jZWwKc3VtbWFyeTogJ0NhbmNlbCBzY2hlZHVsZWQgdGFza3MnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbmNlbCB0aGUgc3BlY2lmaWVkIG51bWJlciBvZiB0YXNrcyBmcm9tIHRoZSBlbmQgb2YgYW4gZW50aXR5J3Mgc2NoZWR1bGUuIFRhc2tzIHRoYXQgYXJlIGltbXV0YWJsZSBhbmQgaW4gcHJvZ3Jlc3MgY2Fubm90IGJlIGNhbmNlbGxlZC4KCi0tLQAAqBvfaVRECWNsZWFucnN2cAAAgIrH5GtURApjbGVhcnRhYmxlvgEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2xlYXJ0YWJsZQpzdW1tYXJ5OiAnREVCVUc6IGNsZWFydGFibGUgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tAAAAAGQnJUUGY29tbWl08QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY29tbWl0CnN1bW1hcnk6ICdTZXQgY29tbWl0IHZhbHVlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTZXQgdGhlIGluaXRpYWwgY29tbWl0IHZhbHVlIGR1cmluZyBnYW1lIGluaXRpYWxpemF0aW9uLgoKLS0tAABgNDK3JkUJY29uZmlnbG9nAOCzy1OpbNRFDGNyZWF0ZWVudGl0eQAAAAAAqHjMVAZlbmFibGXiAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBlbmFibGUKc3VtbWFyeTogJ1NldCBlbmFibGVkIHN0YXRlJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpFbmFibGUgb3IgZGlzYWJsZSB0aGlzIGdhbWUgb2YgU2hpcGxvYWQuCgotLS0AAAAgI3NzVwdleHRyYWN0oQMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZXh0cmFjdApzdW1tYXJ5OiAnRXh0cmFjdCByZXNvdXJjZXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkV4dHJhY3QgcmVzb3VyY2VzIGF0IHRoZSBzaGlwJ3MgY3VycmVudCBsb2NhdGlvbi4gT25seSB3b3JrcyBhdCBleHRyYWN0YWJsZSBsb2NhdGlvbiB0eXBlcy4gU2NoZWR1bGVzIGFuIGV4dHJhY3Rpb24gdGFzayB0aGF0IGNvbnN1bWVzIGVuZXJneSBhbmQgeWllbGRzIGNhcmdvIGJhc2VkIG9uIHRoZSBzaGlwJ3MgZXh0cmFjdG9yIHN0YXRzIGFuZCB0aGUgbG9jYXRpb24ncyByZXNvdXJjZSBjb21wb3NpdGlvbi4AAGBuTYqyYglnZXRjb25maWcAALBy2eWpsmILZ2V0ZW50aXRpZXOkAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRlbnRpdGllcwpzdW1tYXJ5OiAnR2V0IGFsbCBlbnRpdGllcyBmb3IgYSBwbGF5ZXInCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJldHVybnMgZnVsbCBlbnRpdHkgaW5mbyBmb3IgYWxsIGVudGl0aWVzIG93bmVkIGJ5IGEgcGxheWVyLiBPcHRpb25hbGx5IGZpbHRlciBieSBlbnRpdHkgdHlwZS4AAPDZ5amyYglnZXRlbnRpdHmiAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRlbnRpdHkKc3VtbWFyeTogJ0dldCBlbnRpdHkgc3RhdGUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJldHVybnMgdGhlIGN1cnJlbnQgc3RhdGUgb2YgYW4gZW50aXR5IGluY2x1ZGluZyBpZGVudGl0eSwgY2FyZ28sIHNjaGVkdWxlIHN0YXRlLCBhbmQgdHlwZS1zcGVjaWZpYyBmaWVsZHMuAAAAWKrssmIIZ2V0aXRlbXOaAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRpdGVtcwpzdW1tYXJ5OiAnR2V0IGFsbCBhdmFpbGFibGUgaXRlbXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgYSBsaXN0IG9mIGFsbCBpdGVtcyBpbiB0aGUgZ2FtZSBpbmNsdWRpbmcgdGhlaXIgaWQsIGJhc2UgcHJpY2UsIGFuZCBtYXNzLgAmddkgGrNiC2dldGxvY2F0aW9u4gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bG9jYXRpb24Kc3VtbWFyeTogJ0dldCBsb2NhdGlvbiBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCBhIGxvY2F0aW9uIGluY2x1ZGluZyB3aGV0aGVyIGEgc3lzdGVtIGV4aXN0cywgYW5kIGZvciBlYWNoIGl0ZW06IHByaWNlLCBzdXBwbHksIHJhcml0eSBtdWx0aXBsaWVyLCBhbmQgbG9jYXRpb24gbXVsdGlwbGllci4AgMkmIRqzYgpnZXRsb2NkYXRh/gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bG9jZGF0YQpzdW1tYXJ5OiAnR2V0IGRlcml2ZWQgbG9jYXRpb24gZGF0YScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBkZXJpdmVkIGxvY2F0aW9uIGRhdGEgaW5jbHVkaW5nIHN0YXRpYyBwcm9wZXJ0aWVzICh0eXBlLCBkaWZmaWN1bHR5LCBzZWVkcykgZnJvbSB0aGUgZ2FtZSBzZWVkIGFuZCBlcG9jaC1zcGVjaWZpYyBwcm9wZXJ0aWVzIChhY3RpdmUsIHNlZWRzKSBmcm9tIHRoZSBjdXJyZW50IGVwb2NoIHNlZWQuAADw5xo1s2IJZ2V0bmVhcmJ53gMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0bmVhcmJ5CnN1bW1hcnk6ICdHZXQgbmVhcmJ5IHJlYWNoYWJsZSBzeXN0ZW1zJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIG5lYXJieSBzeXN0ZW1zIHJlYWNoYWJsZSBieSBhbiBlbnRpdHkgZnJvbSBpdHMgcHJvamVjdGVkIGxvY2F0aW9uLiBSZXR1cm5zIGN1cnJlbnQgc3RhdGUgKHdpdGggY29tcGxldGVkIHRhc2tzIHJlc29sdmVkKSwgcHJvamVjdGVkIHN0YXRlIChhZnRlciBhbGwgc2NoZWR1bGVkIHRhc2tzKSwgYW5kIGEgbGlzdCBvZiByZWFjaGFibGUgc3lzdGVtcyB3aXRoIGRpc3RhbmNlLCBlbmVyZ3kgY29zdCwgZmxpZ2h0IHRpbWUsIGFuZCBtYXJrZXQgaW5mb3JtYXRpb24uAAC4yptYs2IJZ2V0cGxheWVy/QItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0cGxheWVyCnN1bW1hcnk6ICdHZXQgcGxheWVyIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IGEgcGxheWVyIGluY2x1ZGluZyBiYWxhbmNlLCBkZWJ0LCBuZXR3b3J0aCwgZW50aXR5IGNvdW50cywgYW5kIHByaWNpbmcgZm9yIG5leHQgcHVyY2hhc2VzLiBSZXR1cm5zIGlzX3BsYXllcj1mYWxzZSBpZiB0aGUgYWNjb3VudCBoYXMgbm90IGpvaW5lZCB0aGUgZ2FtZS4AwFX5moyzYgpnZXRzdGFydGVyhQMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0c3RhcnRlcgpzdW1tYXJ5OiAnR2V0IHN0YXJ0ZXIgc2hpcCBhbmQgYmFsYW5jZSBpbmZvcm1hdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyB0aGUgc3RhcnRlciBzaGlwIHN0YXRzIGFuZCBpbml0aWFsIGJhbGFuY2UgYSBuZXcgcGxheWVyIHdvdWxkIHJlY2VpdmUgdXBvbiBqb2luaW5nLiBVc2VkIGZvciBvbmJvYXJkaW5nIFVJIHRvIGRpc3BsYXkgd2hhdCBwbGF5ZXJzIHdpbGwgZ2V0IGJlZm9yZSB0aGV5IHJlZ2lzdGVyLgCA1NncjLNiCmdldHN0cmF0dW0AgJW7RkqNs2IMZ2V0c3VtbWFyaWVz6AItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ2V0c3VtbWFyaWVzCnN1bW1hcnk6ICdHZXQgZW50aXR5IHN1bW1hcmllcyBmb3IgYSBwbGF5ZXInCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJldHVybnMgbGlnaHR3ZWlnaHQgc3VtbWFyaWVzIG9mIGFsbCBlbnRpdGllcyBvd25lZCBieSBhIHBsYXllciBpbmNsdWRpbmcgdHlwZSwgaWQsIG93bmVyLCBuYW1lLCBsb2NhdGlvbiwgYW5kIGlkbGUgc3RhdHVzLiBPcHRpb25hbGx5IGZpbHRlciBieSBlbnRpdHkgdHlwZS4Aotrm5qrpZQtncm91cHRyYXZlbJoELS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdyb3VwdHJhdmVsCnN1bW1hcnk6ICdNb3ZlIG11bHRpcGxlIGVudGl0aWVzIHRvZ2V0aGVyJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWF0ZSBncm91cCB0cmF2ZWwgZm9yIG11bHRpcGxlIGVudGl0aWVzIHRvIGEgZGVzdGluYXRpb24uIEFsbCBlbnRpdGllcyBtdXN0IGJlIGF0IHRoZSBzYW1lIGxvY2F0aW9uIGFuZCBvd25lZCBieSB0aGUgY2FsbGVyLiBBdCBsZWFzdCBvbmUgZW50aXR5IHdpdGggZW5naW5lcyBpcyByZXF1aXJlZCB0byBwcm92aWRlIHRocnVzdC4gRmxpZ2h0IGR1cmF0aW9uIGlzIGNhbGN1bGF0ZWQgZnJvbSBjb21iaW5lZCB0aHJ1c3QgYW5kIHRvdGFsIG1hc3Mgb2YgYWxsIGVudGl0aWVzLiBDcmVhdGVzIGFuIGVudGl0eWdyb3VwIGZvciBhdG9taWMgcmVzb2x1dGlvbiBhbmQgY2FuY2VsbGF0aW9uLgAAAAAA0LBpBGhhc2j9AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBoYXNoCnN1bW1hcnk6ICdDYWxjdWxhdGUgc2hhMjU2IGhhc2gnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbGN1bGF0ZXMgdGhlIHNoYTI1NiBoYXNoIG9mIGEgc3RyaW5nIGJhc2VkIHVzaW5nIHRoZSBnYW1lIHNlZWQuCgotLS0AAABAhNKwaQdoYXNoNTEy+wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogaGFzaDUxMgpzdW1tYXJ5OiAnQ2FsY3VsYXRlIHNoYTUxMiBoYXNoJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYWxjdWxhdGVzIHRoZSBzaGE1MTIgaGFzaCBvZiBhIHN0cmluZyBiYXNlZCB1c2luZyB0aGUgZ2FtZSBzZWVkLgAAAAAAkN10BGluaXT6AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBpbml0CnN1bW1hcnk6ICdJbml0aWFsaXplIGdhbWUgc2VlZCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW5pdGlhbGl6ZSBhIHRoZSBnYW1lcyBzZWVkIGFuZCBzZWVkIHZhbHVlcyB0byBib290c3RyYXAgZ2FtZSBzdGF0ZS4AAAAAADAdfQRqb2luyQEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogam9pbgpzdW1tYXJ5OiAnSm9pbiBhIGdhbWUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkpvaW4gYSBnYW1lIG9mIFNoaXBsb2FkCgotLS0AAAAA+OUynQZub3RpZnmKAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBub3RpZnkKc3VtbWFyeTogJ1Rhc2sgbGlmZWN5Y2xlIG5vdGlmaWNhdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSW50ZXJuYWwgYWN0aW9uIHRoYXQgbm90aWZpZXMgZW50aXR5IG93bmVycyBvZiB0YXNrIGxpZmVjeWNsZSBldmVudHMgKHJlc29sdmVkLCBjYW5jZWxsZWQpLiBDYWxsZWQgaW5saW5lIHdoZW4gdGFza3MgY2hhbmdlIHN0YXRlLiBVc2VzIHJlcXVpcmVfcmVjaXBpZW50IHRvIGVuYWJsZSBvZmYtY2hhaW4gbW9uaXRvcmluZyB2aWEgYWN0aW9uIHRyYWNlcy4AAACKXdOQughyZWNoYXJnZdICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHJlY2hhcmdlCnN1bW1hcnk6ICdSZWNoYXJnZSBzaGlwIGVuZXJneScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2NoZWR1bGUgYSByZWNoYXJnZSB0YXNrIGZvciBhbiBlbnRpdHkgdG8gcmVzdG9yZSBlbmVyZ3kgdG8gZnVsbCBjYXBhY2l0eS4gVGhlIHJlY2hhcmdlIGR1cmF0aW9uIGRlcGVuZHMgb24gY3VycmVudCBlbmVyZ3kgbGV2ZWwgYW5kIHJlY2hhcmdlIHJhdGUuCgotLS0AAABA7UixugdyZXNvbHZl1QMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcmVzb2x2ZQpzdW1tYXJ5OiAnQ29tcGxldGUgc2NoZWR1bGVkIHRhc2tzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpSZXNvbHZlIGNvbXBsZXRlZCB0YXNrcyBpbiBhbiBlbnRpdHkncyBzY2hlZHVsZSwgYXBwbHlpbmcgdGhlaXIgZWZmZWN0cyAocmVjaGFyZ2UgZW5lcmd5LCB1cGRhdGUgbG9jYXRpb24sIGxvYWQvdW5sb2FkIGNhcmdvKS4gSWYgY291bnQgaXMgc3BlY2lmaWVkLCByZXNvbHZlIGV4YWN0bHkgdGhhdCBtYW55IHRhc2tzOyBvdGhlcndpc2UgcmVzb2x2ZSBhbGwgY29tcGxldGVkIHRhc2tzLiBGYWlscyBpZiBjb3VudCBleGNlZWRzIHRoZSBudW1iZXIgb2YgY29tcGxldGVkIHRhc2tzLgoKLS0tAAAAAACQo8EEc2FsdN0BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHNhbHQKc3VtbWFyeTogJ0FwcGVuZCBTYWx0JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZGQgYWRkaXRpb25hbCBzYWx0IHRvIHRoZSBuZXh0IGVwb2NoIHNlZWQuCgotLS0AAGXXoMlNxQpzcGF3bmNhcmdvAAAAAFctPM3NCHRyYW5zZmVyyAMtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogdHJhbnNmZXIKc3VtbWFyeTogJ1RyYW5zZmVyIGNhcmdvIGJldHdlZW4gZW50aXRpZXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRyYW5zZmVyIGNhcmdvIGJldHdlZW4gdHdvIGVudGl0aWVzIGF0IHRoZSBzYW1lIGxvY2F0aW9uLiBCb3RoIGVudGl0aWVzIG11c3QgYmUgb3duZWQgYnkgdGhlIGNhbGxlciBhbmQgYXQgbGVhc3Qgb25lIG11c3QgaGF2ZSBsb2FkZXJzLiBDcmVhdGVzIGxvYWQgYW5kIHVubG9hZCB0YXNrcyBvbiBib3RoIGVudGl0aWVzIHdpdGggZHVyYXRpb24gYmFzZWQgb24gY29tYmluZWQgbG9hZGVyIGNhcGFjaXR5IGFuZCBaLWRpc3RhbmNlIGJldHdlZW4gdGhlbS4AAAAARLXNzQZ0cmF2ZWzLAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmF2ZWwKc3VtbWFyeTogJ01vdmUgYSBzaGlwJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWF0ZSB0cmF2ZWwgb2YgYW4gZW50aXR5IGZyb20gaXRzIGN1cnJlbnQgbG9jYXRpb24gdG8gYSBuZXcgZGVzdGluYXRpb24uCgotLS0KClRoaXMgYWN0aW9uIGRldGVybWluZXMgdGhlIG1hcmtldCBwcmljZSBvZiBhbGwgaXRlbXMgYXQgYSBnaXZlbiBsb2NhdGlvbi4AAAAAAFCv4QR3YXJwAAAAAAAAoKrjBHdpcGWyAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlCnN1bW1hcnk6ICdERUJVRzogd2lwZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS2g0FTaKqyq4wx3aXBlc2VxdWVuY2XCAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB3aXBlc2VxdWVuY2UKc3VtbWFyeTogJ0RFQlVHOiB3aXBlc2VxdWVuY2UgYWN0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCwAAAAAAyq5BA2k2NAAACWNhcmdvX3JvdwAAuGo6kydFA2k2NAAADWNvbnRhaW5lcl9yb3cAqqaX+ezyVANpNjQAAA9lbnRpdHlncm91cF9yb3cAAACTumwQjQNpNjQAAAxsb2NhdGlvbl9yb3cAAAAAXOVNrANpNjQAAApwbGF5ZXJfcm93AAAAQO2rsLoDaTY0AAALcmVzZXJ2ZV9yb3cAAAAKTaWtwgNpNjQAAAxzZXF1ZW5jZV9yb3cAAAAAAFBdwwNpNjQAAAhzaGlwX3JvdwAAAAAAlU3GA2k2NAAACXN0YXRlX3JvdwAAAAAArKrPA2k2NAAACXR5cGVzX3JvdwAAUFjTpq7hA2k2NAAADXdhcmVob3VzZV9yb3cBEVNoaXBsb2FkIChTZXJ2ZXIpEVNoaXBsb2FkIChTZXJ2ZXIpAAAAFQAAAABEhaZBDmNhbmNlbF9yZXN1bHRzAAAAICNzc1cMdGFza19yZXN1bHRzAABgbk2KsmILZ2FtZV9jb25maWcAsHLZ5amyYg1lbnRpdHlfaW5mb1tdAADw2eWpsmILZW50aXR5X2luZm8AAABYquyyYgppdGVtc19pbmZvACZ12SAas2INbG9jYXRpb25faW5mbwCAySYhGrNiEGxvY2F0aW9uX2Rlcml2ZWQAAPDnGjWzYgtuZWFyYnlfaW5mbwAAuMqbWLNiC3BsYXllcl9pbmZvAMBV+ZqMs2IMc3RhcnRlcl9pbmZvAIDU2dyMs2IMc3RyYXR1bV9kYXRhgJW7RkqNs2IQZW50aXR5X3N1bW1hcnlbXQCi2ubmqullDHRhc2tfcmVzdWx0cwAAAAAA0LBpC2NoZWNrc3VtMjU2AAAAQITSsGkLY2hlY2tzdW01MTIAAACKXdOQugx0YXNrX3Jlc3VsdHMAAABA7Uixug9yZXNvbHZlX3Jlc3VsdHMAAABXLTzNzQx0YXNrX3Jlc3VsdHMAAAAARLXNzQx0YXNrX3Jlc3VsdHMAAAAAAFCv4Qx0YXNrX3Jlc3VsdHM='
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
    @Struct.type('createentity')
    export class createentity extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field('string')
        declare entity_name: string
        @Struct.field(Int64)
        declare x: Int64
        @Struct.field(Int64)
        declare y: Int64
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
    @Struct.type('location_info')
    export class location_info extends Struct {
        @Struct.field(coordinates)
        declare coords: coordinates
        @Struct.field('bool')
        declare is_system: boolean
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
    @Struct.type('player_info')
    export class player_info extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field('bool')
        declare is_player: boolean
        @Struct.field('string')
        declare company_name: string
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
        @Struct.field(extractor_stats, {optional: true})
        declare extractor?: extractor_stats
        @Struct.field(warp_stats, {optional: true})
        declare warp?: warp_stats
        @Struct.field(schedule, {optional: true})
        declare schedule?: schedule
    }
    @Struct.type('spawncargo')
    export class spawncargo extends Struct {
        @Struct.field(UInt64)
        declare entity_id: UInt64
        @Struct.field(UInt64)
        declare item_id: UInt64
        @Struct.field(UInt64)
        declare quantity: UInt64
    }
    @Struct.type('starter_info')
    export class starter_info extends Struct {
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
            seed?: UInt64Type
        }
    }
    export interface advance {
        reveal: string
        commit: Checksum256Type
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
    export interface createentity {
        owner: NameType
        entity_type: NameType
        entity_name: string
        x: Int64Type
        y: Int64Type
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
    export interface spawncargo {
        entity_id: UInt64Type
        item_id: UInt64Type
        quantity: UInt64Type
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
    cancel: ActionParams.cancel
    cleanrsvp: ActionParams.cleanrsvp
    cleartable: ActionParams.cleartable
    commit: ActionParams.commit
    configlog: ActionParams.configlog
    createentity: ActionParams.createentity
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
    recharge: ActionParams.recharge
    resolve: ActionParams.resolve
    salt: ActionParams.salt
    spawncargo: ActionParams.spawncargo
    transfer: ActionParams.transfer
    travel: ActionParams.travel
    warp: ActionParams.warp
    wipe: ActionParams.wipe
    wipesequence: ActionParams.wipesequence
}
export type ActionNames = keyof ActionNameParams
export interface ActionReturnValues {
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
