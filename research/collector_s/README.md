# 컬렉터S(@collector___s) 조사 자료

Threads 계정 [컬렉터S](https://www.threads.com/@collector___s)의 게시물로 한국 미술시장의 거래 관행과 작가별 평가를 살핀 조사 자료입니다(조사일 2026-11-09). 이 저장소의 웹앱과는 별개이며, Pages 빌드에 포함되지 않습니다.

## 먼저 읽을 것

이 조사 환경에서는 Threads와 경매사 사이트에 **접속하지 못했습니다.** 모든 내용은 검색엔진 색인으로 확보한 컬렉터S 게시물 7건(2026-05-11~08-15)에 근거하며, 이미지는 없습니다. 수집을 이어가는 방법은 [보고서 2.3절](report.md#23-수집을-이어가려면-사용자가-할-일)에 있습니다.

## 결과물

| 파일 | 내용 |
|---|---|
| [report.md](report.md) | 한국어 조사 보고서: 접근 경과, 주요 관찰, 주장별 구분, 경매 대조, 한계, 최종 집계, 출처 |
| [artist_market_status.md](artist_market_status.md) | 작가별 시장현황: 컬렉터S 견해와 경매 결과 |
| [collector_s_index.xlsx](collector_s_index.xlsx) | 게시물 인덱스. 시트: 요약, 게시물인덱스(날짜순), 원글, 답글, 분류, 작가별평가표, 경매대조표, 검증수준, 미확인단서, 수집구간로그, 검색질의로그, 접근기록 |
| [bundle/](bundle/README.md) | 게시물별 본문 파일(`posts/게시일_shortcode.md`)과 이미지 확보 현황 |
| [data/](data/) | 원자료 JSON: posts, clues, artists, auction_refs, search_log |
| [tools/shortcode.py](tools/shortcode.py) | Threads shortcode를 미디어 ID와 생성 시각으로 디코딩 |
| [tools/build_outputs.py](tools/build_outputs.py) | data/*.json에서 엑셀과 자료 묶음을 다시 생성 |
| [tools/threads_capture.js](tools/threads_capture.js) | 사용자 크롬 콘솔에서 실행하는 수집 스크립트. 프로필을 자동으로 스크롤하며 지나가는 글을 모두 기록하고 JSON으로 저장 |
| [tools/import_capture.py](tools/import_capture.py) | 위 JSON을 data/posts.json에 합치고 사진을 내려받음 |
| [tools/fetch_threads_api.py](tools/fetch_threads_api.py) | 공식 Threads API 수집기(일반 계정 조회에는 Meta 앱 심사가 필요해 이번에는 미사용) |

## 브라우저 수집 파일 반영

```bash
python3 research/collector_s/tools/import_capture.py collector_s_threads_*.json collector_s_replies_*.json
```

```bash
python3 research/collector_s/tools/build_outputs.py
```

## 다시 만들기

`data/*.json`을 고친 뒤 아래 명령을 실행하면 엑셀과 `bundle/`이 갱신됩니다(openpyxl 필요).

```bash
python3 research/collector_s/tools/build_outputs.py
```

게시일시를 확인하려면 shortcode를 넣어 실행합니다.

```bash
python3 research/collector_s/tools/shortcode.py DaSaRmCGOCS
```
