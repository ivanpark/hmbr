# Connected speech · 2026-10-12 시범 구현

두 단어 이상을 변환하면 연결 후보와 기본 추천이 나타난다. 처음에는 모두 OFF다. 사용자가 각 후보를 개별 선택하거나 **추천대로 적용**을 누른다. **모두 해제**하면 원형으로 돌아간다. 한 경계에 약형과 동화 등 여러 현상이 있으면 각각 선택한다.

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

**원형 자모열 복사**는 원형만 복사한다. **전체 기록 저장**은 기존 레코드 외에 `connected_speech`를 추가한다. 버전, RP/GA, 속도, 강조·쉼, 후보, 적용 ID, 원형/변경 IPA, 파생 레코드를 보존한다. 단어 하나인 경우 이 추가 필드는 없다. 입력이나 발음 기준을 바꾸면 이전 선택을 폐기한다.

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
