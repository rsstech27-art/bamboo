---
name: Checking named tester continuations
description: Handling a continuation that reports the old flow rather than the requested new one.
---

Check that a tester continuation's report actually addresses the requested flow, not just that its verdict is successful.

**Why:** A continuation through sendFollowup returned another report for the preceding geometry check instead of the new touch/PDF task. Continuing the same named tester through subagent with an explicit task delivered the intended verification.

**How to apply:** Follow the current delegation documentation first. If the report covers stale work, continue the same named tester with an explicit task rather than accepting the stale report or launching a second tester.