# 훈민바름 Web · 제3본 기준 시범 구현

영어 또는 IPA를 훈민바름 음절블록으로 살펴보는 정적 웹앱이다. 제1·2본 교정 PDF, 46쪽 제3본 전산본과 23쪽 제4본 구현본을 함께 제공한다. 사용자 제공 `hmbr-web-v2.0(2).zip`의 사전·글꼴을 계승하고, 현재 제3본과 충돌하는 변환 엔진은 새로 구현했다.

[웹앱 바로 실행](https://ivanpark.github.io/hmbr/) · [문서 바로 보기](https://ivanpark.github.io/hmbr/#documents)

## 검증된 교정 출판 파일

2026년 9월 14일 교정판의 제1–4본과 합본을 제공합니다. 쪽수와 파일별 SHA-256은 [문서 색인](docs/INDEX.md)과 [체크섬 목록](SHA256SUMS.txt)에서 확인할 수 있습니다.

- [제1본 · 선언본 · 36쪽](docs/HMBR_Book1_Seoneonbon_20260914.pdf)
- [제2본 · 해례본 · 59쪽](docs/HMBR_Book2_Haeryebon_20260914.pdf)
- [제3본 · 전산본 · 46쪽](docs/HMBR_Book3_Jeonsanbon_20260914.pdf)
- [제4본 · 구현본 · 23쪽](docs/HMBR_Book4_Guhyeonbon_20260914.pdf)
- [제1–4본 · 교정 합본 · 164쪽](docs/HMBR_Books1-4_Combined_20260914.pdf)
- [문서 색인](docs/INDEX.md)

## 사용

- **영어로 찾기:** 문서 예시를 먼저 찾고, 나머지 단어는 첨부 사전의 원문 IPA로 조회한다. 출처와 검수 상태가 결과에 표시된다.
- **IPA 직접 입력:** 넓은 표기(Broad)를 입력한다. 공백은 단어, 점(`.`)은 음절 경계다. `/ə.ˈbaʊt/`처럼 경계를 지정할 수 있다.
- **결과:** 괄호 하나가 한 음절블록이다. 제1강세 125%, 제2강세 100%, 무강세 75%를 적용한다. 강세 미지정은 임의로 제1강세로 바꾸지 않고 기본 크기로 표시한다.
- **자모열 복사:** NFD 조합형만 복사한다. 여러 단어의 복사는 단어별 자모열을 공백으로 연결하는 편의 기능이다. 단어 하나의 직렬화에는 공백이나 표시용 괄호가 없다.
- **전체 기록 저장:** 원문, 발음 기준, 정규화 이력, 강세, 음소와 자모의 대응, 미결 상태를 JSON으로 저장한다. 문장 교환은 이 레코드 배열을 사용한다.
- **이전 앱 비교:** 기존 v2.0의 좁은 표기·연음·조음 안내를 `legacy/index.html`에서 확인한다. 구버전 결과는 현재 제3본의 적합성 결과와 구별한다.

## 실행과 검증

추가 패키지 설치가 필요 없다. Node.js 22 이상에서 다음을 실행한다.

```sh
node tools/check.mjs
node --test tests/*.test.mjs
node tools/build.mjs
```

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

## 적용 범위

**제3본 개정 초안의 시범 구현이며 전 영어 발음의 정확도를 보증하는 사전이 아니다.**

음절 경계가 없는 여러 모음핵의 입력에는 명시된 최대 초성 추정 휴리스틱을 사용하고 `review-needed`를 반환한다. 이 휴리스틱은 이번 구현의 선택이며 제2본의 새 확정 규칙이 아니다. 직접 입력한 점 경계와 강세 위치는 우선 보존한다. 일부 미검수 사전 IPA는 선택한 모듈과 충돌할 수 있으며, 이를 조용히 다른 모음으로 바꾸지 않는다.

/j,w/의 기저값 명시형은 제공하지만 모음과의 최종 결합형을 확정하지 않는다. 좁은 표기, 음절자음, 미등록 기호를 Broad 완성 출력으로 바꾸지 않는다. 평문에서 원철자·강세·출처를 자동 복원하는 역변환기나 영어 낭독 기능은 이 앱에 포함하지 않는다.

## 자료와 변경 이력

- [원자료 확인 및 변경 내역](docs/SOURCE_AUDIT.md)
- [구현 검증 보고](docs/IMPLEMENTATION.md)
- [제1·2본 교정 내역](docs/HMBR_Corrections_20260908.md)
- `data/book3-tables.json`: 제3본의 확인된 표를 옮긴 개발 근거.
- `data/examples.json`: 문서 예시만 수록한 조회 자료. 일반 사전 검수를 뜻하지 않는다.
- `data/dict-ga.json`: 기존 ZIP의 125,004개 항목, 기존 설명은 CMU 계열.
- `data/dict-rp.json`: 기존 ZIP의 135,495개 항목, 기존 설명은 2023년 일부 기계 생성·검수 전.
- `fonts/`: 기존 ZIP의 나눔명조·나눔바른고딕 옛한글 WOFF. 제3본 핵심 부호의 글꼴 수록 여부를 확인했다.

첨부 사전과 글꼴의 원자료 식별을 유지했다. 원 ZIP에는 별도 라이선스 파일이 없었으며 이 작업에서 제3자 자산에 새로운 라이선스를 부여하지 않았다.

## 제4본 구현본

웹 사용법, 교사용 활동, 개발 재현 절차, 시험 결과와 미구현 범위를 설명한다.

- [제4본 교정 PDF · 2026.09.14](docs/HMBR_Book4_Guhyeonbon_20260914.pdf)
- [제4본 DOCX · 2026.09.08 이전 원고](docs/HMBR_Book4_Guhyeonbon_20260908.docx)
- [제4본 텍스트 · 2026.09.08 이전 원고](docs/HMBR_Book4_Guhyeonbon_20260908.md)

최초 공개 코드 커밋은 `1e3164ce706ad7397a7cd660e0f15f11be7e1ed7`이다. 현재 웹앱은 [GitHub Pages](https://ivanpark.github.io/hmbr/)에서 제공하며, 배포 결과는 [Actions](https://github.com/ivanpark/hmbr/actions/workflows/pages.yml)에서 확인할 수 있다.

