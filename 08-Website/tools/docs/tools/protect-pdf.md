# Protect PDF

Add a password so only people who know it can open your PDF.

- Opens at: `/protect-pdf`
- Code: `public/assets/js/tools/pdf/protect.js`
- Runs on: your device (nothing uploaded)
- Libraries: pdf-lib (Cantoo fork) 2.11.1 (MIT), which adds encryption to pdf-lib

## How to use
1. Add a PDF.
2. Type a password, then type it again.
3. Select **Protect PDF** and download.
4. Keep the password somewhere safe.

## Options
- Password: the password needed to open the file.
- Type it again: has to match.

## How it works
Cantoo's pdf-lib fork encrypts the file with AES-256 (PDF security revision 6). The same password is set as the open password and the owner password, and printing, copying and editing are all allowed. So anyone with the password has full access. The file is named with `-protected` added.

## Limits
- We can't recover a forgotten password. Nothing is uploaded, so we never see it.
- There are no separate limits on printing or copying.
- Very old PDF readers (from before about 2010) can't open AES-256 files.
- PDF/A archive files can't take a password, and we say so.
- A PDF that already has a password must be unlocked first.

## How to test
`mod.default.process([pdf], { password: 'secret1', confirm: 'secret1' })` gives `…-protected.pdf`. Its `/Encrypt` dictionary has `/V 5`, `/R 6` and `/CFM /AESV3`. `openPdfjs(bytes)` throws a `PasswordException`, and `openPdfjs(bytes, { password: 'secret1' })` opens it. The core step is a named export: `protectPdf(bytes, password)` returns the encrypted bytes.
