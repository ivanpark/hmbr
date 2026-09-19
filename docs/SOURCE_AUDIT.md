# SOURCE AUDIT · 문서와 웹앱 2026-09-16

## 판본 계보

| 대상 | 기준 자료 | 2026-09-16 처리 | 편집 원본 상태 |
| --- | --- | --- | --- |
| 제1본 선언본 | 2026-09-08 제출용 PDF와 2026-09-14 교정 작업파일 | 검증된 교정 영역을 같은 위치에 다시 적용하고 글꼴을 통일 | 최신 DOCX 미확보; PDF가 출판 기준본 |
| 제2본 해례본 | 2026-09-08 제출용 PDF와 2026-09-14 교정 작업파일 | 검증된 교정 영역을 같은 위치에 다시 적용하고 글꼴을 통일 | 최신 DOCX 미확보; PDF가 출판 기준본 |
| 제3본 전산본 | 46쪽 DOCX 편집 원본 | 법적 한정 문구와 §21 전수조사 근거를 원본에서 수정 후 PDF 재출력 | `HMBR_Book3_Jeonsanbon_20260916.docx` |
| 제4본 구현본 | 23쪽 DOCX 편집 원본과 현재 저장소 | 표시 프로파일·시험·배포·출처 감사 내용을 원본에서 수정 후 PDF 재출력 | `HMBR_Book4_Guhyeonbon_20260916.docx`와 `.md` |
| 웹앱 | 사용자 제공 v2.0 ZIP, 제2·3본, 현재 저장소 | 제3본과 충돌하던 변환 규칙을 고치고 `linear-trial-v2` 표시를 적용 | Git 저장소 소스 |

제1·2본은 최신 편집 원본이 없으므로 ‘원본에서 다시 내보낸 PDF’라고 주장하지 않는다. 두 파일은 기준 PDF 위의 확인된 교정 영역을 교체한 출판본이다. 제3·4본은 DOCX 원본을 직접 수정해 다시 내보냈다.

## 이번 편집 판정

- 제3본 §20.1은 “정보교환 프로파일 안에서는 완전하게 표현할 길이 없다”는 기술적 사실을 유지하되, 그것이 곧 법적 금지는 아니며 실제 구속력·기관별 채택·현행 국문판 적용은 별도 확인 대상이라고 한정했다.
- 제3본 §21은 `tools/cluster_census.mjs`로 재현한 전수조사 수치를 본문 근거로 복원했다. 종성 `/t+s/` 한 종은 `compound_ts`로 따로 세어 소계 차이를 설명한다.
- 제4본은 현재 표시 규칙(`linear-trial-v2`), 종성 `/s/`·`/t+s/` 독립 표시, 270개 시험, 검사·빌드·전수조사 및 Pages 배포 근거를 반영했다.

## 재현·검증 근거

- `node --test tests/*.test.mjs`: 270/270 통과
- `node tools/check.mjs`: 로컬 링크와 자산 53개 검사 통과
- `node tools/build.mjs`: `dist/` 빌드 통과
- `node tools/cluster_census.mjs`: 제3본 §21 수치 재현
  - RP 어두 207종: 등록 16, 미등록 190, 무배당 1
  - RP 어말 447종: 등록 38, 미등록 326, 무배당 82, `compound_ts` 1
  - GA 어두 123종: 등록 11, 미등록 112
  - GA 어말 303종: 등록 31, 미등록 208, 무배당 63, `compound_ts` 1
  - 신규군 RP 516종, GA 320종; 상위 60종 누적 90.4%, 91.8%
- GitHub `main` 기준 확인 커밋: `f049e24da7c34614a2129946071c4094c5f0964`
- 확인한 Pages workflow 성공 실행: `35074663177`

커밋과 실행 번호는 2026-09-16 문서 편집 시점의 선행 웹앱 상태를 가리킨다. 이 판의 최종 게시 커밋과 배포 실행은 GitHub 이력에서 별도로 확인한다.

## 공개 범위와 한계

- 문서에 실린 예시는 `data/examples.json`에서 우선 조회한다. 일반 단어는 제공 사전 원문과 검수 상태를 함께 표시한다.
- 사전 전체 IPA를 사람이 전수 교정한 것은 아니다. GA 사전의 RP형 전사 등 알려진 한계는 `data/SOURCES.md`에 남겼다.
- 제3본의 표준·법률 관련 설명은 기술적 상호운용성 분석이다. 실제 규범의 구속력과 적용 여부를 대신 판정하지 않는다.
- `legacy/`는 구버전 비교용이며 현재 제3본 적합성 결과와 구별한다.

## 배포 근거

- [GitHub Pages 게시 원본 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [사용자 지정 GitHub Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

공개 사이트는 `https://ivanpark.github.io/hmbr/`, 배포 이력은 저장소의 `pages.yml` Actions에서 확인한다.

## 2026-09-17 저자 결정에 따른 후속 감사

2026-09-16 제1–4본 PDF의 전체 텍스트, 제3·4본 DOCX, 제4본 Markdown과 앱 표시·렌더링 코드를 열어 뒤 모음·무음 초성·강세 표시 관련 문언을 대조했다. 제1본은 해당 수정이 없으며 제2–4본을 개정했다. 제2본은 최신 DOCX 없이 기존 PDF를 수정했고 제3·4본은 DOCX에서 다시 내보냈다. PDF의 옛한글 문자 추출 한계와 벡터 보존 방식, 정확한 수정·검증 범위는 [9월 17일 수정 내역](HMBR_Corrections_20260917.md)에 기록했다.
