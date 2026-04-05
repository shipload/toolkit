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
    'DmVvc2lvOjphYmkvMS4yAhVCX3ZlY3Rvcl9lbnRpdHlfcmVmX0UMZW50aXR5X3JlZltdDWxvY2F0aW9uX3R5cGUFdWludDhSB2FkdmFuY2UAAgZyZXZlYWwGc3RyaW5nBmNvbW1pdAtjaGVja3N1bTI1NgZjYW5jZWwAAwtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NAVjb3VudAZ1aW50NjQOY2FuY2VsX3Jlc3VsdHMABgllbnRpdHlfaWQGdWludDY0C2VudGl0eV90eXBlBG5hbWUPY2FuY2VsbGVkX2NvdW50BXVpbnQ4EHNjaGVkdWxlX3N0YXJ0ZWQLdGltZV9wb2ludD8LZW50aXR5Z3JvdXAHdWludDY0Pw1ncm91cF9tZW1iZXJzFkJfdmVjdG9yX2VudGl0eV9yZWZfRT8KY2FyZ29faXRlbQADB2l0ZW1faWQGdWludDE2CHF1YW50aXR5BnVpbnQzMgRzZWVkB3VpbnQ2ND8JY2FyZ29fcm93AAUCaWQGdWludDY0CWVudGl0eV9pZAZ1aW50NjQHaXRlbV9pZAZ1aW50NjQIcXVhbnRpdHkGdWludDY0BHNlZWQGdWludDY0CWNsZWFucnN2cAACBWVwb2NoBnVpbnQ2NAhtYXhfcm93cwZ1aW50NjQKY2xlYXJ0YWJsZQADCnRhYmxlX25hbWUEbmFtZQVzY29wZQVuYW1lPwhtYXhfcm93cwd1aW50NjQ/BmNvbW1pdAABBmNvbW1pdAtjaGVja3N1bTI1Ngljb25maWdsb2cAAQZjb25maWcLZ2FtZV9jb25maWcNY29udGFpbmVyX3JvdwAIAmlkBnVpbnQ2NAVvd25lcgRuYW1lBG5hbWUGc3RyaW5nC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCGh1bGxtYXNzBnVpbnQzMghjYXBhY2l0eQZ1aW50MzIJY2FyZ29tYXNzBnVpbnQzMghzY2hlZHVsZQlzY2hlZHVsZT8LY29vcmRpbmF0ZXMAAwF4BWludDY0AXkFaW50NjQBegd1aW50MTY/BWNyYWZ0AAULZW50aXR5X3R5cGUEbmFtZQJpZAZ1aW50NjQJcmVjaXBlX2lkBnVpbnQxNghxdWFudGl0eQZ1aW50MzIGaW5wdXRzDGNhcmdvX2l0ZW1bXQ1jcmFmdGVyX3N0YXRzAAIFc3BlZWQGdWludDE2BWRyYWluBnVpbnQxNgxjcmVhdGVlbnRpdHkABQVvd25lcgRuYW1lC2VudGl0eV90eXBlBG5hbWULZW50aXR5X25hbWUGc3RyaW5nAXgFaW50NjQBeQVpbnQ2NAZkZXBsb3kABQtlbnRpdHlfdHlwZQRuYW1lAmlkBnVpbnQ2NA5wYWNrZWRfaXRlbV9pZAZ1aW50MTYEc2VlZAZ1aW50NjQLZW50aXR5X25hbWUGc3RyaW5nBmVuYWJsZQABB2VuYWJsZWQEYm9vbAxlbmVyZ3lfc3RhdHMAAghjYXBhY2l0eQZ1aW50MTYIcmVjaGFyZ2UGdWludDE2FGVudGl0eV9jdXJyZW50X3N0YXRlAAILY29vcmRpbmF0ZXMLY29vcmRpbmF0ZXMGZW5lcmd5BnVpbnQxNg9lbnRpdHlfZGVmYXVsdHMAEA1zaGlwX2h1bGxtYXNzBnVpbnQzMg1zaGlwX2NhcGFjaXR5BnVpbnQzMgtzaGlwX2VuZXJneQZ1aW50MTYGc2hpcF96BnVpbnQxNgxzaGlwX2VuZ2luZXMObW92ZW1lbnRfc3RhdHMOc2hpcF9nZW5lcmF0b3IMZW5lcmd5X3N0YXRzDHNoaXBfbG9hZGVycwxsb2FkZXJfc3RhdHMOc2hpcF9leHRyYWN0b3IPZXh0cmFjdG9yX3N0YXRzCXNoaXBfd2FycAp3YXJwX3N0YXRzDHNoaXBfY3JhZnRlcg1jcmFmdGVyX3N0YXRzEndhcmVob3VzZV9jYXBhY2l0eQZ1aW50MzILd2FyZWhvdXNlX3oGdWludDE2EXdhcmVob3VzZV9sb2FkZXJzDGxvYWRlcl9zdGF0cxJjb250YWluZXJfaHVsbG1hc3MGdWludDMyEmNvbnRhaW5lcl9jYXBhY2l0eQZ1aW50MzILY29udGFpbmVyX3oGdWludDE2C2VudGl0eV9pbmZvABcEdHlwZQRuYW1lAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2VudGl0eV9uYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwljYXJnb21hc3MGdWludDMyBWNhcmdvDGNhcmdvX2l0ZW1bXQdsb2FkZXJzDWxvYWRlcl9zdGF0cz8GZW5lcmd5B3VpbnQxNj8IaHVsbG1hc3MHdWludDMyPwdlbmdpbmVzD21vdmVtZW50X3N0YXRzPwlnZW5lcmF0b3INZW5lcmd5X3N0YXRzPwhjYXBhY2l0eQd1aW50MzI/CWV4dHJhY3RvchBleHRyYWN0b3Jfc3RhdHM/BHdhcnALd2FycF9zdGF0cz8HY3JhZnRlcg5jcmFmdGVyX3N0YXRzPwdpc19pZGxlBGJvb2wMY3VycmVudF90YXNrBXRhc2s/FGN1cnJlbnRfdGFza19lbGFwc2VkBnVpbnQzMhZjdXJyZW50X3Rhc2tfcmVtYWluaW5nBnVpbnQzMg1wZW5kaW5nX3Rhc2tzBnRhc2tbXQdpZGxlX2F0C3RpbWVfcG9pbnQ/CHNjaGVkdWxlCXNjaGVkdWxlPwplbnRpdHlfcmVmAAILZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0DmVudGl0eV9zdW1tYXJ5AAgEdHlwZQRuYW1lAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2VudGl0eV9uYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwdpc19pZGxlBGJvb2wOcmVzb2x2ZWRfY291bnQGdWludDMyDXBlbmRpbmdfY291bnQGdWludDMyEGVudGl0eV90YXNrX2luZm8ABAllbnRpdHlfaWQGdWludDY0C2VudGl0eV90eXBlBG5hbWUKdGFza19jb3VudAV1aW50OBBzY2hlZHVsZV9zdGFydGVkCnRpbWVfcG9pbnQPZW50aXR5Z3JvdXBfcm93AAICaWQGdWludDY0DHBhcnRpY2lwYW50cwxlbnRpdHlfcmVmW10HZXh0cmFjdAAEC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0B3N0cmF0dW0GdWludDE2CHF1YW50aXR5BnVpbnQzMg9leHRyYWN0b3Jfc3RhdHMABQRyYXRlBnVpbnQxNgVkcmFpbgZ1aW50MTYKZWZmaWNpZW5jeQZ1aW50MTYFZGVwdGgGdWludDE2BWRyaWxsBnVpbnQxNgtnYW1lX2NvbmZpZwADB3ZlcnNpb24GdWludDMyCGRlZmF1bHRzD2VudGl0eV9kZWZhdWx0cwVpdGVtcwppdGVtX2RlZltdCWdldGNvbmZpZwAAC2dldGVudGl0aWVzAAIFb3duZXIEbmFtZQtlbnRpdHlfdHlwZQVuYW1lPwlnZXRlbnRpdHkAAgtlbnRpdHlfdHlwZQRuYW1lCWVudGl0eV9pZAZ1aW50NjQIZ2V0aXRlbXMAAAtnZXRsb2NhdGlvbgACAXgFaW50NjQBeQVpbnQ2NApnZXRsb2NkYXRhAAIBeAVpbnQ2NAF5BWludDY0CWdldG5lYXJieQADC2VudGl0eV90eXBlBG5hbWUJZW50aXR5X2lkBnVpbnQ2NAhyZWNoYXJnZQRib29sCWdldHBsYXllcgABB2FjY291bnQEbmFtZQpnZXRzdGFydGVyAAAKZ2V0c3RyYXR1bQADAXgFaW50NjQBeQVpbnQ2NAdzdHJhdHVtBnVpbnQxNgxnZXRzdW1tYXJpZXMAAgVvd25lcgRuYW1lC2VudGl0eV90eXBlBW5hbWU/C2dyb3VwdHJhdmVsAAQIZW50aXRpZXMMZW50aXR5X3JlZltdAXgFaW50NjQBeQVpbnQ2NAhyZWNoYXJnZQRib29sBGhhc2gAAQV2YWx1ZQZzdHJpbmcHaGFzaDUxMgABBXZhbHVlBnN0cmluZwRpbml0AAEEc2VlZAtjaGVja3N1bTI1NghpdGVtX2RlZgACAmlkBnVpbnQxNgRtYXNzBnVpbnQzMgppdGVtc19pbmZvAAEFaXRlbXMKaXRlbV9kZWZbXQRqb2luAAEHYWNjb3VudARuYW1lDGxvYWRlcl9zdGF0cwADBG1hc3MGdWludDMyBnRocnVzdAZ1aW50MTYIcXVhbnRpdHkFdWludDgQbG9jYXRpb25fZGVyaXZlZAADDHN0YXRpY19wcm9wcw9sb2NhdGlvbl9zdGF0aWMLZXBvY2hfcHJvcHMObG9jYXRpb25fZXBvY2gEc2l6ZQZ1aW50MTYObG9jYXRpb25fZXBvY2gAAwZhY3RpdmUEYm9vbAVzZWVkMAV1aW50OAVzZWVkMQV1aW50OA1sb2NhdGlvbl9pbmZvAAIGY29vcmRzC2Nvb3JkaW5hdGVzCWlzX3N5c3RlbQRib29sDGxvY2F0aW9uX3JvdwAGAmlkBnVpbnQ2NAVvd25lcgRuYW1lC2Nvb3JkaW5hdGVzC2Nvb3JkaW5hdGVzCWNhcmdvbWFzcwZ1aW50MzIFY2FyZ28MY2FyZ29faXRlbVtdCHNjaGVkdWxlCXNjaGVkdWxlPw9sb2NhdGlvbl9zdGF0aWMABQZjb29yZHMLY29vcmRpbmF0ZXMEdHlwZQ1sb2NhdGlvbl90eXBlB3N1YnR5cGUFdWludDgFc2VlZDAFdWludDgFc2VlZDEFdWludDgObW92ZW1lbnRfc3RhdHMAAgZ0aHJ1c3QGdWludDMyBWRyYWluBnVpbnQxNgtuZWFyYnlfaW5mbwAFCmNhbl90cmF2ZWwEYm9vbAdjdXJyZW50FGVudGl0eV9jdXJyZW50X3N0YXRlCXByb2plY3RlZBRlbnRpdHlfY3VycmVudF9zdGF0ZQptYXhfZW5lcmd5BnVpbnQxNgdzeXN0ZW1zD25lYXJieV9zeXN0ZW1bXQ1uZWFyYnlfc3lzdGVtAAQIZGlzdGFuY2UGdWludDY0C2VuZXJneV9jb3N0BnVpbnQ2NAtmbGlnaHRfdGltZQZ1aW50MzIIbG9jYXRpb24NbG9jYXRpb25faW5mbwZub3RpZnkAAQVldmVudAp0YXNrX2V2ZW50C3BsYXllcl9pbmZvAAYFb3duZXIEbmFtZQlpc19wbGF5ZXIEYm9vbAxjb21wYW55X25hbWUGc3RyaW5nCnNoaXBfY291bnQGdWludDY0D3dhcmVob3VzZV9jb3VudAZ1aW50NjQPY29udGFpbmVyX2NvdW50BnVpbnQ2NApwbGF5ZXJfcm93AAEFb3duZXIEbmFtZQhyZWNoYXJnZQACC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0C3Jlc2VydmVfcm93AAICaWQGdWludDY0CXJlbWFpbmluZwZ1aW50MzIHcmVzb2x2ZQADC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0BWNvdW50B3VpbnQ2ND8PcmVzb2x2ZV9yZXN1bHRzAAYJZW50aXR5X2lkBnVpbnQ2NAtlbnRpdHlfdHlwZQRuYW1lDnJlc29sdmVkX2NvdW50BXVpbnQ4FG5ld19zY2hlZHVsZV9zdGFydGVkC3RpbWVfcG9pbnQ/C2VudGl0eWdyb3VwB3VpbnQ2ND8NZ3JvdXBfbWVtYmVycxZCX3ZlY3Rvcl9lbnRpdHlfcmVmX0U/DnJlc291cmNlX3N0YXRzAAMFc3RhdDEGdWludDE2BXN0YXQyBnVpbnQxNgVzdGF0MwZ1aW50MTYEc2FsdAABBHNhbHQGdWludDY0CHNjaGVkdWxlAAIHc3RhcnRlZAp0aW1lX3BvaW50BXRhc2tzBnRhc2tbXQxzZXF1ZW5jZV9yb3cAAgNrZXkEbmFtZQV2YWx1ZQZ1aW50NjQIc2hpcF9yb3cADwJpZAZ1aW50NjQFb3duZXIEbmFtZQRuYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwhodWxsbWFzcwZ1aW50MzIIY2FwYWNpdHkGdWludDMyBmVuZXJneQZ1aW50MTYJY2FyZ29tYXNzBnVpbnQzMgdlbmdpbmVzDm1vdmVtZW50X3N0YXRzCWdlbmVyYXRvcgxlbmVyZ3lfc3RhdHMHbG9hZGVycwxsb2FkZXJfc3RhdHMJZXh0cmFjdG9yEGV4dHJhY3Rvcl9zdGF0cz8Ed2FycAt3YXJwX3N0YXRzPwdjcmFmdGVyDmNyYWZ0ZXJfc3RhdHM/CHNjaGVkdWxlCXNjaGVkdWxlPwpzcGF3bmNhcmdvAAMJZW50aXR5X2lkBnVpbnQ2NAdpdGVtX2lkBnVpbnQ2NAhxdWFudGl0eQZ1aW50NjQMc3RhcnRlcl9pbmZvAAEEc2hpcAtlbnRpdHlfaW5mbwlzdGF0ZV9yb3cABgdlbmFibGVkBGJvb2wFZXBvY2gGdWludDMyBHNhbHQGdWludDY0BXNoaXBzBnVpbnQzMgRzZWVkC2NoZWNrc3VtMjU2BmNvbW1pdAtjaGVja3N1bTI1NgxzdHJhdHVtX2RhdGEAAgdzdHJhdHVtDHN0cmF0dW1faW5mbwVzdGF0cw5yZXNvdXJjZV9zdGF0cwxzdHJhdHVtX2luZm8ABAdpdGVtX2lkBnVpbnQxNgRzZWVkBnVpbnQ2NAhyaWNobmVzcwZ1aW50MTYHcmVzZXJ2ZQZ1aW50MzIEdGFzawAIBHR5cGUFdWludDgIZHVyYXRpb24GdWludDMyCmNhbmNlbGFibGUFdWludDgLY29vcmRpbmF0ZXMMY29vcmRpbmF0ZXM/BWNhcmdvDGNhcmdvX2l0ZW1bXQxlbnRpdHl0YXJnZXQLZW50aXR5X3JlZj8LZW50aXR5Z3JvdXAHdWludDY0PwtlbmVyZ3lfY29zdAd1aW50MTY/CnRhc2tfZXZlbnQACQpldmVudF90eXBlBXVpbnQ4BW93bmVyBG5hbWULZW50aXR5X3R5cGUEbmFtZQllbnRpdHlfaWQGdWludDY0CnRhc2tfaW5kZXgFdWludDgEdGFzawR0YXNrCXN0YXJ0c19hdAp0aW1lX3BvaW50DGNvbXBsZXRlc19hdAp0aW1lX3BvaW50Cm5ld19lbmVyZ3kHdWludDE2Pwx0YXNrX3Jlc3VsdHMAAQhlbnRpdGllcxJlbnRpdHlfdGFza19pbmZvW10IdHJhbnNmZXIABgtzb3VyY2VfdHlwZQRuYW1lCXNvdXJjZV9pZAZ1aW50NjQJZGVzdF90eXBlBG5hbWUHZGVzdF9pZAZ1aW50NjQHaXRlbV9pZAZ1aW50MTYIcXVhbnRpdHkGdWludDMyBnRyYXZlbAAFC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0AXgFaW50NjQBeQVpbnQ2NAhyZWNoYXJnZQRib29sCXR5cGVzX3JvdwAEAmlkBnVpbnQ2NBNlbnRpdHlfc3VtbWFyeV90eXBlDmVudGl0eV9zdW1tYXJ5EXN0YXJ0ZXJfaW5mb190eXBlDHN0YXJ0ZXJfaW5mbxBnYW1lX2NvbmZpZ190eXBlC2dhbWVfY29uZmlnDXdhcmVob3VzZV9yb3cACAJpZAZ1aW50NjQFb3duZXIEbmFtZQRuYW1lBnN0cmluZwtjb29yZGluYXRlcwtjb29yZGluYXRlcwhjYXBhY2l0eQZ1aW50MzIJY2FyZ29tYXNzBnVpbnQzMgdsb2FkZXJzDGxvYWRlcl9zdGF0cwhzY2hlZHVsZQlzY2hlZHVsZT8Ed2FycAAEC2VudGl0eV90eXBlBG5hbWUCaWQGdWludDY0AXgFaW50NjQBeQVpbnQ2NAp3YXJwX3N0YXRzAAEFcmFuZ2UGdWludDMyBHdpcGUAAAx3aXBlc2VxdWVuY2UAACUAAABAoWl2MgdhZHZhbmNl0wEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogYWR2YW5jZQpzdW1tYXJ5OiAnQWR2YW5jZSB0dXJuJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpBZHZhbmNlIHRoZSBnYW1lIHRvIHRoZSBuZXh0IHR1cm4uAAAAAESFpkEGY2FuY2VsxwItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogY2FuY2VsCnN1bW1hcnk6ICdDYW5jZWwgc2NoZWR1bGVkIHRhc2tzJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpDYW5jZWwgdGhlIHNwZWNpZmllZCBudW1iZXIgb2YgdGFza3MgZnJvbSB0aGUgZW5kIG9mIGFuIGVudGl0eSdzIHNjaGVkdWxlLiBUYXNrcyB0aGF0IGFyZSBpbW11dGFibGUgYW5kIGluIHByb2dyZXNzIGNhbm5vdCBiZSBjYW5jZWxsZWQuCgotLS0AAKgb32lURAljbGVhbnJzdnAAAICKx+RrVEQKY2xlYXJ0YWJsZb4BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNsZWFydGFibGUKc3VtbWFyeTogJ0RFQlVHOiBjbGVhcnRhYmxlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQAAAABkJyVFBmNvbW1pdPEBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGNvbW1pdApzdW1tYXJ5OiAnU2V0IGNvbW1pdCB2YWx1ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKU2V0IHRoZSBpbml0aWFsIGNvbW1pdCB2YWx1ZSBkdXJpbmcgZ2FtZSBpbml0aWFsaXphdGlvbi4KCi0tLQAAYDQytyZFCWNvbmZpZ2xvZwAAAAAAgLzMRQVjcmFmdADgs8tTqWzURQxjcmVhdGVlbnRpdHkAAAAAAHgaq0oGZGVwbG95AAAAAACoeMxUBmVuYWJsZeIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGVuYWJsZQpzdW1tYXJ5OiAnU2V0IGVuYWJsZWQgc3RhdGUnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkVuYWJsZSBvciBkaXNhYmxlIHRoaXMgZ2FtZSBvZiBTaGlwbG9hZC4KCi0tLQAAACAjc3NXB2V4dHJhY3ShAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBleHRyYWN0CnN1bW1hcnk6ICdFeHRyYWN0IHJlc291cmNlcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKRXh0cmFjdCByZXNvdXJjZXMgYXQgdGhlIHNoaXAncyBjdXJyZW50IGxvY2F0aW9uLiBPbmx5IHdvcmtzIGF0IGV4dHJhY3RhYmxlIGxvY2F0aW9uIHR5cGVzLiBTY2hlZHVsZXMgYW4gZXh0cmFjdGlvbiB0YXNrIHRoYXQgY29uc3VtZXMgZW5lcmd5IGFuZCB5aWVsZHMgY2FyZ28gYmFzZWQgb24gdGhlIHNoaXAncyBleHRyYWN0b3Igc3RhdHMgYW5kIHRoZSBsb2NhdGlvbidzIHJlc291cmNlIGNvbXBvc2l0aW9uLgAAYG5NirJiCWdldGNvbmZpZwAAsHLZ5amyYgtnZXRlbnRpdGllc6QCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGVudGl0aWVzCnN1bW1hcnk6ICdHZXQgYWxsIGVudGl0aWVzIGZvciBhIHBsYXllcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyBmdWxsIGVudGl0eSBpbmZvIGZvciBhbGwgZW50aXRpZXMgb3duZWQgYnkgYSBwbGF5ZXIuIE9wdGlvbmFsbHkgZmlsdGVyIGJ5IGVudGl0eSB0eXBlLgAA8NnlqbJiCWdldGVudGl0eaICLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGVudGl0eQpzdW1tYXJ5OiAnR2V0IGVudGl0eSBzdGF0ZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyB0aGUgY3VycmVudCBzdGF0ZSBvZiBhbiBlbnRpdHkgaW5jbHVkaW5nIGlkZW50aXR5LCBjYXJnbywgc2NoZWR1bGUgc3RhdGUsIGFuZCB0eXBlLXNwZWNpZmljIGZpZWxkcy4AAABYquyyYghnZXRpdGVtc5oCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGdldGl0ZW1zCnN1bW1hcnk6ICdHZXQgYWxsIGF2YWlsYWJsZSBpdGVtcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVGhpcyBhY3Rpb24gcmV0dXJucyBhIGxpc3Qgb2YgYWxsIGl0ZW1zIGluIHRoZSBnYW1lIGluY2x1ZGluZyB0aGVpciBpZCwgYmFzZSBwcmljZSwgYW5kIG1hc3MuACZ12SAas2ILZ2V0bG9jYXRpb27iAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRsb2NhdGlvbgpzdW1tYXJ5OiAnR2V0IGxvY2F0aW9uIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IGEgbG9jYXRpb24gaW5jbHVkaW5nIHdoZXRoZXIgYSBzeXN0ZW0gZXhpc3RzLCBhbmQgZm9yIGVhY2ggaXRlbTogcHJpY2UsIHN1cHBseSwgcmFyaXR5IG11bHRpcGxpZXIsIGFuZCBsb2NhdGlvbiBtdWx0aXBsaWVyLgCAySYhGrNiCmdldGxvY2RhdGH+Ai0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRsb2NkYXRhCnN1bW1hcnk6ICdHZXQgZGVyaXZlZCBsb2NhdGlvbiBkYXRhJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIGRlcml2ZWQgbG9jYXRpb24gZGF0YSBpbmNsdWRpbmcgc3RhdGljIHByb3BlcnRpZXMgKHR5cGUsIGRpZmZpY3VsdHksIHNlZWRzKSBmcm9tIHRoZSBnYW1lIHNlZWQgYW5kIGVwb2NoLXNwZWNpZmljIHByb3BlcnRpZXMgKGFjdGl2ZSwgc2VlZHMpIGZyb20gdGhlIGN1cnJlbnQgZXBvY2ggc2VlZC4AAPDnGjWzYglnZXRuZWFyYnneAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRuZWFyYnkKc3VtbWFyeTogJ0dldCBuZWFyYnkgcmVhY2hhYmxlIHN5c3RlbXMnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgbmVhcmJ5IHN5c3RlbXMgcmVhY2hhYmxlIGJ5IGFuIGVudGl0eSBmcm9tIGl0cyBwcm9qZWN0ZWQgbG9jYXRpb24uIFJldHVybnMgY3VycmVudCBzdGF0ZSAod2l0aCBjb21wbGV0ZWQgdGFza3MgcmVzb2x2ZWQpLCBwcm9qZWN0ZWQgc3RhdGUgKGFmdGVyIGFsbCBzY2hlZHVsZWQgdGFza3MpLCBhbmQgYSBsaXN0IG9mIHJlYWNoYWJsZSBzeXN0ZW1zIHdpdGggZGlzdGFuY2UsIGVuZXJneSBjb3N0LCBmbGlnaHQgdGltZSwgYW5kIG1hcmtldCBpbmZvcm1hdGlvbi4AALjKm1izYglnZXRwbGF5ZXL9Ai0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRwbGF5ZXIKc3VtbWFyeTogJ0dldCBwbGF5ZXIgaW5mb3JtYXRpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClRoaXMgYWN0aW9uIHJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgYSBwbGF5ZXIgaW5jbHVkaW5nIGJhbGFuY2UsIGRlYnQsIG5ldHdvcnRoLCBlbnRpdHkgY291bnRzLCBhbmQgcHJpY2luZyBmb3IgbmV4dCBwdXJjaGFzZXMuIFJldHVybnMgaXNfcGxheWVyPWZhbHNlIGlmIHRoZSBhY2NvdW50IGhhcyBub3Qgam9pbmVkIHRoZSBnYW1lLgDAVfmajLNiCmdldHN0YXJ0ZXKFAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRzdGFydGVyCnN1bW1hcnk6ICdHZXQgc3RhcnRlciBzaGlwIGFuZCBiYWxhbmNlIGluZm9ybWF0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpUaGlzIGFjdGlvbiByZXR1cm5zIHRoZSBzdGFydGVyIHNoaXAgc3RhdHMgYW5kIGluaXRpYWwgYmFsYW5jZSBhIG5ldyBwbGF5ZXIgd291bGQgcmVjZWl2ZSB1cG9uIGpvaW5pbmcuIFVzZWQgZm9yIG9uYm9hcmRpbmcgVUkgdG8gZGlzcGxheSB3aGF0IHBsYXllcnMgd2lsbCBnZXQgYmVmb3JlIHRoZXkgcmVnaXN0ZXIuAIDU2dyMs2IKZ2V0c3RyYXR1bQCAlbtGSo2zYgxnZXRzdW1tYXJpZXPoAi0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBnZXRzdW1tYXJpZXMKc3VtbWFyeTogJ0dldCBlbnRpdHkgc3VtbWFyaWVzIGZvciBhIHBsYXllcicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKUmV0dXJucyBsaWdodHdlaWdodCBzdW1tYXJpZXMgb2YgYWxsIGVudGl0aWVzIG93bmVkIGJ5IGEgcGxheWVyIGluY2x1ZGluZyB0eXBlLCBpZCwgb3duZXIsIG5hbWUsIGxvY2F0aW9uLCBhbmQgaWRsZSBzdGF0dXMuIE9wdGlvbmFsbHkgZmlsdGVyIGJ5IGVudGl0eSB0eXBlLgCi2ubmqullC2dyb3VwdHJhdmVsmgQtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogZ3JvdXB0cmF2ZWwKc3VtbWFyeTogJ01vdmUgbXVsdGlwbGUgZW50aXRpZXMgdG9nZXRoZXInCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYXRlIGdyb3VwIHRyYXZlbCBmb3IgbXVsdGlwbGUgZW50aXRpZXMgdG8gYSBkZXN0aW5hdGlvbi4gQWxsIGVudGl0aWVzIG11c3QgYmUgYXQgdGhlIHNhbWUgbG9jYXRpb24gYW5kIG93bmVkIGJ5IHRoZSBjYWxsZXIuIEF0IGxlYXN0IG9uZSBlbnRpdHkgd2l0aCBlbmdpbmVzIGlzIHJlcXVpcmVkIHRvIHByb3ZpZGUgdGhydXN0LiBGbGlnaHQgZHVyYXRpb24gaXMgY2FsY3VsYXRlZCBmcm9tIGNvbWJpbmVkIHRocnVzdCBhbmQgdG90YWwgbWFzcyBvZiBhbGwgZW50aXRpZXMuIENyZWF0ZXMgYW4gZW50aXR5Z3JvdXAgZm9yIGF0b21pYyByZXNvbHV0aW9uIGFuZCBjYW5jZWxsYXRpb24uAAAAAADQsGkEaGFzaP0BLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGhhc2gKc3VtbWFyeTogJ0NhbGN1bGF0ZSBzaGEyNTYgaGFzaCcKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKQ2FsY3VsYXRlcyB0aGUgc2hhMjU2IGhhc2ggb2YgYSBzdHJpbmcgYmFzZWQgdXNpbmcgdGhlIGdhbWUgc2VlZC4KCi0tLQAAAECE0rBpB2hhc2g1MTL7AS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBoYXNoNTEyCnN1bW1hcnk6ICdDYWxjdWxhdGUgc2hhNTEyIGhhc2gnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkNhbGN1bGF0ZXMgdGhlIHNoYTUxMiBoYXNoIG9mIGEgc3RyaW5nIGJhc2VkIHVzaW5nIHRoZSBnYW1lIHNlZWQuAAAAAACQ3XQEaW5pdPoBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IGluaXQKc3VtbWFyeTogJ0luaXRpYWxpemUgZ2FtZSBzZWVkJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbml0aWFsaXplIGEgdGhlIGdhbWVzIHNlZWQgYW5kIHNlZWQgdmFsdWVzIHRvIGJvb3RzdHJhcCBnYW1lIHN0YXRlLgAAAAAAMB19BGpvaW7JAS0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBqb2luCnN1bW1hcnk6ICdKb2luIGEgZ2FtZScKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKSm9pbiBhIGdhbWUgb2YgU2hpcGxvYWQKCi0tLQAAAAD45TKdBm5vdGlmeYoDLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IG5vdGlmeQpzdW1tYXJ5OiAnVGFzayBsaWZlY3ljbGUgbm90aWZpY2F0aW9uJwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpJbnRlcm5hbCBhY3Rpb24gdGhhdCBub3RpZmllcyBlbnRpdHkgb3duZXJzIG9mIHRhc2sgbGlmZWN5Y2xlIGV2ZW50cyAocmVzb2x2ZWQsIGNhbmNlbGxlZCkuIENhbGxlZCBpbmxpbmUgd2hlbiB0YXNrcyBjaGFuZ2Ugc3RhdGUuIFVzZXMgcmVxdWlyZV9yZWNpcGllbnQgdG8gZW5hYmxlIG9mZi1jaGFpbiBtb25pdG9yaW5nIHZpYSBhY3Rpb24gdHJhY2VzLgAAAIpd05C6CHJlY2hhcmdl0gItLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogcmVjaGFyZ2UKc3VtbWFyeTogJ1JlY2hhcmdlIHNoaXAgZW5lcmd5JwppY29uOiBodHRwczovL2F2YXRhcnMuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3UvMTQ3MjkyODYxP3M9NDAwJnU9M2IxYWY2NmU5MGRkODUxZjRkN2MwOTZlZDZhMmZiYjRiOWUxOTBkYQoKLS0tCgpTY2hlZHVsZSBhIHJlY2hhcmdlIHRhc2sgZm9yIGFuIGVudGl0eSB0byByZXN0b3JlIGVuZXJneSB0byBmdWxsIGNhcGFjaXR5LiBUaGUgcmVjaGFyZ2UgZHVyYXRpb24gZGVwZW5kcyBvbiBjdXJyZW50IGVuZXJneSBsZXZlbCBhbmQgcmVjaGFyZ2UgcmF0ZS4KCi0tLQAAAEDtSLG6B3Jlc29sdmXVAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiByZXNvbHZlCnN1bW1hcnk6ICdDb21wbGV0ZSBzY2hlZHVsZWQgdGFza3MnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KClJlc29sdmUgY29tcGxldGVkIHRhc2tzIGluIGFuIGVudGl0eSdzIHNjaGVkdWxlLCBhcHBseWluZyB0aGVpciBlZmZlY3RzIChyZWNoYXJnZSBlbmVyZ3ksIHVwZGF0ZSBsb2NhdGlvbiwgbG9hZC91bmxvYWQgY2FyZ28pLiBJZiBjb3VudCBpcyBzcGVjaWZpZWQsIHJlc29sdmUgZXhhY3RseSB0aGF0IG1hbnkgdGFza3M7IG90aGVyd2lzZSByZXNvbHZlIGFsbCBjb21wbGV0ZWQgdGFza3MuIEZhaWxzIGlmIGNvdW50IGV4Y2VlZHMgdGhlIG51bWJlciBvZiBjb21wbGV0ZWQgdGFza3MuCgotLS0AAAAAAJCjwQRzYWx03QEtLS0KCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogc2FsdApzdW1tYXJ5OiAnQXBwZW5kIFNhbHQnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkFkZCBhZGRpdGlvbmFsIHNhbHQgdG8gdGhlIG5leHQgZXBvY2ggc2VlZC4KCi0tLQAAZdegyU3FCnNwYXduY2FyZ28AAAAAVy08zc0IdHJhbnNmZXLIAy0tLQoKc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiB0cmFuc2ZlcgpzdW1tYXJ5OiAnVHJhbnNmZXIgY2FyZ28gYmV0d2VlbiBlbnRpdGllcycKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLQoKVHJhbnNmZXIgY2FyZ28gYmV0d2VlbiB0d28gZW50aXRpZXMgYXQgdGhlIHNhbWUgbG9jYXRpb24uIEJvdGggZW50aXRpZXMgbXVzdCBiZSBvd25lZCBieSB0aGUgY2FsbGVyIGFuZCBhdCBsZWFzdCBvbmUgbXVzdCBoYXZlIGxvYWRlcnMuIENyZWF0ZXMgbG9hZCBhbmQgdW5sb2FkIHRhc2tzIG9uIGJvdGggZW50aXRpZXMgd2l0aCBkdXJhdGlvbiBiYXNlZCBvbiBjb21iaW5lZCBsb2FkZXIgY2FwYWNpdHkgYW5kIFotZGlzdGFuY2UgYmV0d2VlbiB0aGVtLgAAAABEtc3NBnRyYXZlbMsCLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHRyYXZlbApzdW1tYXJ5OiAnTW92ZSBhIHNoaXAnCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0KCkluaXRpYXRlIHRyYXZlbCBvZiBhbiBlbnRpdHkgZnJvbSBpdHMgY3VycmVudCBsb2NhdGlvbiB0byBhIG5ldyBkZXN0aW5hdGlvbi4KCi0tLQoKVGhpcyBhY3Rpb24gZGV0ZXJtaW5lcyB0aGUgbWFya2V0IHByaWNlIG9mIGFsbCBpdGVtcyBhdCBhIGdpdmVuIGxvY2F0aW9uLgAAAAAAUK/hBHdhcnAAAAAAAACgquMEd2lwZbIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGUKc3VtbWFyeTogJ0RFQlVHOiB3aXBlIGFjdGlvbicKaWNvbjogaHR0cHM6Ly9hdmF0YXJzLmdpdGh1YnVzZXJjb250ZW50LmNvbS91LzE0NzI5Mjg2MT9zPTQwMCZ1PTNiMWFmNjZlOTBkZDg1MWY0ZDdjMDk2ZWQ2YTJmYmI0YjllMTkwZGEKCi0tLaDQVNoqrKrjDHdpcGVzZXF1ZW5jZcIBLS0tCgpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IHdpcGVzZXF1ZW5jZQpzdW1tYXJ5OiAnREVCVUc6IHdpcGVzZXF1ZW5jZSBhY3Rpb24nCmljb246IGh0dHBzOi8vYXZhdGFycy5naXRodWJ1c2VyY29udGVudC5jb20vdS8xNDcyOTI4NjE/cz00MDAmdT0zYjFhZjY2ZTkwZGQ4NTFmNGQ3YzA5NmVkNmEyZmJiNGI5ZTE5MGRhCgotLS0LAAAAAADKrkEDaTY0AAAJY2FyZ29fcm93AAC4ajqTJ0UDaTY0AAANY29udGFpbmVyX3JvdwCqppf57PJUA2k2NAAAD2VudGl0eWdyb3VwX3JvdwAAAJO6bBCNA2k2NAAADGxvY2F0aW9uX3JvdwAAAABc5U2sA2k2NAAACnBsYXllcl9yb3cAAABA7auwugNpNjQAAAtyZXNlcnZlX3JvdwAAAApNpa3CA2k2NAAADHNlcXVlbmNlX3JvdwAAAAAAUF3DA2k2NAAACHNoaXBfcm93AAAAAACVTcYDaTY0AAAJc3RhdGVfcm93AAAAAACsqs8DaTY0AAAJdHlwZXNfcm93AABQWNOmruEDaTY0AAANd2FyZWhvdXNlX3JvdwERU2hpcGxvYWQgKFNlcnZlcikRU2hpcGxvYWQgKFNlcnZlcikAAAAXAAAAAESFpkEOY2FuY2VsX3Jlc3VsdHMAAAAAgLzMRQx0YXNrX3Jlc3VsdHMAAAAAeBqrSgx0YXNrX3Jlc3VsdHMAAAAgI3NzVwx0YXNrX3Jlc3VsdHMAAGBuTYqyYgtnYW1lX2NvbmZpZwCwctnlqbJiDWVudGl0eV9pbmZvW10AAPDZ5amyYgtlbnRpdHlfaW5mbwAAAFiq7LJiCml0ZW1zX2luZm8AJnXZIBqzYg1sb2NhdGlvbl9pbmZvAIDJJiEas2IQbG9jYXRpb25fZGVyaXZlZAAA8OcaNbNiC25lYXJieV9pbmZvAAC4yptYs2ILcGxheWVyX2luZm8AwFX5moyzYgxzdGFydGVyX2luZm8AgNTZ3IyzYgxzdHJhdHVtX2RhdGGAlbtGSo2zYhBlbnRpdHlfc3VtbWFyeVtdAKLa5uaq6WUMdGFza19yZXN1bHRzAAAAAADQsGkLY2hlY2tzdW0yNTYAAABAhNKwaQtjaGVja3N1bTUxMgAAAIpd05C6DHRhc2tfcmVzdWx0cwAAAEDtSLG6D3Jlc29sdmVfcmVzdWx0cwAAAFctPM3NDHRhc2tfcmVzdWx0cwAAAABEtc3NDHRhc2tfcmVzdWx0cwAAAAAAUK/hDHRhc2tfcmVzdWx0cw=='
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
        declare depth: UInt16
        @Struct.field(UInt16)
        declare drill: UInt16
    }
    @Struct.type('warp_stats')
    export class warp_stats extends Struct {
        @Struct.field(UInt32)
        declare range: UInt32
    }
    @Struct.type('crafter_stats')
    export class crafter_stats extends Struct {
        @Struct.field(UInt16)
        declare speed: UInt16
        @Struct.field(UInt16)
        declare drain: UInt16
    }
    @Struct.type('entity_defaults')
    export class entity_defaults extends Struct {
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
    @Struct.type('craft')
    export class craft extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt16)
        declare recipe_id: UInt16
        @Struct.field(UInt32)
        declare quantity: UInt32
        @Struct.field(cargo_item, {array: true})
        declare inputs: cargo_item[]
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
    @Struct.type('deploy')
    export class deploy extends Struct {
        @Struct.field(Name)
        declare entity_type: Name
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(UInt16)
        declare packed_item_id: UInt16
        @Struct.field(UInt64)
        declare seed: UInt64
        @Struct.field('string')
        declare entity_name: string
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
        @Struct.field(crafter_stats, {optional: true})
        declare crafter?: crafter_stats
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
        @Struct.field(crafter_stats, {optional: true})
        declare crafter?: crafter_stats
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
            depth: UInt16Type
            drill: UInt16Type
        }
        export interface warp_stats {
            range: UInt32Type
        }
        export interface crafter_stats {
            speed: UInt16Type
            drain: UInt16Type
        }
        export interface item_def {
            id: UInt16Type
            mass: UInt32Type
        }
        export interface cargo_item {
            item_id: UInt16Type
            quantity: UInt32Type
            seed?: UInt64Type
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
    export interface craft {
        entity_type: NameType
        id: UInt64Type
        recipe_id: UInt16Type
        quantity: UInt32Type
        inputs: Type.cargo_item[]
    }
    export interface createentity {
        owner: NameType
        entity_type: NameType
        entity_name: string
        x: Int64Type
        y: Int64Type
    }
    export interface deploy {
        entity_type: NameType
        id: UInt64Type
        packed_item_id: UInt16Type
        seed: UInt64Type
        entity_name: string
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
    craft: ActionParams.craft
    createentity: ActionParams.createentity
    deploy: ActionParams.deploy
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
    craft: Types.task_results
    deploy: Types.task_results
    extract: Types.task_results
    getconfig: Types.game_config
    getentities: Types.entity_info[]
    getentity: Types.entity_info
    getitems: Types.items_info
    getlocation: Types.location_info
    getlocdata: Types.location_derived
    getnearby: Types.nearby_info
    getplayer: Types.player_info
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
