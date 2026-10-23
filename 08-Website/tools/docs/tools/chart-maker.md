# Chart maker

Turn typed or pasted numbers into a bar, line or pie chart PNG.

- Opens at: `/chart-maker`
- Code: `public/assets/js/tools/image/chart.js` (custom tool, library in `image/_vendor.js`)
- Runs on: your device (nothing uploaded)
- Libraries: Chart.js 4.5.0 (MIT)

## How to use
1. Pick **Bar**, **Line** or **Pie** and type a title (or leave it blank).
2. Type or paste your data, one row per line. It starts with an example you can replace.
3. Check the preview, then select **Download PNG**.

## Options
- Chart type: Bar (default), Line or Pie.
- Title: optional.
- Your data: a label, then one or more numbers, split by commas or tabs. Pasting from a spreadsheet works. If the first row has no numbers, it names each series (the legend).

## How it works
The data is parsed into labels and series, then drawn with Chart.js at 1600 × 900 px on a white background in the acTS colours. The preview is the same canvas you download. Symbols like $ and % are ignored in numbers, and commas inside tab-separated numbers are fine.

## Limits
- Pie charts use the first series only.
- No axis titles, stacked bars or custom colours.
- In comma-separated data, write numbers without thousands commas (1200, not 1,200), or paste tab-separated data instead.

## How to test
Named exports: `parseData(text)` and `renderChart(data, { type, title })` (returns `{ canvas, chart }`; call `chart.destroy()` after).
`parseData('Month\tViews\nJan\t1,200\nFeb\t$1,850')` gives labels Jan, Feb and one series "Views" of 1200, 1850. `renderChart` for each type gives a 1600 × 900 canvas with a white corner pixel.
