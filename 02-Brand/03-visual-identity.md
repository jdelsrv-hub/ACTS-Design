# 03 · Visual Identity

## Look and feel

Dark studio backgrounds, rich purples and a bright signal green. Clean, modern, creator-tech: closer to a streaming dashboard than a corporate brochure. Bold where it counts (headlines, the logo, one hero colour per layout), calm everywhere else (lots of space, simple shapes, clear type).

## Logo: the acTS wordmark

The logo is the wordmark **acTS**, set in Space Grotesk.

- **"ac"** is lowercase, Medium (500) weight. It stands for the friendly, creative side.
- **"TS"** is uppercase, Bold (700) weight. It stands for the tech that holds it up.
- Letter spacing: tight (−2%).
- Colour on dark backgrounds: "ac" in **Lilac #CBBDF7**, "TS" in **Signal Green #2FD47F**.
- Colour on light backgrounds: "ac" in **Studio Purple #6C3FE0**, "TS" in **Ink #1D1A2B**.
- One-colour version: all **White #FFFFFF** on dark, or all **Ink #1D1A2B** on light.
- Lockup with full name: the wordmark, with "All Creative Technology Solutions" underneath in Inter Medium at 25% of the wordmark height, in Slate or Lilac.

**Clear space:** leave space around the logo at least the height of the letter "a" on every side.
**Minimum size:** 24 px tall on screen, 8 mm in print.

**Don't:** stretch or squash it, add shadows, glows or outlines, put it on busy photos without a dark overlay, change the case (never "ACTS"), use colours outside the palette, or rotate it.

This is a placeholder logo until a designed one is made. Final logo files go in `Assets/Logos/`.

## Colour palette

| Name | Hex | RGB | Role |
| --- | --- | --- | --- |
| **Night** | `#16112A` | 22, 17, 42 | Main dark background. The "studio" colour. |
| **Studio Purple** | `#6C3FE0` | 108, 63, 224 | Primary brand colour: buttons, headings on light, highlights. |
| **Signal Green** | `#2FD47F` | 47, 212, 127 | Accent: calls to action, the "TS", success states, live indicators. |
| **Lilac** | `#CBBDF7` | 203, 189, 247 | Soft purple: text on dark, the "ac", tags, backgrounds of cards on light. |
| **Mint** | `#DCF7E9` | 220, 247, 233 | Soft green: success panels and tip boxes on light layouts. |
| **Deep Green** | `#0F7A4A` | 15, 122, 74 | Green text or links on light backgrounds (Signal Green is too light for text on white). |
| **Ink** | `#1D1A2B` | 29, 26, 43 | Body text on light backgrounds. |
| **Slate** | `#5F5B73` | 95, 91, 115 | Secondary text, captions, fine print. |
| **Paper** | `#F8F7FC` | 248, 247, 252 | Light background for documents, guides and invoices. |
| **White** | `#FFFFFF` | 255, 255, 255 | Text on dark and purple backgrounds. |
| **Caution Amber** | `#FFC857` | 255, 200, 87 | Status: needs a look, reversible warnings (on dark). |
| **Alert Red** | `#FF6B70` | 255, 107, 112 | Status: errors, at risk, can't be undone (on dark). |
| **Deep Amber** | `#8A5300` | 138, 83, 0 | Caution text and icons on light backgrounds. |
| **Deep Red** | `#B42335` | 180, 35, 53 | Error text, icons and delete buttons on light backgrounds. |
| **Butter** | `#FFF3D1` | 255, 243, 209 | Soft amber: caution panels on light layouts. |
| **Blush** | `#FDE7E8` | 253, 231, 232 | Soft red: error panels on light layouts. |

### Colour balance

- **Dark layouts (social, website hero, thumbnails):** about 60% Night, 25% Studio Purple and Lilac, 10% Signal Green, 5% White text.
- **Light layouts (guides, invoices, documents):** about 70% Paper or White, 20% Ink text, 10% Studio Purple, with Deep Green or Mint for tips.
- Use Signal Green sparingly. As a solid fill it should draw the eye to one thing per layout (a button, a price, a "live" badge). Small green status marks (a tick, a "Done" chip, a "Connected" icon) don't count towards that one thing. See Status colours below.
- Caution Amber and Alert Red are for states only, never decoration. Keep them to small marks and panels, well under 5% of a layout.

### Status colours

For apps, dashboards, forms and guides, so creators can see at a glance what's fine, what needs a look and what can't be undone. Always pair a status colour with an icon and a word ("Done", "Some gaps", "At risk"), so it never relies on colour alone and still works for colour-blind creators.

| Status | On dark (text, icons, marks) | On light (text, icons) | Soft panel on light | Use for |
| --- | --- | --- | --- | --- |
| Safe | Signal Green `#2FD47F` | Deep Green `#0F7A4A` | Mint `#DCF7E9` | Done, connected, protected, numbers going up |
| Caution | Caution Amber `#FFC857` | Deep Amber `#8A5300` | Butter `#FFF3D1` | Needs a look and can be undone: not connected, a setting is off, "some gaps" |
| Danger | Alert Red `#FF6B70` | Deep Red `#B42335` | Blush `#FDE7E8` | Errors, at risk, numbers going down, actions that can't be undone |

- **Panels on dark:** a 14% tint of the status colour over Night or a card, with White text and a status-coloured icon. White text stays at 12:1 or better.
- **Panels on light:** the soft panel colour with Ink text and a Deep Green, Deep Amber or Deep Red icon.
- **Buttons:** only actions that can't be undone (like deleting an account) get a solid red button: Alert Red with Night text on dark, Deep Red with White text on light. Always put a confirm step first. Actions that can be undone, like disconnecting a platform, use a red outline button.
- **Tone:** status colours don't replace kind words. Write the message calmly ("No stress, this is fixable"), and show at most one caution or danger message per section where you can.

### Accessible pairings (checked to WCAG AA, 4.5:1 or better)

| Text | Background | Contrast |
| --- | --- | --- |
| White | Night | 18.3:1 |
| Lilac | Night | 10.6:1 |
| Signal Green | Night | 9.5:1 |
| Night or Ink | Signal Green (e.g. a green button) | 9.5:1 / 8.8:1 |
| White | Studio Purple (e.g. a purple button) | 6.1:1 |
| Ink | Paper | 16.0:1 |
| Slate | Paper | 6.1:1 |
| Studio Purple | Paper | 5.8:1 |
| Deep Green | Paper | 5.1:1 |
| Ink | Mint or Lilac | 15.0:1 / 9.9:1 |
| Caution Amber | Night | 11.9:1 |
| Alert Red | Night | 6.6:1 |
| Night | Alert Red (e.g. a delete button on dark) | 6.6:1 |
| White | Deep Red (e.g. a delete button on light) | 6.5:1 |
| Deep Amber | Paper or Butter | 5.9:1 / 5.7:1 |
| Deep Red | Paper or Blush | 6.1:1 / 5.5:1 |
| Ink | Butter or Blush | 15.4:1 / 14.4:1 |

**Never:** Signal Green, Caution Amber or Alert Red text on white or Paper (use Deep Green, Deep Amber or Deep Red), Lilac text on white, Studio Purple text on Night, or Alert Red or Caution Amber on Studio Purple. They're too hard to read.

## Typography

All free from Google Fonts.

| Use | Font | Weight | Notes |
| --- | --- | --- | --- |
| Logo, headings | **Space Grotesk** | 500 to 700 | Modern, techy, a little bold. Sentence case for headings. |
| Body text, UI | **Inter** | 400 body, 600 emphasis | Clean and easy to read at any size. |
| Tech details | **JetBrains Mono** | 400 | Settings, specs, code, keyboard shortcuts. Use sparingly. |

**Fallbacks:** Arial for headings and body, Consolas for mono (for Word, email and anywhere web fonts aren't available).

**Type scale (web and slides):** H1 48 px · H2 32 px · H3 24 px · body 16 to 18 px · captions 13 px. Line height 1.5 for body, 1.15 for headings.

**Rules:** sentence case for headings (not Title Case Everywhere), no all-caps paragraphs, left-aligned text (not justified), one font weight change per line at most.

## Shapes and layout

- Rounded corners: 12 px on cards and buttons, 999 px (pill) on tags and badges.
- Generous spacing: content never touches the edge; 24 px minimum padding on cards.
- Simple line icons (2 px stroke, rounded ends), for example Lucide or Phosphor icons.
- A subtle purple-to-night gradient (`#6C3FE0` → `#16112A`) is allowed for hero backgrounds. No rainbow or neon gradients.
- A small green "live dot" (Signal Green circle) is a brand accent for anything live, new or active.

## Imagery

- **Do:** real creator setups, desks with soft RGB lighting, close-ups of mics, cameras and stream decks, screens showing editing timelines, diverse creators of all ages and backgrounds.
- **Lighting:** moody and dark, with purple and green accent light where possible.
- **Don't:** stock photos of people in suits, pointing at laptops, or giving thumbs-up; overly glossy, white-on-white product shots (too Apple); cluttered or messy setups.
- **Video thumbnails and clips:** Night or dark photo background, a bold Space Grotesk headline of 3 to 5 words, one Signal Green highlight word, and the acTS wordmark in a corner.

## Brand files

- Logo files: `Assets/Logos/` (SVG and PNG when designed)
- Photos and graphics: `Assets/Images/`
- Templates (Canva, slides): `02-Brand/templates/` when made
