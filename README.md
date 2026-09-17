# 훈민바름 · 공개 연구 사이트와 제3본 기준 시범 구현

## [▶ 훈민바름 변환기 바로 열기](https://ivanpark.github.io/hmbr/app.html)

공개 front page에서 훈민바름의 연구 범위와 네 본을 소개하고, 별도의 참조 구현에서 영어 또는 IPA를 훈민바름 음절블록으로 살펴본다. 제1·2본 교정 PDF, 46쪽 제3본 전산본과 23쪽 제4본 구현본을 함께 제공한다. 사용자 제공 `hmbr-web-v2.0(2).zip`의 사전·글꼴을 계승하고, 현재 제3본과 충돌하는 변환 엔진은 새로 구현했다.

[공개 사이트](https://ivanpark.github.io/hmbr/) · [소리 써보기](https://ivanpark.github.io/hmbr/app.html) · [문서 바로 보기](https://ivanpark.github.io/hmbr/#books)

## 검증된 교정 출판 파일

2026년 9월 16일 교정판의 제1–4본과 합본을 제공합니다. 쪽수와 파일별 SHA-256은 [문서 색인](docs/INDEX.md)과 [체크섬 목록](SHA256SUMS.txt)에서 확인할 수 있습니다.

- [제1본 · 선언본 · 36쪽](docs/HMBR_Book1_Seoneonbon_20260916.pdf)
- [제2본 · 해례본 · 59쪽](docs/HMBR_Book2_Haeryebon_20260916.pdf)
- [제3본 · 전산본 · 46쪽](docs/HMBR_Book3_Jeonsanbon_20260916.pdf)
- [제4본 · 구현본 · 23쪽](docs/HMBR_Book4_Guhyeonbon_20260916.pdf)
- [제1–4본 · 교정 합본 · 164쪽](docs/HMBR_Books1-4_Combined_20260916.pdf)
- [문서 색인](docs/INDEX.md)

## 사용

- **영어로 찾기:** 문서 예시, 출처와 범위가 기록된 개별 교정(`data/ipa-corrections.json`), 첨부 사전의 원문 IPA 순서로 조회한다. 출처와 검수 상태가 결과에 표시된다. RP international의 제2강세 누락은 개별 교정으로 보완하며 전체 IPA 검수와 구별한다.
- **IPA 직접 입력:** 넓은 표기(Broad)를 입력한다. 공백은 단어, 점(`.`)은 음절 경계다. `/ə.ˈbaʊt/`처럼 경계를 지정할 수 있다.
- **결과:** 괄호 하나가 한 음절블록이다. 제1강세는 기본 100%, 무강세는 75%다. 같은 단어에 제2강세가 있을 때만 제1강세를 125%로 키우고 제2강세를 100%로 표시한다. 강세 미지정은 임의로 제1강세로 바꾸지 않고 기본 크기로 표시한다.
- **화면의 모양:** 제2본의 선형 시범 조자법과 같게 보인다(`js/display.js`, 표시 프로파일 `linear-trial-v3`). 마지막 초성·첫 중성·(단일) 첫 종성만 한 음절로 합성하고, 나머지 자모는 독립 요소로 보인다. 크기는 합성된 핵에 위 강세 규칙을 적용하고, 뒤 모음 요소 50%(제2본 §14 「뒤 요소 50% 크기」), 독립 자음 75%다. 모든 비율은 사용자가 정한 기본 글자 크기에 대한 절대 비율이며, 강세 배율을 중첩하지 않는다 — `부ㅜㅅㅌ`은 부(100) ㅜ(50) ㅅㅌ(75). 종성 /s/와 /t+s/는 언제나 독립 요소다 — 제2본 §9.4가 금지한 `팻`·`캧` 같은 모양이 화면에 나오지 않는다(`패ㅅ`·`캐ㅊ`). 이 규칙은 화면만 바꾸며 복사·저장되는 NFD 직렬화는 그대로다.
- **자모열 복사:** NFD 조합형만 복사한다. 여러 단어의 복사는 단어별 자모열을 공백으로 연결하는 편의 기능이다. 단어 하나의 직렬화에는 공백이나 표시용 괄호가 없다.
- **전체 기록 저장:** 원문, 발음 기준, 정규화 이력, 강세, 음소와 자모의 대응, 미결 상태를 JSON으로 저장한다. 문장 교환은 이 레코드 배열을 사용한다.
- **이전 앱 비교:** 기존 v2.0의 좁은 표기·연음·조음 안내를 `legacy/index.html`에서 확인한다. 구버전 결과는 현재 제3본의 적합성 결과와 구별한다.

## 실행과 검증

추가 패키지 설치가 필요 없다. Node.js 22 이상에서 다음을 실행한다.

```sh
node tools/check.mjs
node --test tests/*.test.mjs
node tools/build.mjs
node tools/cluster_census.mjs      # 제3본 §21 자음군·음절핵 부호 배당 조사 재현 (--json 가능)
```

`tools/cluster_census.mjs`는 첨부 사전에서 어두·어말 자음군과 2요소 음절핵을 전수 추출해 Unicode 겹낱자 부호 배당
여부를 대조한다. 제3본 §21의 수치(RP 207·447종, GA 123·303종, 등록 16·38·11·31, 완전 해소 516·320종, 상위 60종 90% 남짓)가
그대로 재현된다. 해석 표제어 수만 제3본 표기(134,297)와 1항 차이가 있으며 정규화 표의 미세한 차이다. 자모의 공식 이름은
`data/jamo-names.json`(Unicode 문자 데이터베이스에서 옮김)을 쓴다.

`dist/`가 배포 파일이다. 로컬 실행 예:

```sh
python3 -m http.server 8000 --directory dist
```

브라우저에서 `http://localhost:8000`을 연다. ES 모듈과 사전 요청을 사용하므로 `file://`로 열지 않는다. 새 앱은 API 키·서버·외부 AI 호출을 사용하지 않는다.

## GitHub Pages에 게시

이 디렉터리의 내용을 대상 저장소의 루트에 배치한다. 기존 저장소가 있다면 해당 저장소의 지침·기존 파일과 대조한 뒤 반영한다. 이 패키지는 원격 저장소의 현재 파일을 덮어쓴 결과가 아니다.

`.github/workflows/pages.yml`은 검사와 시험을 통과한 뒤 정적 파일을 만들고 Pages로 배포한다. `main`·`master`의 push와 수동 실행을 지원하며 실제 배포는 저장소의 기본 브랜치에 한정한다. PR에서는 검사·빌드만 실행한다. 기본 브랜치 이름이 다르면 workflow의 `push.branches`도 맞춘다.

저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정한다. 첫 게시 후 GitHub가 표시하는 실제 Pages 주소와 성공한 workflow를 확인한다. [GitHub 게시 설정 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [사용자 지정 Pages workflow 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

모든 새 앱의 자산·문서 링크는 상대 경로로 구성하여 저장소 이름이 붙는 Pages 경로에서도 사용할 수 있게 했다. `dist/`에 소스 시험이나 생성 도구는 배포하지 않는다.

## 제3본과 맞춘 항목

| 항목 | 현재 구현 |
| --- | --- |
| 기준형 | 어휘별 `L+ V+ T*`의 NFD 자모 연쇄 |
| /l/ | 초성군·모음 사이에서 임의 중복하지 않음 |
| 장모음·복모음 | 같은 핵의 V 배열. 뒤 요소 앞에 ㅇ을 넣지 않음 |
| /ʊ/와 /uː/ | U+118D와 U+116E U+116E를 구별 |
| /s/ | 종성 U+11BA와 순서 보존. 표시에서 독립 요소로 보임 |
| /t+s/ | 같은 종성군에서 토큰 2개 → JV-TS 1개. /tʃ/와 구별 |
| 미배당 종성 | /θ ð ʒ tʃ dʒ/는 구조 보존, 해당 단어 평문 `unavailable` |
| /ɝ/·음절자음 | 모음이나 위치형을 추정하여 채우지 않음 |
| /ɚ/ | GA에서 원문을 남기고 /əɹ/ 분석 이력을 기록 |
| 강세·출처 | 자모열 밖 구조화된 기록에 보존 |
| 표시 | 제2본 선형 시범 조자법과 같은 모양. 종성 /s/·/t+s/는 합성하지 않음 (§9.4 금지형 방지) |

## 적용 범위

**제3본 개정 초안의 시범 구현이며 전 영어 발음의 정확도를 보증하는 사전이 아니다.**

음절 경계가 없는 여러 모음핵의 입력에는 명시된 최대 초성 추정 휴리스틱을 사용하고 `review-needed`를 반환한다. 이 휴리스틱은 이번 구현의 선택이며 제2본의 새 확정 규칙이 아니다. 직접 입력한 점 경계와 강세 위치는 우선 보존한다. 일부 미검수 사전 IPA는 선택한 모듈과 충돌할 수 있으며, 이를 조용히 다른 모음으로 바꾸지 않는다.

/j,w/의 기저값 명시형은 제공하지만 모음과의 최종 결합형을 확정하지 않는다. 좁은 표기, 음절자음, 미등록 기호를 Broad 완성 출력으로 바꾸지 않는다. 평문에서 원철자·강세·출처를 자동 복원하는 역변환기나 영어 낭독 기능은 이 앱에 포함하지 않는다.

## 라이선스

| 자산 | 라이선스 | 파일 |
| --- | --- | --- |
| 소스 코드 (`js/` `tools/` `tests/` `css/` `index.html` `app.html` `review-brief-260916.html` `legacy/`) | MIT | [LICENSE](LICENSE) |
| 문서 (`docs/` PDF·DOCX·MD, README 등) | CC BY 4.0 | [docs/LICENSE.md](docs/LICENSE.md) |
| 글꼴 (`fonts/*.woff2`) | SIL Open Font License 1.1 (나눔 글꼴 부분집합, 이름 변경) | [fonts/OFL.txt](fonts/OFL.txt) · [fonts/NOTICE.txt](fonts/NOTICE.txt) |
| 발음사전 (`data/dict-*.json`) | 제3자 자료 · 출처 확인 중 | [data/SOURCES.md](data/SOURCES.md) |

제1본 부록 A 「공공성 원칙」의 공개·비독점·기술중립 원칙을 저장소에 그대로 적용한 것이다.

## 자료와 변경 이력

- [원자료 확인 및 변경 내역](docs/SOURCE_AUDIT.md)
- [구현 검증 보고](docs/IMPLEMENTATION.md)
- [2026-09-16 편집·검증 내역](docs/HMBR_Corrections_20260916.md)
- `data/book3-tables.json`: 제3본의 확인된 표를 옮긴 개발 근거.
- `data/examples.json`: 제2·3본에 실린 낱말의 RP·GA IPA (RP 94 · GA 93 항목). 제2본 §7 RP·GA 대조표와 맺음말의 다섯 낱말(car·go·pass·hot·near)을 포함하므로, 책에 나오는 낱말은 사전 품질과 무관하게 책과 같은 값이 나온다. 일반 사전 검수를 뜻하지 않는다.
- `data/dict-ga.json`: 기존 ZIP의 125,004개 항목, 기존 설명은 CMU 계열.
- `data/dict-rp.json`: 기존 ZIP의 135,495개 항목, 기존 설명은 2023년 일부 기계 생성·검수 전.
- `fonts/`: 나눔명조·나눔바른고딕 옛한글(SIL OFL 1.1)의 부분집합 WOFF. OFL의 예약 글꼴 이름 조항에 따라 내부 이름과 파일 이름을 `HMBR Myeongjo YetHangul`·`HMBR BarunGothic YetHangul`로 바꾸었다. 원 저작권 고지와 라이선스 전문은 `fonts/OFL.txt`·`fonts/NOTICE.txt`에 있다. 제3본 핵심 부호의 글꼴 수록 여부를 확인했다.

사전의 출처·라이선스와 알려진 품질 문제(GA 사전의 RP형 전사)는 `data/SOURCES.md`에 적었다.

## 제4본 구현본

웹 사용법, 교사용 활동, 개발 재현 절차, 시험 결과와 미구현 범위를 설명한다.

- [제4본 교정 PDF · 2026.09.16](docs/HMBR_Book4_Guhyeonbon_20260916.pdf)
- [제4본 DOCX · 2026.09.16 편집 원본](docs/HMBR_Book4_Guhyeonbon_20260916.docx)
- [제4본 텍스트 · 2026.09.16](docs/HMBR_Book4_Guhyeonbon_20260916.md)

최초 공개 코드 커밋은 `1e3164ce706ad7397a7cd660e0f15f11be7e1ed7`이다. 현재 웹앱은 [GitHub Pages](https://ivanpark.github.io/hmbr/)에서 제공하며, 배포 결과는 [Actions](https://github.com/ivanpark/hmbr/actions/workflows/pages.yml)에서 확인할 수 있다.
