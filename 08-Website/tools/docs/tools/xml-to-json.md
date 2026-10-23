# XML to JSON

Turn repeated XML records into a JSON list.

- Opens at: `/xml-to-json`
- Code: `public/assets/js/tools/files/convert.js` with preset `{ from: 'xml', to: 'json' }` (see [Data converter](data-converter.md))
- Runs on: your device (nothing uploaded)
- Libraries: SheetJS Community Edition 0.20.3 (Apache-2.0); the XML is read with the browser's own `DOMParser`

## How to use
1. Add one or more XML files.
2. Select **Convert to JSON** and download.

## Options
None. The input and output formats are fixed.

## How it works
`xmlRows()` finds the biggest group of same-named sibling elements (like every `<item>` in `<items>`) and makes each one a record. Attributes and child elements become fields, nested ones as `price.cur`. Repeated children inside one record are joined with commas. Number-like text becomes a number, unless it has a leading zero or more than 15 digits.

## Limits
- The result is a flat list, not the same shape as the XML.
- Only the biggest repeated group is converted. Anything outside it is left out.
- Text that sits beside child elements is dropped, and namespace prefixes are dropped.

## How to test
`mod.default.process([xml], {}, { preset: { from: 'xml', to: 'json' } })` with `<shop><name>Gear</name><items><item id="1"><title>Mic</title><price cur="AUD">99.5</price></item><item id="2"><title>Cam</title></item></items></shop>`: 2 records, the first with `id: 1`, `title: "Mic"`, `price: 99.5` and `"price.cur": "AUD"`. Broken XML throws "This file isn't valid XML...".
