# Future n8n / Outlook connector

This directory specifies the backend boundary. It is not a running backend. `../api.js` is the browser-side connector adapter; no backend JavaScript is loaded by the pages.

## Availability webhook

Accept the request in `contracts.json` and return **every requested date exactly once**, including empty `busy` arrays for completely free days. The frontend rejects missing dates, reversed times and malformed responses instead of treating them as free availability.

Query the calendar for the whole date window in one workflow, including events crossing its boundaries. Resolve local midnight boundaries using the shop timezone, fetch all calendar result pages, expand recurring occurrences, ignore cancelled/free events, and split events crossing midnight into daily blocks. Convert Outlook timestamps to the configured shop timezone on the server. Return only `HH:MM` strings, using `24:00` for an end at midnight. Labels should be generic; do not expose customer names or Outlook event subjects. The browser intentionally does not accept raw Graph event objects or timezone-less ISO timestamps.

## Booking webhook

Return success only after Outlook confirms creation. For conflicts, return HTTP 409 and `{ "ok": false, "code": "SLOT_TAKEN", "message": "Ese horario ya se ocupó." }`. The page refreshes the calendar and requests another selection. Other failures display an error and allow retry.

Before creating an event, independently validate the service against a server-owned catalog, its price/duration, opening hours, timezone, start/end consistency, date horizon, contact data and five-minute buffer. Re-read Outlook availability and serialize the conflict-check/create operation per calendar, or use an equivalent transactional reservation system. A check followed by create without serialization can double-book.

Persist `requestId` as an idempotency key with its normalized payload and confirmed event ID. Return the existing result for retries of that same request; reject key reuse with different details. The frontend retains the ID across uncertain retries with identical data. Outlook event duration excludes the five-minute break; both availability checks and future booking checks must enforce that break on either side.

Keep Microsoft authorization and any database credentials on the server. Restrict CORS to the site's origin, support OPTIONS plus POST with Content-Type, and apply validation/rate limiting. Public browser configuration cannot hold a secret. If using browser webhook URLs, they must be public endpoints with server-side protections.

Changing to a database later only requires an adapter that preserves these contracts. No frontend layout changes are needed.
