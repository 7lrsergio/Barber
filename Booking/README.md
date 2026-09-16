# Barbería — booking website

Two pages, plain HTML, CSS and JavaScript; no build step or framework.

## Run

Open `index.html`, or for the full animated loading transition serve this folder:

```sh
python3 -m http.server 8080
```

Then visit http://localhost:8080. Upload this folder's contents to any static host when ready.

## What works

- Four Spanish service cards with the supplied prices, descriptions and durations.
- Tomorrow plus the following six days (seven upcoming days total), with all seven dates in a compact navigation row; mobile timelines scroll horizontally.
- 11:00–19:00 opening hours, duration-sized appointments, five-minute gaps.
- Select a time, review the service/date/time/price, enter name and phone, then confirm.
- One shared availability request starts on service selection and continues behind page 2's loader. Moving across days makes no additional requests. Refresh uses a 90-second cache; retries/conflicts refresh availability.
- Time calculations use the shop's configured timezone, even when a visitor is elsewhere.
- Keyboard controls, labeled form inputs, reduced-motion support, loading/error/empty/success states.
- Demo bookings stay in the current browser session and remove the selected time from availability. Demo mode never claims to create an Outlook event.

## Configuration

Edit `config.js` for business name, timezone, hours, closed weekdays, service catalog, five-minute buffer and day count. It defaults to `America/Chicago` from your supplied configuration; set the shop's actual IANA timezone before launch. Set `startOffsetDays: 0` to include today instead of starting tomorrow. All weekdays are open by default, as no closing day was requested. Currency is displayed as the supplied `$` without assuming a currency code. Set `daysAhead: 14` to show fourteen days total.

## Connect n8n later

1. Implement the two endpoints described in `backend/README.md` and `backend/contracts.json`.
2. Paste their production URLs into `config.js` under `webhooks`.
3. Set `useMockData: false`.
4. Test with the actual Outlook calendar before taking real bookings.

No n8n credentials, Microsoft tokens, deployed server or database are included. A live booking is successful only when the server returns `{ "ok": true, "eventId": "..." }`. The connector must enforce availability and prevent simultaneous bookings. Browser validation alone cannot do that.

## File map

- `index.html` / `page-servicios.js`: service selection.
- `agenda.html` / `page-agenda.js`: calendar, review form and confirmation.
- `styles.css`: reference-site red (#C41E24), warm off-white (#F7F5F2), black and clean system typography.
- `time.js`: shop-timezone conversion and pure slot generation.
- `api.js`: cache, demo data and the two connector calls.
- `config.js`: owner-editable settings.
- `backend/`: connector documentation and JSON contract, separate from the frontend.

The supplied folder had inconsistent filenames and no service-page controller. This repaired copy uses the filenames referenced by its HTML. The original Desktop folder is unchanged.

## Lightweight visual update

Colors and clean typography follow https://barberstudio05.com/. There are no remote font, image, video or animation-library downloads. Short CSS entrance and interaction animations respect reduced-motion settings. Only the loading indicator animates continuously while waiting.
