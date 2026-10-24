# Predict

A text-prediction web app for one person who has motor, spelling and vision difficulties and uses a touchscreen phone. It suggests words as they type, fixes likely typos, learns the words and phrases they use, and speaks the finished message aloud. Everything it learns stays on the phone, and it works offline once installed. It is plain HTML and ES modules, with no build step.

## Running it locally

```
python dev_server.py
```

Then open `http://127.0.0.1:8790/` for the app and `http://127.0.0.1:8790/tests/` for the tests. The tests page shows a pass or fail line for every test.

On 127.0.0.1 the service worker is switched off, so reloads always pick up your edits. To try offline mode locally, open `http://127.0.0.1:8790/?sw=1`, reload once, then stop the server and reload again. To clear it afterwards, unregister the worker in your browser's developer tools (Application, Service Workers) or clear the site data.

## Putting it online (Jess's one-time step)

1. In the Cloudflare dashboard, go to Workers & Pages, then Create, then Pages, then Connect to Git.
2. Choose the repository `jdelsrv-hub/ACTS-Design`.
3. Set the production branch to `main`, the framework preset to None, the build command to empty, and the build output directory to `08-Website/predict`.
4. Save and deploy. Open the `*.pages.dev` address on the phone and use "Add to Home Screen" (iPhone: Share, then Add to Home Screen; Android: the browser menu, then Install app).

`dev_server.py`, `tests/` and `docs/` get published too, which is harmless. If a header rule is needed later, add a Cloudflare Pages `_headers` file.

## Releasing an update

1. Bump `CACHE` in `sw.js` (for example `predict-v1` to `predict-v2`). Without this, phones keep the old files.
2. If you add or remove a shipped file, update the `SHELL` list in `sw.js` too.
3. Commit and push.

The phone picks up the new version the next time the app is opened with a connection, and uses it from the open after that.

## Device checklist

Try these on a real phone before handing it over.

- [ ] Mid-range Android phone: the app opens, looks right and works.
- [ ] iPhone: the app opens, looks right and works.
- [ ] Suggestions appear instantly as you type, with no lag on either phone.
- [ ] Install it to the home screen, then switch on airplane mode and open it. It loads and suggests words.
- [ ] Real touch taps on suggestions, actions and quick phrases keep the phone keyboard open.
- [ ] The phone keyboard's composing text isn't duplicated when a suggestion is chosen.
- [ ] Focus returns to the text box after the long-press menu closes.
- [ ] Speak, Hear it, and "Say each word when I pick it" all actually speak, in the chosen voice and speed.
- [ ] At Huge text size and with the Hyperlegible font, the text underline lines up with the words, including on wrapped lines.
- [ ] Buttons stay at least 48 px tall when the actions row wraps at Huge text size.
- [ ] Backup downloads a file, and Restore works from that file.
- [ ] VoiceOver (iPhone) reads every control sensibly and can use the whole app.
- [ ] TalkBack (Android) reads every control sensibly and can use the whole app.
- [ ] A few days' trial with the person who will use it. Note which words they wanted that it didn't suggest, any taps that misfired, and anything that tires them.
