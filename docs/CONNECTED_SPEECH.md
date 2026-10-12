# Connected speech · 2026-10-12 시범 구현

구·문장을 입력하고 별도의 **연음화 / Speech connector** 버튼을 누르면 원형 변환과 함께 연결 후보·추천 패널을 연다. **훈민바름으로 보기**는 원형만 보여 준다. 처음에는 모두 OFF다. 사용자가 각 후보를 개별 선택하거나 **추천대로 적용**을 누른다. **모두 해제**하면 원형으로 돌아간다. 한 경계에 약형과 동화 등 여러 현상이 있으면 각각 선택한다.

## 추천 정책

| 현상 | 지원 범위 | 기본 추천 |
| --- | --- | --- |
| 자음–모음 연결 | 끝 자음 다음에 시작 모음 | 강조·쉼이 없을 때 |
| RP linking r | r/re로 끝나는 철자와 호환되는 끝 모음, 다음 모음 | 강조·쉼이 없을 때, RP만 |
| 약형 | a, an, and, of, to, the, can | 보통·빠른 회화, 다음 단어가 있고 강조·쉼이 없을 때 |
| n → m 동화 | n 다음 p/b/m | 빠른 회화, 양쪽 단어에 강조와 경계에 쉼이 없을 때 |
| t/d 탈락 | 자음군의 마지막 t/d 다음 자음, h/j 제외 | 빠른 회화, 양쪽 단어에 강조와 경계에 쉼이 없을 때 |

약형 to /tə/와 the /ðə/는 다음 단어가 자음으로 시작할 때만 제안한다. can은 조동사 용법을 전제하므로 명사·일반동사라면 사용자가 OFF로 유지한다. 품사와 문장 의미를 자동 판별하지 않는다. 현재 추천은 문맥의 자연스러움을 보장하는 모델이 아니라 사용자가 조절하는 연습용 규칙이다. 이 속도별 정책과 강조 보호는 아래 자료에서 그대로 옮긴 규칙이 아닌 앱의 편집 결정이다.

문장부호에 따른 쉼은 기본 설정으로 가져오며 단어별 설정에서 바꿀 수 있다. 강조 보호는 약형·동화·탈락을 막고, 단순 자음–모음 연결과 linking r은 추천에서 제외하되 수동 선택은 허용한다. 쉼은 해당 경계의 연결을 차단한다. 말하기 속도를 바꾸면 추천이 갱신되며 이미 한 수동 선택은 유지된다. **추천대로 적용**은 현재 설정의 추천으로 선택을 교체한다.

## 표기와 보존

원형 레코드는 바꾸지 않는다. `js/connected.js`는 약형을 먼저 적용한 뒤 경계 후보를 계산하고, 선택으로 음소가 달라진 단어만 기존 엔진으로 다시 변환한다. 연결 부호 `‿`, 쉼 `|`는 연습 표시이며 원형 자모열에 삽입하지 않는다. 기본 엔진의 조자, 표시 비율, 미배당 처리 규칙을 공유한다.

원형 IPA와 선택한 흐름 IPA는 엔진의 정규화된 표기이며 음절 점을 포함할 수 있다. 훈민바름은 단어별 조자와 강세를 유지한다. 연결 표시가 단어 경계 전체를 재음절화했다는 뜻은 아니다. 기존 원형 결과와 해례 설명은 그대로 유지하며 각 연결 카드에는 별도의 조음 이동 설명을 제공한다.

**원형 자모열 복사**는 원형만 복사한다. **전체 기록 저장**은 연음화 패널을 열었을 때 기존 레코드 외에 `connected_speech`를 추가한다. 버전, RP/GA, 속도, 강조·쉼, 후보, 적용 ID, 원형/변경 IPA, 파생 레코드를 보존한다. GA 단어 하나라도 t 후보가 있으면 이 추가 필드를 제공한다. 입력이나 발음 기준을 바꾸면 이전 선택을 폐기한다.

## 한계

- 일반 사전에는 미검수 항목이 남아 있다. 추천은 입력 IPA의 정확성을 대신 검증하지 않는다. 미결 단어가 닿는 경계에는 제안하지 않는다.
- IPA 직접 입력에는 영어 철자가 없으므로 약형과 linking r을 추정하지 않는다.
- 모음 사이 j/w와 intrusive r, 미국식 flapping, 문장 억양, 강세 재배치, 음성 합성은 지원하지 않는다.
- 동화와 탈락의 모든 연쇄·변이를 생성하는 음운 모델이 아니다. 회화의 유일한 정답을 제공하지 않는다.

## SOURCE AUDIT

2026-10-12 다음 공개 자료의 본문·문자 IPA를 확인했다. 오디오를 청취·검증하지 않았다.

- [British Council · Connected speech 1](https://www.teachingenglish.org.uk/professional-development/teachers/knowing-subject/connected-speech-part-1): 기능어 약형과 강조에 따른 선택.
- [British Council · Connected speech 2](https://www.teachingenglish.org.uk/professional-development/teachers/knowing-subject/connected-speech-part-2): 자음–모음 연결과 자음군 t/d 탈락.
- [British Council · lesson plan PDF](https://www.britishcouncil.org.br/sites/default/files/lesson_plan_-_eng.pdf): ten men 등 조음 위치 동화의 예시.
- [Collins · linking r](https://www.collinsdictionary.com/dictionary/english/linking-r): 비권설 발음에서 철자 r과 다음 모음 사이의 연결.

예문을 점검하며 발견한 기존 사전 오류만 `data/ipa-corrections.json`에서 보완했다. RP [it](https://www.collinsdictionary.com/dictionary/english/it) /ɪt/, [ten](https://www.collinsdictionary.com/dictionary/english/ten) /tɛn/, [next](https://www.collinsdictionary.com/dictionary/english/next) /nɛkst/는 Collins와 대조했다. GA 조동사 [can](https://www.oxfordlearnersdictionaries.com/definition/english/can1)의 강형 /kæn/은 Oxford와 대조했다. 원래 IPA, 참조 IPA, 날짜와 단일 항목 검토 범위를 함께 보존했다. Cambridge 직접 열기는 접근 오류로 본문 확인에 실패했으므로 이 교정의 본문 근거로 사용하지 않았다. 사전 전수 검수는 아니다.

## 검증

`tests/connected.test.mjs`는 개별 연결 선택과 해제, 원형 불변, 약형의 실제 자모 변경, 문장부호 쉼, 강조 보호, 속도별 추천, 동화·탈락 조건, RP/GA linking r 차이, 미결·IPA 입력, 규칙 조합을 검사한다. `tests/dict.test.mjs`는 교정 항목과 예문 네 개의 RP/GA 변환, 분리된 문장부호 보존을 검사한다.

## GA t 변이 확장 · 2026-10-12

이 절이 위 1차 구현의 범위를 갱신한다. 연음화 버튼으로 패널을 열었을 때만 JSON에 연습층을 추가한다. GA 단어 하나라도 t 후보가 있으면 패널과 내보내기 연습층이 활성화된다. 표면 IPA는 `[ ]` 안에 표시한다. 이 표기는 선택한 현상의 부분 전사이며 완전한 운율·재음절화 분석이 아니다.

| 선택 | 후보 조건 | 추천 정책 |
| --- | --- | --- |
| n 뒤 t 탈락 | 단어 안의 /nt/ 뒤 무강세 모음, 어말 /tən/ 제외 | 빠른 회화, 강조 없을 때 |
| 성문음화 [ʔ] | 모음·공명음 뒤 t, 다음 자음 또는 쉼 | m/n/l 앞은 보통·빠른 회화, 다른 자음 앞은 빠른 회화 |
| button형 [ʔn̩] | 무강세 어말 /tən/ | 보통·빠른 회화, 강조 없을 때 |
| 미파열 [t̚] | 어말 t 뒤 자음 또는 쉼 | 수동 선택만 |

쉼 앞 [ʔ]도 수동 선택만 제공한다. 강조는 t 탈락을 차단하고 성문음화·미파열의 수동 비교는 허용한다. 같은 t의 실현은 한 그룹으로 묶어 마지막 선택만 적용한다. 빠른 회화에서 자음군 탈락과 성문음화가 경쟁하면 성문음화를 기본 추천한다. 추천 속도와 우선순위는 앱 정책이다. 실제 성문 강화와 미파열은 공존할 수 있으며 UI의 단일 선택은 그 가능성을 부정하지 않는다. 자동 [ɾ] 생성은 아직 없다.

`js/t-variants.js`는 원형 토큰 ID에 묶인 `surface_annotations`를 생성한다. 각 항목은 `word_index, token_ids, underlying_ipa, surface_ipa, feature_id, environment, source`를 가진다. button은 원형 t·ə·n 세 토큰을 가리키며 성문음화와 모음 생략·n 음절성을 함께 표시한다. `surface_records`는 표면 IPA, 훈민바름의 참조 IPA, `display_status`와 설명을 담는다. 미결 [ʔ]/[n̩]은 새 자모로 만들지 않고 훈민바름을 **원형 참조**로 표시한다. winter의 탈락처럼 지원 음소만 남으면 파생 레코드를 생성한다. 기존 Broad 원형은 모든 경우 보존한다. 기존 연결 규칙 모두에 토큰 수준 주석을 소급 구현한 것은 아니다.

### 추가 SOURCE AUDIT

문자 본문·IPA를 확인했다. 오디오 청취는 하지 않았다. `winter`를 언제나 단순 t 삭제라고 분석하지 않는다. n/t 동화와 비음 탄설음 등이 가능하므로 ∅는 비교용 단순화다.

- [Seyfarth & Garellek 2020](https://pages.ucsd.edu/~mgarellek/files/Seyfarth_Garellek_2020_LabPhon.pdf): 성문 대치와 강화, 미국 영어 coda t의 변이. 중앙 오하이오 Buckeye 40명 표본으로 모든 GA 화자의 빈도를 추론하지 않는다.
- [Pronuncian t 실현](https://pronuncian.com/when-t-doesnt-sound-like-t/): 모음·공명음과 비음·l 주변 성문음화, nt의 선택적 생략, 탄설음 대비. 이 자료의 quick d 기호와 본 앱의 [ɾ] 표기를 구별했다.
- [Pronuncian 경계 연결](https://pronuncian.com/assimilation-linking-t-as-glottal-stop): 단어 경계의 자음 앞 t 성문음화 예시.
- [Baruch College](https://tfcs.baruch.cuny.edu/deletion/): 자음 사이 t/d 탈락 및 h 앞 예외.
- [Mark Liberman의 해설](https://languagelog.ldc.upenn.edu/nll/?p=62989): nt의 flapping·동화와 음절성 n 앞의 성문음화 구별.
- [EdUHK 음성학 자료 §3.2](https://corpus.eduhk.hk/english_pronunciation/index.php/3-2-acoustic-aspects-of-consonants/): 치경 폐쇄와 음절말 미파열. [국제음성학회 도표](https://www.internationalphoneticassociation.org/IPAcharts/IPA_charts_EI/IPA_charts_EI.html)의 ̚는 가청 파열 없음을 표시한다.
- Collins [button](https://www.collinsdictionary.com/dictionary/english/button), [winter](https://www.collinsdictionary.com/dictionary/english/winter): 미국식 원형 대조. GA winter의 빠진 r만 단일 항목으로 교정하고 앱 관례상 /ɹ/로 정규화했다.

LabPhon의 Davidson 논문 페이지는 접근 보호로, KU 자료와 UCLA 경로는 추출·접근 오류로 본문 근거에 사용하지 못했다. Manitoba 미파열 페이지도 열리지 않았다. 같은 접근을 반복 우회하지 않았으며 위에서 읽은 자료로 범위를 한정했다. 일반 IPA 사전 전체의 발음·권리 검수와 교육 효과 평가를 완료한 것은 아니다.

`tests/t-variants.test.mjs`의 6개 시험은 원형 불변과 토큰 주석, 강세 조건, 단일 단어, 충돌 해소, 쉼 앞 선택, 여러 단어 조합을 검증한다. 전체 307개 시험이 통과했다. **TTS는 다음 단계이며 이번 판에는 음성 재생을 구현하지 않았다.** 철자 읽기와 선택된 표면형 재현을 구분해 검증해야 한다.

복합 입력에서는 /tʃ/와 뒤의 /t/를 토큰 순서로 구별한다. button형 [ʔn̩] 선택은 마지막 n까지 포함하므로, 같은 n의 경계 동화 n → m은 해당 선택을 끈 뒤 비교한다. 지원하지 않는 복합 실현을 두 토글의 적용 결과라고 표시하지 않는다.
