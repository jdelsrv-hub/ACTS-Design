# Affiliate and pricing check

empire-scout · 23 Oct 2026 · Mission 1 (approved by Jess 23 Oct 2026) · Read only: nothing signed up for.

Confidence labels: **verified** = read on the official page today. **Partly verified** = official page, but some detail missing or from an older official help page. **Unverified** = blogs, forums or third-party listings only.

Part C is first because empire-maker is waiting on it. Parts A and B follow.

---

## Part C: where to sell digital products (stream 3)

### The situation

Jess is an Australian sole trader, not registered for GST, selling a PDF pack (Creator Security Pack) mostly to creators, some of them overseas.

Tax facts that drive the choice:

- **Australian GST:** you only have to register once GST turnover reaches **A$75,000** (current month plus previous 11, or projected next 12). Below that, Jess charges no GST on Australian sales. (ATO "Registering for GST", via search; the page itself returned 403 to the fetcher. Partly verified.)
- **EU VAT:** a seller based outside the EU who sells digital services to EU consumers has **no threshold**. VAT is due from the first sale, through the non-Union One Stop Shop. The €10,000 threshold applies only to EU-based sellers. (European Commission OSS pages. Verified.)
- **UK VAT:** believed to be the same (no threshold for non-UK sellers of digital services). Not re-checked today. Unverified.

So if Jess is the legal seller and sells one PDF to someone in France, Jess is technically meant to register for EU VAT. A store that collects and pays the overseas tax on Jess's behalf removes that problem.

### Comparison

| | Stripe Payment Links + Managed Payments | Payhip (Free plan) | Lemon Squeezy | Gumroad | Stripe Payment Links alone |
| --- | --- | --- | --- | --- | --- |
| Monthly fee | $0 | $0 (Plus $29/mo at 2%, Pro $99/mo at 0%) | $0 | $0 | $0 |
| Platform fee | 3.5% per sale (Managed Payments), on top of Stripe fees | 5% | 5% + US$0.50 | 10% + US$0.50 (Discover marketplace sales: 30%) | None |
| Card processing | 1.65% + A$0.30 (AU cards), 3.5% + A$0.30 (overseas cards), +2% if currency conversion is needed | Your own Stripe or PayPal at their normal rates (Stripe AU as at left) | Included, but +1.5% on any sale to a buyer outside the US (Australians count), +1.5% PayPal | Unclear. Gumroad's page lists only 10% + 50c and says "no hidden fees"; most blogs say 2.9% + 30c is added on top. Unverified. | 1.65% + A$0.30 (AU), 3.5% + A$0.30 (overseas), +2% conversion |
| Payout to an AU bank | Free on the standard schedule (instant payout 1.5%, min A$0.50) | Instantly to your own Stripe or PayPal; Stripe then pays your bank free | Twice a month; **1% per payout to a non-US bank**; PayPal 3% (max US$30) | Weekly (Fridays), min US$10, AU bank supported (older help article, partly verified) | Free on the standard schedule |
| Who handles overseas tax | **Stripe (Link) is merchant of record**: collects and pays sales tax, VAT and GST in 80+ countries, including the EU, UK, US, Canada, NZ and Australia | **Payhip collects and pays EU and UK VAT, US and Canadian sales tax on digital products.** Not a full merchant of record: Jess stays the seller everywhere else (other countries mostly have thresholds a small seller won't reach). | Merchant of record, worldwide | Merchant of record since 1 Jan 2025, worldwide | **Jess.** EU VAT is due from the first EU sale. |
| Delivers the file | No. Payment Links can redirect to a page; you host the download. | Yes, plus PDF stamping, discount codes, a storefront, and an affiliate program for your own products | Yes | Yes | No |
| Status / risks | Generally available to Australian businesses since 22 Apr 2026. Needs an eligibility review. Buyers see "Sold through Link" and `LINK.COM*` on their statement, which may confuse people. No custom domain on the checkout. | Small company, long-running. Uses Jess's own Stripe account (which Jess will want for service invoices anyway). | Owned by Stripe since 2024 and being steered toward Stripe Managed Payments. The CEO's Jan 2026 post admits "slower support responses and less frequent product updates". **Don't start new here.** | Most expensive. The Discover marketplace barely surfaces security products (see below), so the 30% channel adds little. | Cheapest, but leaves Jess with EU/UK VAT duty. |
| Confidence | Verified (Stripe AU pricing page, Managed Payments docs, eligibility, tax compliance, 22 Apr 2026 changelog) | Verified (Payhip pricing page) | Verified (pricing page, fees doc, Jan 2026 update) | Partly verified | Verified |

**Stripe note:** the Stripe AU pricing page says overseas card pricing will drop from 1 Apr 2027 but does not yet give the new rate.

### Worked example: one A$29 sale

The Stripe and Payhip figures use the official rates above. The Lemon Squeezy and Gumroad lines are worked on US$19, because they charge in USD (convert at the day's rate).

| Store | Australian buyer: fees / you keep | Overseas buyer: fees / you keep |
| --- | --- | --- |
| Stripe Payment Links + Managed Payments | A$1.79 / **A$27.21** (6.2%) | A$2.33 / **A$26.67** (8.0%) |
| Payhip Free + own Stripe | A$2.23 / **A$26.77** (7.7%) | A$2.77 / **A$26.23** (9.5%). Price in AUD to avoid Stripe's 2% conversion fee. |
| Lemon Squeezy (US$19) | US$1.91 incl. 1% payout fee / US$17.09 (10.0%) | US buyer: US$1.63 / US$17.37 (8.6%) |
| Gumroad direct (US$19) | US$2.40 / US$16.60 (12.6%), or about 17% if processing is charged on top | same |
| Stripe Payment Links alone | A$0.78 / A$28.22 (2.7%) | A$1.32 / A$27.68 (4.5%), plus EU VAT duty |

Tax note: with a merchant of record (Stripe Managed Payments, Lemon Squeezy, Gumroad), sales tax may be added to the buyer's price or taken out of it, depending on how the price is set. Stripe says Managed Payments applies each country's thresholds, so some sales are "not subject to tax". Whether Australian buyers of an under-threshold seller get charged GST under Managed Payments is **unverified**: test it with one sale before launch. With Payhip, Australian buyers pay no GST because Jess isn't registered.

### Pick: Payhip, Free plan

Why:
1. **It's the smallest complete build.** One account gives you a storefront, checkout, file delivery, PDF stamping, discount codes and receipts. Stripe Payment Links would need a separate download page and delivery setup.
2. **It handles the tax that bites.** EU and UK VAT (no threshold for overseas sellers) plus US and Canadian sales tax are collected and paid by Payhip at no extra charge.
3. **No GST added for Australian buyers**, who are likely the main audience, and nothing for Jess to lodge.
4. **Money lands in Jess's own Stripe account**, which Jess will also use to invoice service clients (stream 1). Stripe pays out to an AU bank free.
5. **About 1.5 points dearer than Stripe Managed Payments** (A$0.44 a sale at A$29). That's a fair trade for file delivery and simpler setup.

When to switch: if sales reach roughly 50 a month, or Jess wants a full merchant of record everywhere, move to **Stripe Payment Links + Managed Payments** (same Stripe account; needs a download page). Upgrade to Payhip Plus ($29/mo, 2%) only once monthly sales top about $967, the break-even point where the 3-point saving covers the fee.

Avoid Lemon Squeezy (being wound into Stripe, payout fee to AU banks) and Gumroad (highest fees, unclear processing charge).

Needs Jess: sign up for Payhip and connect Stripe or PayPal (Jess only). Stripe asks for identity, business and bank details at sign-up.

### Comparable products for the Creator Security Pack

**Headline: there are almost no paid, creator-specific security or doxxing guides with proof of sales.** That means little competition, but also no proven price.

| Product | Where | Price | Proof | Confidence |
| --- | --- | --- | --- | --- |
| Password Security Checklist (PDF, 6 sections, 162 KB) | Payhip (EcoVolt Living Press) | US$6.99 "on sale" | "No reviews yet" | Verified (product page) |
| Ultimate Privacy Policy Checklist 2025 (privacy policy, not account security) | Gumroad | US$3.99 (search snippet) | None shown | Unverified |
| Influencers Cybersecurity101: A Guide for Content Creators | Gumroad (cybereducation) | US$10+ (search snippet) | None shown | Unverified (page wouldn't render) |
| The Watcher's Watcher: Counter-OSINT, How to Know You're Being Investigated | Gumroad Discover | A$78.39 | No rating shown | Verified (Discover listing) |
| AI OSINT Complete Kit (prompt pack + playbook) | Gumroad Discover | A$78.39 | No rating shown | Verified (Discover listing) |
| Extreme Privacy: What It Takes to Disappear, 5th ed. (590 pages; general privacy, not creator-specific) | inteltechniques.com | PDF US$40 | 5 editions since first release; long-running, well-known | Verified (publisher page) |
| Bitdefender Security for Creators (monitoring software for YouTube, Instagram, Facebook accounts; 30-day trial) | bitdefender.com | US$119.88 / $179.88 / $239.88 a year (three tiers; tier-to-price mapping unclear) or US$14.99–23.99 a month | Big brand, sold at Best Buy and Walmart | Partly verified (official page via search extract) |
| DeleteMe (data-broker removal) | joindeleteme.com | US$129 a year (one person) | Large US service. A third-party source says US residents only. | Unverified |
| Optery (data-broker removal; lists Australia as a market) | optery.com | From US$39 a year | | Unverified |
| Udemy: OPSEC for Beginners; Social Media Security 101 | Udemy | Varies with Udemy sales | Ratings vary; one comparable shows 4.4 from 634 ratings | Unverified |

Free competition: YouTube's guided recovery assistant for hacked channels, platform safety pages, Streamlabs and Bitdefender blog guides, and Australia's eSafety Commissioner. The pack has to sell **curation, an Australian angle and saved time**, not secret information.

Searches that turned up nothing relevant on Gumroad Discover: "doxxing" (one result), "privacy", "privacy guide", "opsec", "cybersecurity creators", "digital privacy", "online safety". Etsy blocked the browser (blank page), so it wasn't checked.

### Price recommendation for empire-maker

- **A$29** for the pack (inside the plan's A$19–39 band). That's above the no-proof checklist tier (US$4–10) and below the deep manual (Extreme Privacy, US$40) and the paid monitoring services (US$119+ a year).
- Optional launch price of **A$24** for the first two weeks, to collect first reviews.
- Make it clearly more than a checklist: platform-by-platform 2FA and recovery steps, a doxxing self-audit, a "hacked: what to do in the first hour" card, and Australian contacts (eSafety, Scamwatch, IDCARE, ReportCyber).
- Upsell to a service: a paid "security setup session" (see Part B for prices). That's where the bigger money is.
- Affiliate fit: Proton (password manager, email aliases, VPN) and Bitdefender Security for Creators fit the pack naturally (see Part A). **Amazon links (for example a YubiKey) must not go inside the PDF**: Amazon AU bans its links in ebooks and documents. Link from the PDF to an acTS web page that holds the Amazon links instead. Check each program's own terms for PDF use before placing links.

---

## Part A: affiliate programs (stream 4)

Every program here accepts or can take Australian affiliates unless noted. Jess does every sign-up.

### Disclosure: what Australian rules expect

- The ACCC wants paid relationships made **obvious in each post**. Its 2023 sweep flagged vague tags ("sp", "collab", "ambassador"), disclosures buried in hashtags or at the end of long captions, and bio-only disclosure. It treats discount codes and referral links as signs of a commission that must be disclosed. (ACCC sweep findings and media releases. Verified.)
- The AANA practice note lists "#ad", "Advertising" and "Paid Partnership" as clear. It says "Affiliate" **on its own may not be enough**. Use plain words, such as: "Ad: I earn a commission if you buy through these links, at no extra cost to you." (AANA submission on the ACCC site. Partly verified.)
- Amazon also requires this exact line: "As an Amazon Associate I earn from qualifying purchases." (Operating agreement, updated 15 Oct 2025. Verified.)

### Creator gear

| Program | Commission | Cookie | Payout | Entry rules | Fit | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| **Amazon Associates AU** | Camera & Photo **5%**; Electronics **5%**; Musical Instruments **5%**; Computers (incl. PC parts) **2%**; Video Games 2%; Software 2%; Home & Furniture 10%; Kitchen 10%; All other products 2%. Bounties: Audible trial $10, Prime trial $4 (currency not stated; AU program). | 24 hours from the click; items added to the cart in that window count if bought before the cart expires (~90 days). Since 14 May 2026, items must be shipped and paid for within 180 days. | AUD. Direct deposit or gift card; under A$10 rolls into the next month. Cheque min A$100. | **3 qualifying sales within the first 180 days** or the account is closed; your own orders don't count. No link shorteners or cloaking. **No links in ebooks, printed material or documents.** Emails only if opted in. | Web versions of the budget setup guides, tool pages, video descriptions. YubiKey 5 NFC is listed on amazon.com.au at about A$94 with ~12,000 ratings (Computers, so 2%). | Verified (official fee schedule, policies, help pages) |
| **RØDE** (Sydney brand) | **15%** of sale | **14 days** | Via UpPromote; method and minimum not shown | Australia accepted. Form asks for your largest social channel and age 18+. RØDE contacts you if approved. | Audio section of setup guides, mic picks, audio tool pages | Verified (RØDE help page + program sign-up page) |
| **Logitech** (Logitech G, Blue mics and others) | 4–10%, varies by brand | 30 days | Via Impact; not stated | US page; Australian eligibility not stated | Webcams, mics, lighting in setup guides | Partly verified |
| **Elgato** | No public affiliate program. The partnership portal says it's closed for now. | | | | Use Amazon AU links instead | Partly verified (Elgato site via search) |
| **Corsair** | Creator Program has an "Affiliate" tier, but terms aren't public | | Third-party network | Apply via creator form | PC parts | Unverified |
| **PCCaseGear** | Up to 5% | 30 days | Awin | Awin account | Budget streaming-PC guide (beats Amazon's 2% on PC parts) | Partly verified (Awin profile via search) |
| **Scorptec** | 4% | 30 days | FlexOffers, paid in USD | FlexOffers account; page updated Feb 2025, status unclear | Budget streaming-PC guide | Partly verified |
| **Mwave** | 1% | 30 days | Commission Factory (min A$50, weekly Thursday runs, AU bank or PayPal) | Listing appeared in search, but the directory page now returns 404, so it may be closed | Low value | Partly verified |
| **JB Hi-Fi** | Program exists on Partnerize; rate not public (Partnerize programs are often invite-only) | | | | | Unverified |

### Creator software

| Program | Commission | Cookie | Payout | Entry rules | Fit | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| **Descript** | **US$25 flat** per new subscriber (no renewals) | Not stated | PayPal monthly; moving to PartnerStack | Describe platform and audience; approval ~1 week; no sales minimum | Clipping and editing service pages, audio-to-text tool pages | Verified |
| **Riverside** | Up to **20%**, recurring while the customer stays subscribed (support page); "up to $85+ per sale" | Not stated | Monthly; ~60 days after the referral (Impact or PartnerStack, pages conflict) | No requirements; new users only | Podcast clients (clipping retainers) | Partly verified |
| **StreamYard** | **25% recurring** for as long as the customer stays subscribed | Not found | Not found | Aimed at creators and educators | Streaming setup service | Partly verified (support page via search; direct fetch blocked) |
| **Epidemic Sound** | Referrer level: **credits only**. Ambassador level (after **12 paying referrals**): **50%** of the first 12 months, plus a free subscription. | Not stated | Bank; monthly once over ~US$90 | Must be an independent contractor or registered company (an ABN fits) | Editing services, video guides | Verified (official page); payout from ambassador terms via search |
| **Streamlabs** (Ultra) | **US$10** per monthly sub, **US$20** per annual | Not stated | Impact; paid 45 days after the sale locks | Promote only in your own content. No coupon sites, Reddit or pay-per-click. | Streaming setup service and guides | Verified |
| **vidIQ** | 15% (0–10 sales), 20% (11–50), 25% (51+); recurring per support articles | Not stated | PayPal only, min US$10 | None listed | YouTube growth content | Partly verified |
| **Canva** | **Closed.** The Canvassador program is "currently closed for applications" and is now the only route to affiliate benefits. | | | | | Verified |
| **TubeBuddy** | **Not accepting new affiliates** (15%, 1-year window for existing ones) | | | | | Verified |
| **CapCut** | Up to 35% recurring via Impact (min US$10) | Not stated | | **Only pays on subscribers in the US, UK, Germany and France**, so an Australian audience earns little | Low fit | Verified |

### Account security

| Program | Commission | Cookie | Payout | Entry rules | Fit | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| **Proton** (Pass, Mail, VPN, Drive) | **30%** of new subscriptions (some 1-month offers 100%, some 1–2-year offers 40%); **30% on renewals** | Not stated | Bank transfer on the 30th of the next month, **min $100** (rolls over) | No website or audience minimum; must disclose; pay-per-click allowed but no bidding on Proton brand names. A separate Influencer Program exists (no rates listed). | Creator Security Pack: password manager, email aliases, VPN | Verified |
| **NordPass** | **30%** new personal plans, **10%** renewals, 25% new business plans | **30 days** | Run through the NordVPN affiliate platform; minimum not stated | **No website needed; YouTube or social accounts are fine** | Alternative password-manager pick | Verified |
| **Bitdefender** (incl. **Security for Creators**) | 20% revenue share on new customers (consumer); 50% on business products | Not stated | Impact; autopay from a $10 threshold | "We accept international traffic" | Pack's account-monitoring section; Security for Creators covers YouTube, Instagram and Facebook accounts | Verified (rate per product not stated) |
| **1Password** | **No public consumer affiliate sign-up found.** Every /affiliate URL now redirects to the channel and MSP Partner Program (checked today). Older terms (US$2 per signup + 25% of the first payment, via CJ) appear only on third-party pages. | | | | Still worth recommending on merit, without a link | Verified (redirect observed) |
| **Bitwarden** | **No program.** Bitwarden says it has no monetary referral program. | | | | Recommend as the free option; good for trust | Partly verified |
| **Yubico (YubiKey)** | **No direct program.** The old affiliate page now redirects to the press page. Use **Amazon AU** (YubiKeys listed; Computers 2%). | | | | Pack (via an acTS web page, not the PDF) | Verified (redirect observed) |
| **Identity protection in Australia** | **Equifax "Identity Protection powered by Norton"** and Norton's own identity offers are sold in Australia. No public affiliate program found for Equifax. A Norton AU program appears on FlexOffers (32%, 60 days) but other Norton listings are marked closed. **Aura** pays US$65 per sign-up, but it's a US service. **IDCARE** (free, not-for-profit) has no program. | | | | Pack: point to IDCARE (free) and only add Norton if the program checks out | Unverified |

### The 5 to join first

1. **Amazon Associates AU.** It covers almost every piece of gear in the setup guides (cameras, mics and lighting at 5%) plus YubiKeys. Join once the site and the web version of a setup guide are live, because the 3-sales-in-180-days clock starts at sign-up. Links go on web pages and in video descriptions only.
2. **RØDE.** 15% with a 14-day cookie is the best gear rate found, from a Sydney brand creators already trust. It fits the audio section of every setup guide. It only needs a social channel link.
3. **Proton.** 30% that keeps paying on renewals, with no audience minimum. It's a credible privacy brand that fits the Creator Security Pack (password manager plus email aliases, which hide a creator's real address). Downside: payouts wait for $100.
4. **Bitdefender (Security for Creators).** The only product found that is built for creator account security, with a 20% share via Impact and a $10 payout threshold. Fits the pack and the security tool pages. Ask the affiliate manager which rate applies to Security for Creators and the cookie length.
5. **Descript.** A flat US$25 per new subscriber, no sales minimum, paid monthly by PayPal. Fits the clipping and editing service pages and the transcription tools. Alternative: **Riverside** if podcast clients become the main market (recurring, but less certain terms).

Next wave: StreamYard (25% recurring), Streamlabs (US$10/20), PCCaseGear and Scorptec (for the budget-PC guide), NordPass (if Proton doesn't suit), Epidemic Sound (credits until 12 referrals).

Trust rule for the pack: recommend on merit first. Name Bitwarden (free, no commission) alongside any paid pick, and say plainly which links earn acTS money.

---

## Part B: what Australians pay (stream 1)

Currency: AUD unless marked. USD figures are converted at about **A$1.55 per US$1**, the rate implied by an Aug 2026 Sydney pricing guide (USD 1,500–2,500 shown as AUD 2,300–4,000). Check the day's rate.

### Clipping retainers (podcast or long video cut into shorts)

| | Price | Evidence | Confidence |
| --- | --- | --- | --- |
| **Low** | A$14–37 starting packages on Fiverr (usually 1–3 clips); self-serve services about A$150–300 a month for 10 clips | **Fiverr search "podcast clips shorts", 23 Oct 2026, 42 gigs shown in AUD: min A$14, quarter A$22, median A$29, three-quarter A$53, max A$243.** Popular sellers: A$22 (254 reviews), A$37 (427 reviews), A$77 Top Rated (71 reviews). Editvideo.io US$195/mo for 10 short clips; Splasheo US$99/mo for 10 credits. | Fiverr: verified (observed). Monthly services: unverified (blogs) |
| **Typical** | **A$450–900 a month** for 12–20 clips (about A$25–90 per clip) | Clipping-agency guide: starter retainers US$300–600/mo for 12–20 clips, growth US$600–1,200, full service US$1,500+. Per clip US$15–60. Podcast guide: freelancer clips US$15–50 per clip. | Unverified (vendor guides, USD) |
| **High** | A$1,650–4,000+ a month | **Pixel3 (Melbourne): A$1,650/mo ex GST for up to 3 edited videos**, up to A$4,950 for 9. Remote agencies serving Sydney: A$2,300–4,000/mo; local Sydney partner A$4,000–8,000/mo. Mark Studios US$750/mo starter (1 long edit + 4 shorts). | Partly verified (provider pages via search; Increditors Aug 2026) |

### Editing per video

| | Short-form clip (reel/short) | Long-form YouTube (about 10 min) | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| **Low** | A$15–40 | A$100–200 | Fiverr clip gigs (above); Airtasker Sydney examples: A$150 for a 3-hour CapCut Reels session, A$150 for a DaVinci induction video | Partly verified |
| **Typical** | A$50–150 | A$300–600 | Airtasker Sydney video-editing median **A$382** (range A$25–487); Upwork Australian editors US$30–60/hr intermediate (Sydney profiles A$40–85/hr); Seek/Mandy-based rates: junior A$22–38/hr, mid A$38–65/hr, senior A$65–110/hr; a 10-min edit takes about 10–20 hours | Partly verified (Airtasker verified; others via search) |
| **High** | A$200–300+ | A$800–1,500+ | Sydney freelancers A$60–90/hr junior, A$90–150/hr experienced (Increditors, Aug 2026); Upwork YouTube production US$500–1,500 per project; Airtasker A$1,000 for gym-review YouTube edits | Partly verified |

### Streaming and PC setup help

| | Remote (screen share) | In person, Sydney | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| **Low** | A$8–50 (offshore Fiverr OBS gigs from US$5–30) | A$60–100 (Airtasker: A$60 OBS setup on a MacBook, Inner West; A$70–100 PC build finishes) | Fiverr listings via search; Airtasker task pages | Partly verified |
| **Typical** | A$95–110 (Fiverr's own estimate: OBS setup "typically" US$60–70) | **A$150–300**: Airtasker Sydney PC assembly tasks A$70–170 (NSW median ~A$149); A$200 for a 2-hour RØDECaster Pro II setup (CBD); A$250 podcast studio setup with tutorial (Fairlight); A$300 DSLR webcam and audio streaming rig (Bondi); Geeks2U A$119–198 per hour | Partly verified (Airtasker pages via search; Geeks2U pricing page via search) |
| **High** | About A$230 (Top Rated Fiverr gig from US$150, 231 reviews) | A$500+ (Airtasker A$550 4-camera podcast set-up; Northern Beaches audio-visual median A$385, range to A$1,371) | Same | Partly verified |

Retail build fees for comparison: PB Tech AU assembly A$80.58 inc GST (PCs worth A$1,500–2,500, hardware only). PCCaseGear's assembly service listing is marked discontinued. CAA Computers (Sydney) sells a ready-made Creator Entry streaming PC at A$2,499. (Partly verified.)

### Starter prices for acTS (new, no portfolio)

Aim: clearly cheaper than Australian agencies, dearer than offshore Fiverr, and sold on being local, same time zone, and done properly. Jess isn't registered for GST, so quote "no GST" prices (agencies often quote ex GST).

| Service | Starter price | Why |
| --- | --- | --- |
| Clipping retainer, Starter | **A$400/month**: 12 clips from up to 4 episodes, captions, 3 platform formats | Bottom of the typical A$450–900 band; about A$33 a clip |
| Clipping retainer, Weekly | **A$750/month**: 24 clips | Middle of the typical band |
| Trial pack (portfolio builder) | **A$99 for 5 clips** from one episode, credited if they sign on for a month | Gets the first samples and testimonials |
| Single short edit | **A$45** each | Above Fiverr's A$22–37, well below local agencies |
| Long-form edit (up to 15 min: cuts, captions, basic b-roll and music) | **A$220** per video (hourly fallback A$45/hr) | Low end of the typical A$300–600 band while there's no portfolio |
| Remote stream/OBS setup (up to 90 min, screen share, written settings sheet) | **A$99**; **A$179** with overlays, alerts and audio filters | Matches Fiverr's typical rate, with local support added |
| In-person Sydney setup (2 hours on site) | **A$199**, then A$80 per extra hour | Beside Airtasker's A$200–300 tasks and under Geeks2U's A$119–198 per hour |
| Streaming PC build (client supplies parts) | **A$149**; **A$249** with Windows, drivers, OBS and a test stream | Sits on the Airtasker NSW median (~A$149) |
| Creator security setup session (2FA, password manager, recovery codes, doxxing self-audit) | **A$149** remote, 90 min; includes the Security Pack | No direct market price found. Anchored to Geeks2U's A$119–198 per hour. Upsell from the A$29 pack. |

Raise prices 15–25% after 3 paid clients with testimonials, or once the calendar is full.

Notes:
- Upwork returned 403 to the fetcher and Fiverr put up a human check after the first search, so most Upwork and Fiverr figures come from search extracts. I did not try to get past either check.
- If Jess sells on Airtasker or Fiverr, the platform takes a cut (not checked today). Selling direct keeps the full price.

---

## Changes to the plan

1. **"1Password affiliate terms (official): https://1password.com/affiliate"**: that link now redirects to the channel and MSP Partner Program. There's no public consumer affiliate sign-up. Replace with Proton, NordPass or Bitdefender.
2. **"Amazon Associates Australia rates: no reliable current table found"**: the official Standard Commission Income Schedule is public. Cameras, electronics and musical instruments pay 5%, computers and PC parts 2%, home and kitchen 10%.
3. **"Place the links in the guides, the pack and the site"**: Amazon AU bans its links in ebooks and documents. Amazon links go on web pages and in video descriptions only. Make the budget setup guides web pages (PDF optional) so the links can live there.
4. **Disclosure rule 4**: keep it, but use "Ad" or "I earn a commission" wording. "Affiliate" alone may not satisfy the AANA code.
5. **Store fees source (third-party)**: now checked on official pages. Lemon Squeezy is being folded into Stripe Managed Payments, so don't start there. Use Payhip.
6. **Stream 1 income (a few hundred to ~$2,000 a month for 1–3 clients)**: consistent with the market. Starter retainers at A$400–750 mean 1–3 clients is about A$400–2,250 a month.

## Needs Jess

- **Store:** sign up for Payhip (Free plan) and connect Stripe. Approve the pack price (A$29, optional A$24 launch).
- **Affiliates, after the site is live:** Amazon Associates AU, RØDE (needs a social link), Proton, Bitdefender (Impact), Descript (PartnerStack). Agents can't sign up.
- **Decision:** approve the starter service prices above, or adjust.

---

## Sources (checked 23 Oct 2026)

### Part C: stores and tax
- Stripe AU pricing: https://stripe.com/au/pricing
- Stripe Managed Payments, how it works: https://docs.stripe.com/payments/managed-payments/how-it-works
- Stripe Managed Payments eligibility (AU listed; digital products only): https://docs.stripe.com/payments/managed-payments/eligibility
- Stripe Managed Payments tax compliance: https://docs.stripe.com/payments/managed-payments/tax-compliance
- Stripe changelog, Managed Payments on Payment Links (22 Apr 2026): https://docs.stripe.com/changelog/dahlia/2026-04-22/managed-payments
- Lemon Squeezy pricing: https://www.lemonsqueezy.com/pricing
- Lemon Squeezy fees: https://docs.lemonsqueezy.com/help/getting-started/fees
- Lemon Squeezy 2026 update (Jan 2026): https://www.lemonsqueezy.com/blog/2026-update
- Gumroad pricing: https://gumroad.com/pricing
- Gumroad getting paid (help centre, older): https://help.gumroad.com/article/13-getting-paid
- Gumroad fees (third-party, processing dispute): https://dodopayments.com/blogs/gumroad-fees-explained, https://checkoutpage.com/blog/gumroad-fees
- Payhip pricing: https://payhip.com/pricing
- Payhip resource hub (tax scope): https://payhip.com/hub/what-is-payhip/
- ATO registering for GST: https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst
- EU VAT One Stop Shop: https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en, https://europa.eu/youreurope/business/finance-and-tax/vat/one-stop-shop/index_en.htm

### Part C: comparable products
- Payhip, Password Security Checklist: https://payhip.com/b/CkHnX
- Gumroad, Ultimate Privacy Policy Checklist: https://doculockprivacy.gumroad.com/l/privacy-checklist
- Gumroad, Influencers Cybersecurity101: https://cybereducation.gumroad.com/l/InfluencersGuideforContentCreators
- Gumroad Discover searches (doxxing, privacy, opsec, cybersecurity, digital privacy, online safety): https://gumroad.com/discover?query=doxxing
- Extreme Privacy (IntelTechniques): https://inteltechniques.com/book7
- Bitdefender Security for Creators: https://www.bitdefender.com/en-us/consumer/security-for-creators
- DeleteMe / Optery prices (third-party): https://www.security.org/data-removal/deleteme/, https://www.optery.com/optery-vs-deleteme/
- GalaxyWarden (no prices): https://www.galaxywarden.com/streamer-security
- Udemy OPSEC for Beginners: https://www.udemy.com/course/dont-get-hacked-the-practical-online-security-course/
- YouTube hacked-channel recovery tool (news): https://ppc.land/youtube-launches-new-recovery-tool-for-hacked-creator-accounts/

### Part A: affiliate programs
- Amazon AU commission schedule: https://affiliate-program.amazon.com.au/help/node/topic/GRXPHT8U84RAYDXZ
- Amazon AU program policies: https://affiliate-program.amazon.com.au/help/operating/policies
- Amazon AU operating agreement: https://affiliate-program.amazon.com.au/help/operating/agreement
- Amazon AU agreement changes (14 May 2026): https://affiliate-program.amazon.com.au/help/operating/compare
- Amazon AU payment thresholds: https://affiliate-program.amazon.com.au/help/node/topic/GP8Z3AZ27ZFHTEUL
- Amazon AU cart window: https://affiliate-program.amazon.com.au/help/node/topic/G9SMD8TQHFJ7728F
- YubiKey on Amazon AU: https://www.amazon.com.au/Yubico-YubiKey-USB-Authentication-Security/dp/B07HBD71HL
- RØDE affiliate: https://help.rode.com/hc/en-us/articles/14241968264079, https://af.uppromote.com/rodeaffiliateprogram/register
- Logitech affiliate: https://www.logitech.com/en-us/programs/affiliate-program
- Elgato partnerships: https://www.elgato.com/us/en/s/partnerships
- Corsair Creator Program: https://www.corsair.com/us/en/s/creator-program
- PCCaseGear on Awin: https://ui.awin.com/merchant-profile/33135
- Scorptec on FlexOffers: https://www.flexoffers.com/affiliate-programs/scorptec-affiliate-program
- Mwave on Commission Factory: https://www.commissionfactory.com/advertiser-directory/mwave-affiliate-program/60407
- Commission Factory payments: https://help.commissionfactory.com/affiliate-payment-process
- JB Hi-Fi (Partnerize, third-party): https://www.affilitizer.com/programs/jbhifi.com.au
- Descript: https://www.descript.com/affiliate, https://www.descript.com/affiliate-terms
- Riverside: https://riverside.com/affiliate-program, https://support.riverside.com/hc/en-us/articles/5446133751453-Affiliate-program-Overview
- StreamYard: https://support.streamyard.com/hc/en-us/articles/360043298772-Is-there-a-Referral-or-Affiliate-program
- Epidemic Sound: https://www.epidemicsound.com/community-program/, https://www.epidemicsound.com/policy/v2/ambassador-terms-and-conditions/
- Streamlabs: https://streamlabs.com/affiliates
- vidIQ: https://vidiq.com/affiliate/, https://support.vidiq.com/en/articles/7866006-vidiq-affiliate-commission-everything-you-need-to-know
- Canva: https://www.canva.com/en_au/help/canva-affiliate-marketing-program/
- TubeBuddy: https://www.tubebuddy.com/affiliateprogram
- CapCut: https://www.capcut.com/partners/affiliate-program
- Proton: https://proton.me/partners/affiliates
- NordPass: https://nordpass.com/affiliate/
- Bitdefender: https://www.bitdefender.com/en-us/partners/affiliate-partners/
- 1Password (redirects to partners): https://1password.com/affiliate
- Bitwarden (no referral program): https://bitwarden.com/blog/defining-and-sustaining-value-for-bitwarden-users/
- Yubico (old program retired; page redirects): https://yubico.com/blog/ready-set-earn-yubico-affiliate-amazon
- Equifax and Norton (AU): https://www.equifax.com.au/knowledge-hub/node/288
- Norton AU on FlexOffers (third-party): https://www.flexoffers.com/affiliate-programs/norton-by-symantec-au-affiliate-program/
- ACCC influencer sweep findings: https://www.accc.gov.au/system/files/social-media-influencer-testimonials.pdf
- ACCC media release: https://www.accc.gov.au/media-release/scrutiny-of-influencers-and-businesses-for-misleading-advertising-and-online-reviews-continues
- AANA submission (disclosure labels): https://www.accc.gov.au/system/files/Australian%20Association%20of%20National%20Advertisers%20(AANA).pdf

### Part B: prices
- Fiverr podcast clips search (observed 23 Oct 2026, AUD): https://www.fiverr.com/search/gigs?query=podcast%20clips%20shorts
- Fiverr OBS setup: https://www.fiverr.com/gigs/obs-studio-setup, https://www.fiverr.com/categories/programming-tech/buy/development-for-streamers/setup-installation/obs-studio
- Airtasker Sydney video editing: https://www.airtasker.com/au/services/video-editing/sydney/
- Airtasker Sydney PC assembly: https://www.airtasker.com/au/services/pc-assembly/sydney/, https://www.airtasker.com/au/services/pc-assembly/nsw/
- Airtasker audio-visual (Sydney): https://www.airtasker.com/audio-visual/sydney-eastern-suburbs/, https://www.airtasker.com/audio-visual/sydney-northern-beaches/
- Upwork Australian video editors: https://www.upwork.com/hire/video-editors/au/, https://www.upwork.com/hire/video-editors/au/sydney-nsw/
- Increditors, Sydney video editing guide (Aug 2026): https://increditors.com/video-editing-services-sydney/
- Solohourly, Australian editor rates: https://solohourly.com/rates/video-editor-rates-in-australia
- Pixel3 video subscription (Melbourne): https://pixel3.com.au/video-subscription-service/
- ShortVids Sydney: https://shortvids.co/video-production-in-sydney/
- Clipping-agency pricing guides (USD): https://www.clipspeed.ai/use-cases/clipping-agency.html, https://videoeditingcompany.com/podcast-clips-pricing/, https://onreplay.com.au/blog/best-podcast-editing-services/
- Mark Studios: https://www.markstudios.com/best/short-form-video-editing-services
- Geeks2U pricing: https://geeks2u.com.au/pricing
- PB Tech AU assembly: https://www.pbtech.com/au/product/ASSEMB0003
- PCCaseGear assembly (discontinued): https://www.pccasegear.com/products/22396/pccg-custom-system-assembly-service
- CAA Computers streaming PC: https://caacomputers.com.au/streaming-pc-australia/
