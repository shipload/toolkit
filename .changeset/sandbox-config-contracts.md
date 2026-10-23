---
"@shipload/cli": patch
---

- Resolve contract accounts and chain URL from config.ini even when the player config fails to load, so a Sandbox profile without an actor no longer targets the live game
