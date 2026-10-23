# Unlock PDF

Remove the password from a PDF when you know it.

- Opens at: `/unlock-pdf`
- Code: `public/assets/js/tools/pdf/unlock.js`
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT), which adds password loading to pdf-lib

## How to use
1. Add a PDF.
2. Type the password you use to open it. If it opens without one but won't let you print or copy, leave the box empty.
3. Select **Unlock PDF** and download.

## Options
- Password: empty by default.

## How it works
pdf-lib opens the file with the password and decrypts everything. The encryption settings and the old cross-reference table that pointed to them stay behind as objects, so we delete them and clear the `/Encrypt` entry before saving. The new file has no trace of the password and no print or copy limits. It's named with `-unlocked` added.

## Limits
- You need the password. We can't guess or break it.
- A PDF without a password gives "This file doesn't have a password, so there's nothing to remove."
- One PDF at a time.

## How to test
Protect a PDF with `protectPdf(bytes, 'abc')` from `protect.js`, then call the named export `unlockPdf(locked, 'abc')`. The output contains no `/Encrypt` text, and `openPdfjs(output)` opens it without a password. A wrong password rejects with "That password didn't work…". A file encrypted with only an owner password (`encrypt({ userPassword: '', ownerPassword: 'x' })`) unlocks with `''`. Through the hook: `mod.default.process([lockedPdf], { password: 'abc' })`.
