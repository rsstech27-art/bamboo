---
name: Ambiguous order-save failures
description: Why a connection failure during order creation cannot guarantee that a retry is duplicate-free.
---

Treat a lost order-creation response as an unknown outcome, not proof that the order was never saved. Do not promise duplicate-free retries based only on a disabled button or an in-flight client lock.

**Why:** The server can commit an order before the response is lost. Client-only error handling cannot distinguish that case from a request that never reached the server.

**How to apply:** When extending КП retries, use a durable server-side idempotency contract if retries must be guaranteed safe. Until then, keep retries explicit and disclose ambiguous outcomes; do not add automatic POST retries.