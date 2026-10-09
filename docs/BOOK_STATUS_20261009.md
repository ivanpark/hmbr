# HMBR four-book status review

> **후속 반영 (2026-10-09):** 아래 정정 1·2와 날짜 표기 제안 3은 제3본·제4본 2026-10-09 교정판([제3본](HMBR_Book3_Jeonsanbon_20261009.pdf) 46쪽, [제4본](HMBR_Book4_Guhyeonbon_20261009.pdf) 24쪽, 부록 D 추가)에 반영되었다. 통합 보관판은 [165쪽 판](HMBR_Books1-4_Combined_20261009.pdf)으로 다시 만들었다. 이 검토 본문은 9월 판을 대상으로 한 당시 기록으로 그대로 둔다. 제3·4본 10월 교정판의 DOCX·Markdown 편집 원본은 아직 저장소에 없다.

## Revised assessment - 9 October 2026

All four books are published and downloadable as research editions. They form a complete four-part publication set, but that does not mean every proposed rule is settled or every implementation requirement has been met. The appropriate current description is: **published research set, with a targeted Book III consistency correction and a Book IV implementation-status refresh still required.**

This review revises the status assessment and records exact editorial corrections. It does not silently replace the September books with new editions. The existing PDF page counts, filenames and publication dates remain the reference points below.

## Source audit and verification

Remote main was fetched on 9 October: `39bd6f8c249752c83be067c12fef34210e7c9282`, still the September 19 state. All four PDFs opened. Edition statements, contents, relevant rule/status sections and selected rendered pages were inspected. Book III and IV DOCX files were opened and relevant wording compared with the PDFs. The index, September correction log, source audit, implementation record, dictionary-source notes and September performance report were read for the current status review. This was a focused consistency review, not a new line-by-line proofread of all 164 pages or an external validation of every cited authority.

The live four books and combined PDF each returned HTTP 200; their SHA-256 values matched the repository PDFs. The combined PDF has 164 pages and book starts/bookmarks at 1, 37, 96 and 142. Today's local rerun passed 283/283 tests, the 65-link/asset and label check and the static build. These checks do not establish dictionary-wide phonetic accuracy, mobile compatibility or educational effectiveness. Browser interaction testing from September 19 remains historical evidence, not a new October browser audit.

Earlier-conversation retrieval failed. No later private manuscript can therefore be ruled out by this review. The verified public repository and the inspected books are its authority. The latest editable originals of Books I and II are not present in this repository; their absence is also recorded in the existing source audit.

## Status by book

| Book and edition | Revised status | What remains |
| --- | --- | --- |
| I - 선언본; 16 September; 36 pages | Published policy and purpose research edition. No new blocking inconsistency found in the inspected status/policy passages. | Recover the editable source. Educational benefit, accessibility and institutional adoption remain goals to test, not completed outcomes. |
| II - 해례본; 17 September; 59 pages | Published RP/GA reference research edition. The silent-vowel-carrier decision is explicitly incorporated. | Recover the editable source. Final compressed forms, some glide combinations, /ɝ/ analysis and other declared unresolved items require separate decisions. |
| III - 전산본; 17 September; 46 pages | Published computational specification draft with editable DOCX. One confirmed status-table inconsistency needs correction. | Align p37 with the September display decision and p39. External record interchange, reverse conversion and broad platform conformance remain implementation work. |
| IV - 구현본; 17 September; 23 pages | Published manual and implementation snapshot with DOCX and Markdown. It needs the most immediate status refresh. | Correct the p16 remaining-work table and distinguish the September 16 test/deployment record from the latest 283-test code state and September 19 UX work. |

The four books retain distinct roles: I explains why and where the proposal applies; II defines how sounds are represented; III specifies digital preservation and exchange; IV reports what the software actually implements and verifies. A working web demonstration cannot settle an unresolved phonetic or orthographic decision in Book II.

## What is already completed

Book I p23 distinguishes ordinary Korean loanword spelling from an optional precise foreign-language notation layer. Its pp25-26 and 30-31 already distinguish educational aims, accessibility requirements and research validation from completed evidence. It does not need to be rewritten merely because later implementation details changed.

Book II pp3, 16, 55 and 58-59 distinguish reading display from stored values. The author-approved boost display is **부우ㅅㅌ**: the additional silent ㅇ makes the trailing vowel readable and adds neither a phoneme nor a syllable. Book III p39 likewise excludes the display carrier from the stored vowel array. The canonical boost sequence remains `U+1107 U+116E U+116E U+11BA U+11C0`.

Book IV p9 correctly states the display profile and proportions: stressed core 100%, unstressed core 75%, trailing vowel 50% and independent consonants 75%; the primary core becomes 125% only in a word containing secondary stress. The current display source implements that distinction. The September correction is substantially present across the set; the residual wording below must not be mistaken for a reversal of the author's decision.

The public publication files are intact. Previous upload problems do not mean the books are still awaiting publication. Their latest verified editions remain September 16/17; the new review date does not turn them into October editions.

## Confirmed editorial corrections

### 1. Book III p37, section 28.1: display-status row

The PDF and editable DOCX still say: **복합 핵의 무초성 연쇄, /s/ 위치형 경계, GA /ɔ/ 값, 강세 상대 크기** under 시범 표시. In that display context, the phrase 무초성 연쇄 conflicts with the later silent-carrier explanation in Book III p39 and Book II pp3/58.

Use this replacement in the next edition: **복합 핵의 뒤 모음에 읽기용 무음 초성 ㅇ을 붙이는 선형 표시(저장 V 배열에는 미포함), /s/ 위치형 경계, GA /ɔ/ 값, 강세 상대 크기.**

This clarifies the display layer while preserving the stored V sequence and the existing status of the other items. It does not allocate a new phoneme or settle the final compressed glyph design.

### 2. Book IV p16, section 10: long-vowel row

The current row lists **length 속성·뒤 요소 50% 표시** as remaining work. Yet p9 and p23 already describe the 50% trailing-vowel display as implemented, and the current display code sets that factor to 0.5.

Revise the current-implementation cell to: **토큰과 두 요소의 대응; 뒤 모음 50% 및 읽기용 무음 ㅇ 표시 구현.** Revise the remaining-work cell to: **문서의 length 속성과 실제 데이터 필드의 대응 명시.**

The pending schema correspondence and the completed display behaviour are different tasks. This edit removes the false impression that the display feature is still absent without claiming the whole schema is implemented.

### 3. Book IV pp14, 17, 20 and 22-23: date the evidence

The 270/270 tests, 53 checked links/assets, commit `f049e24` and Actions run `35074663177` are explicitly tied to the September 16 baseline. Preserve them as historical records. Add a clearly dated current-status note rather than changing those numbers inside the old record.

Suggested note: **2026-10-09 재확인: 공개 코드 기준판 39bd6f8에서 자동시험 283/283, 로컬 링크·자산 65개 검사와 정적 빌드가 통과했다. 제1본은 2026-09-16, 제2-4본은 2026-09-17 판이다. 9월 16일의 시험·배포 수치는 당시 기록으로 유지한다. 9월 19일 성능·UX 보완은 별도 보고서를 참조하며 모바일·화면낭독기·JSON 다운로드 완료 검증의 남은 범위를 함께 밝힌다.**

A future Book IV edition should also describe the implemented dictionary timeout/retry, deferred detail tables, input-limit/keyboard guidance and the more accurate download-request message. Those changes should be documented as implementation updates, not as changes to the canonical sound-to-jamo rules.

## Open work, in priority order

1. **Editorial consistency:** apply the two exact corrections above to the editable Book III and IV sources, then render and verify the resulting PDFs. Keep historical test records distinct from the new status note. This is a bounded revision, not a four-book rewrite.
2. **Implementation documentation:** refresh Book IV's current-status section against a named code commit; synchronise DOCX, Markdown and PDF. Rebuild the combined PDF and its bookmarks only after those new individual editions are verified, then update the index and checksums together.
3. **Editable source recovery:** locate the latest Book I and II originals before further substantial layout work. Book II's September correction log says 30 modified pages preserve glyph outlines with a corrected text layer. That is a published PDF correction, not a recovered editable manuscript.
4. **Dictionary provenance and quality:** the repository's data/SOURCES.md still records unresolved RP provenance/licensing and substantial RP-like entries in the GA-labelled data. Examples matching the books are prioritised, but general dictionary results remain unreviewed. This is a data-quality task, not something passing unit tests resolves.
5. **Research and conformance:** keep /ɝ/, unresolved coda allocations, final glide/compressed forms, new-model Narrow support, external JSON import and user-facing reverse conversion on the open list. Book III pp35-37 and Book IV pp16/20 do not support a claim of complete conformance.
6. **User evidence:** real mobile and screen-reader checks, completed JSON-download verification, controlled browser performance measurements and teacher/learner studies still need evidence. Book I already treats these as separate forms of validation. No contest result, standard adoption or learning-effect claim is inferred here.

## Inspected references

- Book I: [16 September PDF](HMBR_Book1_Seoneonbon_20260916.pdf), pp1-3, 23, 25-26 and 30-31; p23 visually inspected.
- Book II: [17 September PDF](HMBR_Book2_Haeryebon_20260917.pdf), pp1-3, 16 and 55-59; p16 visually inspected.
- Book III: [17 September PDF](HMBR_Book3_Jeonsanbon_20260917.pdf), pp1-4, 28, 35-39 and 45-46; p37 visually inspected; matching DOCX status wording checked.
- Book IV: [17 September PDF](HMBR_Book4_Guhyeonbon_20260917.pdf), pp1-3, 9, 14, 16-17, 20 and 22-23; p16 visually inspected; DOCX display and baseline wording checked.
- [Document index](INDEX.md), [September 17 corrections](HMBR_Corrections_20260917.md), [source audit](SOURCE_AUDIT.md), [implementation record](IMPLEMENTATION.md), [dictionary-source notes](../data/SOURCES.md) and [September performance/UX assessment](PERFORMANCE_UX_20260919.md).

This is the revised status record and an editorial correction plan. No new book edition or resolution of the declared research questions is represented by this report. MP documents are excluded.
