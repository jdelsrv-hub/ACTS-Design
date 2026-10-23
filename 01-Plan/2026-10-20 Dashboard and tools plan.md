# acTS creator dashboard and tools: engineering plan

All Creative Technology Solutions (acTS) · grows the website from the [website to-do list](2026-10-19%20Website%20to-do%20list.md) · drafted 20 Oct 2026

The goal is a logged-in area where creators see their stats from every platform in one place and use acTS tools (security checkup, setup builder, clip finder and more), joined up with our services.

**Who:** J = Jess, C = Claude, J+C = together. Costs are estimates in USD; check before paying. Time estimates assume Jess part-time with Claude writing the code.

## Bottom line

- The one-page site stays as the public front door. The app is built separately at `app.<our domain>`.
- Login runs on a managed service; we don't build our own.
- Creator stats come only through each platform's official API, never by scraping.
- The bottleneck is the platforms' app approvals, not the code. Those approvals need our site live on our own domain with a privacy policy, so launching the current site is also step one for the app.
- An MVP is roughly 3 months part-time.

## What we're building

| Area | What creators get | Which acTS service it supports |
| --- | --- | --- |
| Login | Email link or Google sign-in, optional 2-step login, delete-my-account | All of them |
| Dashboard | Followers, views, watch time, top posts and 28-day trends across connected platforms | Content analytics |
| Security checkup | Interactive checklist and score: 2-step login, recovery email, password manager, doxxing check | Safety and security packs |
| Setup builder | Answer a few questions, get a budget parts list from a gear list Jess keeps up to date | Beginner setup builds |
| Clip finder | Upload a long video. It's transcribed, then Claude suggests clip moments with timestamps, titles and captions. Cutting the clips stays with us in v1 | Clipping |
| Later | Title and caption helper, monthly PDF report, client area (deliverables, invoices) | Analytics, retainers |

## Architecture

```
creator ─► our-domain.com.au      static site (08-Website/site/index.html, Cloudflare Pages)
        └► app.our-domain.com.au  Next.js on Cloudflare Workers
              ├─ Supabase Auth      login, Google sign-in, 2-step
              ├─ Supabase Postgres  users, platform connections, daily stats, tool runs
              ├─ Nightly sync job ─► YouTube · Twitch · Instagram · TikTok APIs
              ├─ Cloudflare R2      uploaded videos for the clip finder
              └─ Claude API + speech-to-text   powers the tools
```

| Piece | Pick | Cost (USD) |
| --- | --- | --- |
| App hosting | Cloudflare Workers (free tier allows commercial use) | Free, about $5/mo once background jobs run |
| Login and database | Supabase | Free while building. About $25/mo once real clients use it, because free projects pause when idle |
| Files | Cloudflare R2 | Cents per GB |
| AI | Claude Sonnet 5.5, with a usage limit per user so costs can't run away | Pay per use |
| Bot protection | Cloudflare Turnstile on sign-up and login | Free |
| Code | Git and GitHub. The ACTS folder isn't under version control yet | Free |

## Pulling platform data

Each creator logs in to acTS, then clicks "Connect YouTube" (or another platform) and approves read-only access. A nightly job copies their stats into our database, so the dashboard loads fast and doesn't run into API limits.

| Platform | What we can get | Approval |
| --- | --- | --- |
| YouTube | The richest data: views, watch time, subscribers, retention, top videos | Google verification. Works for up to 100 test users before that |
| Twitch | Followers, stream info, clips and VODs. Detailed viewer analytics aren't in the API | Easy |
| Instagram | Reach, followers, post insights. Only for Business and Creator accounts | Meta app review plus business verification. Can take weeks |
| TikTok | Profile and video counts. Deeper analytics are restricted | App review. Partial data only |

These rules change often, so checking current access is part of week one.

## Security essentials

A leak of creators' platform logins would sink a business that sells safety packs. These are in place from day one:

1. We don't build our own login system. Two-step login is available to everyone and required for Jess's admin account.
2. Read-only platform access only. Stored platform logins are encrypted, never written to logs and never sent to the browser.
3. Every database table is locked per user, with automated tests proving one creator can't see another's data.
4. Disconnecting a platform cancels our access and deletes its data, and account deletion works from launch. The platforms require both.
5. Staff access is logged. When Jess opens a client's dashboard, it's recorded and the client can see it.

## Build phases

| Phase | What gets built | Rough time | Done when |
| --- | --- | --- | --- |
| 0. Foundations | Git and GitHub. Launch the static site with a privacy policy and terms. Register developer apps with Google, Twitch, Meta and TikTok and submit for review | 1–2 wks | Site live with HTTPS, reviews submitted |
| 1. Login | Sign up and sign in, 2-step login, roles (creator, staff, admin), delete account, screens styled from the brand kit | 2 wks | A family creator can sign up and delete their account |
| 2. Dashboard v1 | Connect YouTube and Twitch, nightly sync, stat cards and trends | 3–4 wks | Real stats for 3 beta creators, refreshed nightly |
| 3. Tools v1 | Security checkup, then setup builder, then clip finder | 3–4 wks | Each tool used by a beta creator |
| 4. Private beta | Family creators use it for a few weeks. Add error alerts and backups, and do a security self-review | 2–3 wks | No serious issues left open |
| 5. Grow | Instagram and TikTok once approved, monthly report, caption helper, client area, and payments if it goes self-serve | Ongoing | |

## What the advisor views agree on

- **Official APIs only.** Scraping breaks platform terms, gets accounts flagged and contradicts "safety by default". The trade-off is that some data, like TikTok depth and Twitch viewer numbers, won't be available.
- **Launch the site first, then the app.** The site is nearly done, and Google's approval needs it live.
- **The charts aren't what makes this valuable.** YouTube Studio and Social Blade already show stats for free. What acTS adds is the dashboard joined to the service: "here are your numbers, and here's what we'll do about them."

## Next actions

- [ ] **C:** Set up Git and GitHub and move `08-Website` in. This week.
- [ ] **J+C:** Buy the domain, set up hello@ email, and publish the privacy policy and terms (website to-do list phases 2 and 4). Jess buys the domain, Claude drafts the documents. Within 2 weeks. The ABN is already done.
- [ ] **J+C:** Register the four developer apps in acTS's name and submit them for review. Jess creates the accounts, Claude writes the submissions. Within 2 weeks of the domain going live.
- [ ] **J:** Add three dashboard questions to the family creator chats: which platforms they use, which stats they check, and whether they'd connect their accounts to us.
- [ ] **C:** Clickable prototype with fake data in `08-Website/app-prototype/`, for family creators to react to before real code starts. Started 20 Oct 2026.

## Decision for Jess: who is the dashboard for at launch?

Phases 0–2 are the same either way, so work can start now. This needs deciding before phase 3.

| Option | Upside | Downside |
| --- | --- | --- |
| **A. Private client portal:** only acTS clients Jess invites | Faster, safer and cheaper. Adds value to the services | Jess stays the limit on how many people it serves |
| **B. Self-serve product:** anyone can sign up | Bigger upside and recurring revenue | Needs billing, support, tougher approval reviews and more privacy work. Competes with free tools |

Decided: not yet.
