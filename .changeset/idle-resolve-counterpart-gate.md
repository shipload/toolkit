---
"@shipload/sdk": patch
---

composeIdleResolve no longer emits a resolve for a hold counterpart unless a lookupCounterpart confirms it has a completed task. Without the lookup the counterpart may be in-flight, which produced spurious "No completed tasks to resolve." failures on transfers.
