# SOURCE AUDIT · 웹앱 2026-09-08

## 확인한 원자료

1. **hmbr-web-v2.0(2).zip:** 20개 파일 목록을 확인하고 경로 안전성을 검사하여 별도 참고 디렉터리에 풀었다. README, HTML·CSS, app·engine·map·dict·render·connected 모듈, 조음 안내 데이터 일부, 규격 적합성 시험을 읽었다. 기존 네 시험 파일도 실행했다. 이 ZIP에는 `webapp/`의 원 등록부 JSON이 없어 해당 생성 과정을 재실행하지 않았다.
2. **제3본 46쪽 개정 초안:** §3의 구조형, §4의 자음·모음 등록부, §5·6의 직렬화 원칙, §7의 예제 25건, 부록 A의 복합 음절핵, 부록 B의 기대 판정을 대조했다. 확인한 표는 `data/book3-tables.json`과 `tests/book3-vectors.json`에 남겼다.
3. **제1·2본 교정본:** 이전 작업에서 교정·검수한 제1본 36쪽, 제2본 59쪽을 그대로 수록했다. 이번 웹앱 작업에서 책의 본문을 다시 수정하지 않았다. flat 예시는 제2본 27쪽 §9.3을 참조한다.
4. **GitHub 공식 문서:** Pages 게시 설정과 사용자 지정 workflow 문서를 확인했다. GitHub 연결 완료는 확인되었으나 이번 실행에 저장소 읽기·쓰기 기능이 제공되지 않아 현재 트리·브랜치·코드·배포 상태는 확인하지 못했다.

## 확인한 차이와 처리

| 기존 코드 | 확인된 차이 | 새 구현 |
| --- | --- | --- |
| engine.js의 LN_CLUSTER와 모음 사이 /l/ 분기 | ㄹ을 종성·초성에 중복 배치 | 입력 토큰을 한 번만 소비 |
| map.js의 복모음 tail 처리 | 모음 요소 사이에 ㅇ 삽입 | 같은 음절핵의 V 배열 |
| engine.js의 lone·codaOf | 채움문자와 초성 대체로 미정값을 출력 | 미배당 위치형은 `unavailable` |
| SUPPLEMENT /ɝ/ | 임시 모음값 사용 | 원문·토큰 보존, 분석 미결 |
| 기존 기대값의 /ʊ/ | U+116E 사용 | 제3본 U+118D 사용 |
| 기존 ts 보충값 | /tʃ/와 구별이 충분하지 않음 | 두 토큰의 종성 복합값 JV-TS |
| toDisplay의 KIT 접기 | U+119D를 U+1175로 치환 | 새 앱은 표시에서도 다른 모음으로 접지 않음 |

## 원자료 사실과 이번 구현의 선택

- 문서의 음가·위치형 표와 미결 지위를 적용했다.
- 음절 경계의 자동 추정, `linear-elements-v1` 표시, UI와 JSON 다운로드는 이번 앱의 구현 선택이다. 저자의 새 최종 규칙으로 표시하지 않았다.
- 사전의 모든 IPA를 전수 교정하지 않았다. 문서에 있는 예시는 출처를 명시하여 우선 조회하고, 나머지는 원 사전과 검수 전 상태를 함께 전달한다.
- 기존 `legacy/` 엔진과 기존 시험 기대값은 보존했다. 구버전 안내 배너와 공용 사전·글꼴을 가리키는 상대 경로만 바꾸었다. 기본 UI의 제3본 적합성 시험과 구버전 시험은 별개다.

## 배포 근거

- [GitHub Pages 게시 원본 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [사용자 지정 GitHub Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

이 문서는 원격 게시 성공을 주장하지 않는다. 실제 게시 결과는 대상 저장소의 커밋·workflow·Pages 주소로 확인해야 한다.
