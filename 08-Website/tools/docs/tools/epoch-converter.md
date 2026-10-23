# Epoch converter

Convert a Unix timestamp to a date and back, in local time or UTC.

- Opens at: `/epoch-converter`
- Code: `public/assets/js/tools/files/epoch.js` (custom tool)
- Runs on: your device (nothing uploaded)
- Libraries: none (the browser's own `Date` and `Intl.DateTimeFormat`)

## How to use
1. **Timestamp to date**: enter a Unix timestamp, or select **Now**. The local time, UTC and ISO 8601 versions appear straight away.
2. **Date to timestamp**: pick a date and time, and choose whether to read it as local time or UTC. The timestamp appears in seconds and milliseconds.
3. Use the copy button next to any result.

## Options
- Unix timestamp: starts on the current time, in seconds.
- Date and time: starts on the current local time, to the second.
- Read it as: Local time or UTC (default Local time).

## How it works
A Unix timestamp counts from 1 January 1970 UTC. `fromTimestamp()` works out the unit from the size of the number: below 100 billion is seconds, then milliseconds, microseconds and nanoseconds. It shows the date in Australian style ("Wednesday, 21 October 2026 at 8:05:12 pm AEDT") in your device's time zone (named in the label, like "Local time (Australia/Sydney)") and in UTC. `toTimestamp()` reads the date as local time or UTC and rounds down to whole seconds.

## Limits
- Millisecond timestamps before 3 March 1973 are too small to tell apart from seconds, so they're read as seconds. Seconds timestamps after the year 5138 are read as milliseconds.
- Local time is your device's time zone. There's no picker for other zones.
- Dates before 1970 work (negative timestamps). Leap seconds aren't counted, the same as Unix time.

## How to test
Named exports, no UI:
- `fromTimestamp('0')` gives `unit: 'seconds'` and `iso: '1970-01-01T00:00:00.000Z'`.
- `fromTimestamp('1792573512')` and `fromTimestamp('1792573512000')` both give `iso: '2026-10-21T09:05:12.000Z'`, with `unit` `seconds` and `milliseconds`. A 19-digit number gives `nanoseconds`.
- `fromTimestamp('abc')` is `null`.
- `toTimestamp('1970-01-02T00:00:00', 'utc')` gives `{ seconds: 86400, ms: 86400000 }`. Without `'utc'` the result shifts by your time zone's offset.
