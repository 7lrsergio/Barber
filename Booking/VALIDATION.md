# Verification — September 14, 2026

Passed:

- 400 slot-generation cases across 30, 35, 45 and 50 minute services, checking opening/closing boundaries, conflicts and five-minute gaps.
- Exact 19:00 end time, rejection of past dates, and winter/summer conversion for the configured America/Chicago timezone.
- Adapter tests with simulated webhook responses: one shared in-flight request, cache reuse, incomplete-data rejection, timeout recovery, strict success validation, stable idempotency key on uncertain retry, HTTP 409 propagation and demo booking conflict detection.
- In-app browser walkthrough: four services, seven day columns, slot review, name/phone form, successful demo completion, booked slot becoming busy, service change from 30 to 50 minutes, and page refresh.
- Visual inspection at mobile and desktop sizes. No page overflow at 320px or 390px. Seven columns fit the 1440px desktop layout.
- Fixed and rechecked horizontal snap alignment so the sticky hour ruler does not cover today's first slot.
- No browser JavaScript errors reported during the walkthrough. All local HTML asset references resolve.

The n8n and Outlook endpoints are not connected. Adapter checks used simulated responses; no real calendar event was created. Simultaneous-booking guarantees require the future backend implementation described in backend/README.md.

## Style and upcoming-day update

- Matched the reference palette from its computed styles: #C41E24, #F7F5F2, #1E1919, black and white.
- Removed external fonts; animations require no additional assets.
- Both the API date window and rendered calendar begin tomorrow in the shop timezone and contain seven dates.
- Added seven compact date-navigation buttons above the timelines.
- Rechecked syntax, local asset references, slot calculations and connector adapter behavior. Visual verification of this update was blocked by the browser local-file URL policy. Earlier browser walkthrough results above apply to the preceding version.
