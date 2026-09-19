# Performance and UX assessment — 19 September 2026

## Decision

The current desktop reference app supports the main assessment journey: discover the project, open the review guide, try a documented example, compare RP/GA and inspect the underlying correspondence. The tested flows worked, with the improvements below published during this assessment. This is **not** a claim of complete mobile, cross-browser or WCAG conformance. Mobile rendering, assistive-technology behaviour, real-user performance and completed JSON file downloads remain verification gaps.

## Sources and scope

Opened the public converter and homepage in the supported cloud Chrome browser. Inspected the review guide, `app.html`, `index.html`, both stylesheets, application, dictionary, optical-rendering and engine modules, tests and build/link checks. The review guide and five public PDF checksums had also been verified earlier on 19 September; PDF contents were not changed or re-audited in this performance pass. Baseline was commit `57cd66a`; converter behaviour fixes were deployed as `df438bf`. Final contrast adjustments accompany this report.

The browser's measured layout width was 1,348 CSS pixels. No supported viewport emulation, CPU/network throttling, browser performance trace or screen reader was available. Keyboard zoom did not change the measured layout width. Therefore responsive behaviour below desktop width is assessed from source only, not claimed as a tested phone experience. Browser screenshots were inspected for desktop focus and layout. No participant usability study was conducted.

## Performance evidence

### Network and payload

Three independent `curl --compressed` GETs per asset, at most four assets in parallel, from the task runtime to the public GitHub Pages site. All 21 responses returned HTTP 200. Values below are baseline transferred bytes and median whole-request time, including this environment's connection/proxy overhead. These are **not browser load timings** and do not represent a controlled mobile network or cold browser cache.

| Asset | Transferred bytes | Median request time |
|---|---:|---:|
| app.html | 3,182 | 8.674 s |
| css/style.css | 3,760 | 8.677 s |
| js/app.js | 4,320 | 8.771 s |
| specialist Myeongjo font | 725,300 | 8.798 s |
| examples.json | 1,612 | 8.175 s |
| RP dictionary | 1,011,499 | 8.216 s |
| GA dictionary | 872,036 | 8.265 s |

Uncompressed dictionary files are 3,400,161 and 3,303,137 bytes. Dictionary lookup already loads only the chosen accent and only when the example/correction data cannot answer the phrase. Successful and in-flight requests are cached. The font retains the old-Hangul repertoire required by the display; it was not indiscriminately subsetted. The generic dictionary and font are the largest loading costs. The similar 8–10 second first-byte timings across tiny and large assets make this run unsuitable for attributing delay to application rendering. A sampled response advertised `Cache-Control: max-age=600`.

No LCP, FCP, INP, CLS, Lighthouse score or field Core Web Vitals result was collected. None should be inferred from these transfer measurements.

### Conversion engine

Node 24.19.0, `convertPhrase`, RP `/buːst/` repeated, 20 warm-up runs then 200 measured runs per length using `performance.now()`. Median is sorted sample 101; p95 is sample 190. This excludes dictionary download, font preparation, DOM rendering and user-device speed.

| Words | Median | p95 |
|---:|---:|---:|
| 1 | 0.018 ms | 0.060 ms |
| 10 | 0.071 ms | 0.196 ms |
| 100 | 0.535 ms | 1.258 ms |

The live browser successfully rendered 100 words. Before the fix, it also created 400 hidden detail-table rows and 6,061 total DOM elements. With details collapsed after the fix: zero detail rows and 2,162 DOM elements, a **64.3% reduction**. Opening details creates the 400 rows; converting back to boost while details remain open replaces them with the correct four rows. This establishes reduced initial DOM work, not a measured percentage improvement in elapsed rendering time.

## Findings and changes

| Priority | Finding | Action and evidence |
|---|---|---|
| Medium | Helper text below normal-text contrast target | Darkened placeholder, empty-state, source-chip, caption and step text. Examples previously ranged from 3.34:1 to 4.27:1 against white; replacement `#526573` gives 6.06:1 on white and 5.52:1 on the app background. Extended correction to footer, book labels and syllable brackets. |
| Medium | Homepage dark-panel label and review-page secondary text too faint | Dark-panel eyebrow was 2.00:1; review secondary text was 4.23:1. Updated dark-panel/copper-panel text and the review page's muted colour. |
| Medium | Stalled dictionary requests had no application deadline | Added a 20-second abort, Korean recovery message and cache eviction allowing retry. Mocked stalled-request/retry regression passes. This is not an offline-device test. |
| Medium | Hidden inspection tables built on every conversion | Defer construction until disclosure opens. Replace repeated token-array scans with a lookup map. Live 100-word and subsequent one-word checks passed. |
| Medium | Download message asserted a saved file without confirmation | Message now says a download was requested and directs the reader to the browser download list. The cloud download-event wait timed out, so file completion is not certified. |
| Low | Input limits and keyboard shortcut were undiscoverable | Added visible 100-word/5,000-character limits and Ctrl/Command+Enter hint. Bound hints and live status to input accessible descriptions. |
| Low | Small repeated controls on touch devices | Added 44px minimum heights for example/action/disclosure controls on coarse pointers and larger navigation/slider hit areas. CSS reviewed; actual touch testing remains outstanding. |
| Low | Long source labels could resist wrapping | Added wrapping for source labels, detail headings and result notes. Desktop 100-word test has no page-width overflow. Pathological single-syllable output at small widths remains a device-testing item. |

Contrast calculations use the relative-luminance method and the normal-text 4.5:1 criterion described in [W3C's contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Correcting sampled colours is not a full accessibility certification.

## User-journey checks

| Journey | Result and boundary |
|---|---|
| Homepage → guide/app/books | Prominent review and converter links, four separately labelled books and combined archive. Local links/assets and HTML fragments checked. |
| Default boost | Correct visible 부·우·ㅅ·ㅌ; documented-example provenance; copy enabled. |
| RP/GA pass | `/pɑːs/` → `/pæs/` after accent switch. |
| Direct IPA | `/ə.ˈbaʊt/` accepted with explicit boundaries. |
| Unresolved catch | Displays unresolved state and reason, disables plain-text copying, retains record-export action. |
| Empty input | Korean input guidance; subsequent example recovers. |
| Mixed known/unknown phrase | Names `zznotawordxyz` and offers direct IPA entry. Existing all-or-nothing phrase behaviour retained to avoid silently omitting words. |
| Limits | 100 words render; 101 words rejected with clear limit. HTML maximum is 5,000 characters; engine limits also covered by automated tests. |
| Input changes | Previous result and copy/export actions invalidated. Request-generation checks in source prevent stale responses replacing new input. No controlled network-race browser simulation performed. |
| Copy | Browser clipboard readback exactly `부ᅮᆺᇀ` for boost, preserving decomposed jamo. |
| JSON export | App requested download; browser event timed out. Saved-file contents not verified in this pass. |
| Keyboard | Ctrl+Enter submission, Tab to accent control with visible outline, End key on size slider reaching 76 and Enter on details disclosure exercised. Not an exhaustive keyboard/screen-reader audit. |
| Details | Post-fix collapsed tables absent, expansion renders correct records, new conversion replaces prior expanded records. |
| Desktop layout | No horizontal page overflow at 1,348px with default or 100-word result. Desktop screenshot inspected. |
| Console | Sampled warning/error logs showed browser-extension metadata errors; no app-origin exception was observed in that sample. This is not a guarantee of zero console errors across all flows. |
| Build/regression | 283/283 automated tests; syntax/local-link/input-label checks and static build pass. Three new tests cover timeout/retry, shared request caching and invalid-JSON recovery. |

## Remaining risks and next validation

1. **Phone and browser coverage:** exercise actual iOS Safari and Android Chrome at 320–430px, landscape and enlarged text. Check long words, large glyph sizes, table scrolling, touch targets and whether conversion results below the input panel are easy to discover. Desktop Chrome source review cannot settle these questions.
2. **Export:** verify the resulting `hmbr-records.json` file on desktop and mobile, including unresolved entries and source metadata. Clipboard fallback under denied permission also needs an actual permission-denied session.
3. **Real browser performance:** collect cold and warm Lighthouse/DevTools traces on a specified mid-range device and throttled network, with LCP/CLS and representative interaction timings. The current HTTP/Node measurements are deliberately separate.
4. **Accessibility:** VoiceOver/NVDA, reading order, full keyboard traversal, zoom/reflow and forced colours remain untested. Large result lists in the live region may be verbose for assistive technology.
5. **Loading:** selected-accent dictionary payload and specialist font remain substantial. Consider versioned dictionary sharding only after a controlled mobile trace demonstrates the benefit; preserve exact dictionary values and provenance. Font-load failure/retry has not been simulated.
6. **Research accuracy:** raw dictionary IPA remains labelled unreviewed. Passing tests are not dictionary-wide validation or evidence of learning outcomes. The guide states these limitations.

The tested desktop demonstration is suitable for the documented review path. Do not describe it as comprehensively mobile-tested, certified accessible or independently performance-rated. MP documents are outside this assessment and publication.
