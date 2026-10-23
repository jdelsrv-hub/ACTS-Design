# acTS creator dashboard: clickable prototype

Started 20 October 2026. This is a **prototype with fake data**, made so the family creators can click through it and tell us what they think before any real login or platform code is written.

- No backend, no real login, no real API calls. Every number, post, clip and price is made up.
- Nothing is saved or sent. Reloading the page resets everything.
- It doesn't lock in any tech choices. It's one static file: `index.html` with the CSS and JavaScript inside it. The only outside request is Google Fonts.

## How to open it

Double-click `index.html`, or open it in any browser. It's built for phones first and works at desktop width too. To show it on a phone, upload this folder anywhere that serves static files, or send the file and open it in the phone's browser.

You can jump straight to a screen by adding `#home`, `#tools`, `#security`, `#setup`, `#clips`, `#captions` or `#settings` to the end of the address.

## Screens

| Screen | What you can try |
| --- | --- |
| 1. Login | Email (prefilled) and "Continue with Google". Both are fake and go to the dashboard. |
| 2. Dashboard home | Followers and subscribers, views and watch time cards. A 28-day trend chart (switch between views, watch time and new followers; hover or tap for each day; "See the daily numbers" shows a table). Top 5 posts. Connected platforms: YouTube and Twitch connected, Instagram and TikTok "Coming soon". A security score card leads to the checkup. |
| 3. Tools | Four tiles. **Security checkup** works: tick items to change the score out of 100 (2-step login on YouTube, Twitch, Instagram and TikTok, password manager, recovery email and phone, separate business email, doxxing check), with "Show me how" steps for each. **Setup builder**, **Clip finder** and **Title & caption helper** show a realistic sample result. |
| 4. Settings | Connected accounts with Disconnect (and Connect again). Disconnecting a platform takes it out of the dashboard numbers. A 2-step login switch, log out, and "Delete my account" with a confirm step. |

## Questions to ask the creators

1. Which numbers do you check first? Is anything missing?
2. Would you use the security checkup? Was anything confusing?
3. Which of the other three tools would you use most?
4. Would you connect your accounts to a dashboard like this? What would make you trust it?

## Brand notes

Built from `02-Brand/` and matched to `08-Website/site/index.html`: Night background, Studio Purple, Lilac text, Space Grotesk headings, Inter body, 12px cards, Lucide-style line icons, Australian spelling. Solid Signal Green buttons appear once per screen: "Continue with email" on Login, "Start your security checkup" on Home, the open tool's main button on Tools. Settings has none. The darker card and border shades (`#1E1738`, `#221A3D`, `#2A2049`, `#34295C`, `#3A2585`) are blends of Night and Studio Purple, the same ones the website uses.

Checked against `02-Brand/05-brand-checklist.md` on 20 October 2026. Everything passes: the name is always written acTS, with the full name on first mention (login, sidebar and footer). The copy uses "we", Australian spelling and AUD inc. GST, with no hype words, exclamation marks or emoji. Tech terms like 2-step login, doxxing, watch time and capture card get a plain-words explanation, every screen ends with a next step, and Instagram and TikTok point to each app's own stats until they're ready.

## Status colours

Added 20 October 2026 at Jess's request, and now part of the brand kit (`02-Brand/03-visual-identity.md`, "Status colours"), so creators can tell at a glance what's fine, what needs a look and what can't be undone. Each one always comes with an icon and a word (like "At risk" or "Done"), so it still works for colour-blind creators.

| Colour | Hex | Means | Where it shows up | Contrast on Night / cards |
| --- | --- | --- | --- | --- |
| Alert Red (new) | `#FF6B70` | Errors, at risk, going down, can't be undone | Login email error, "Delete my account" and its confirm, "Yes, disconnect", security score under 40, watch time "Down 3%" | 6.6:1 / 5.9:1 |
| Caution Amber (new) | `#FFC857` | Needs a look, reversible warnings | "YouTube isn't connected" notice, "Not connected" chips, the disconnect warning, 2-step login "Off", security score 40 to 79 | 11.9:1 / 10.6:1 |
| Signal Green (existing) | `#2FD47F` | Safe, done, connected, going up | Ticked checklist items and "Done" chips, "Connected", 2-step login "On", security score 80 and up, "Up 18%" trends, "Copied" | 9.5:1 / 8.5:1 |

Text inside the tinted panels stays white (12:1 or better). Solid red buttons use Night text (6.6:1), the same way green buttons do. All pairs pass WCAG AA.