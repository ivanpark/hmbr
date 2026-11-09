"""Rule-based extraction of artists, galleries, auction houses, prices and categories for each post.

Usage: python3 -I research/collector_s/tools/extract_entities.py
Writes into data/posts.json (fields artists, galleries, auction_houses, prices, categories,
market_related, summary when empty) and data/entity_counts.json. Results are keyword matches;
the per-artist evaluation table is written by reading the matched sentences.
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUESTED = ["박서보", "김환기", "하종현", "윤형근", "전광영", "서도호", "이배"]
KOREAN = REQUESTED + """이우환 김창열 정상화 이건용 이강소 박수근 이중섭 천경자 유영국 장욱진 권진규 백남준 서세옥 김기창 정창섭 최명영 권영우
이승조 곽인식 남관 김구림 성능경 이승택 김종학 오치균 이대원 김흥수 박영하 사석원 이수경 홍경택 노상균 김동유 안성하 이동기 정연두 최정화
이불 양혜규 김수자 강서경 김윤신 정영주 우국원 김선우 문형태 하태임 장콸 무나씨 김희수 이예린 성률 구지윤 배헤윰 양현모 윤협 남궁솔
박세빈 이청준 신교명 이안온 전현선 정성원 김지구 김시몽 최혜지 이목하 정수정 임수진 서안나 손채은 윤형택 문영서 최욱경 오수환 이정지
김택상 장승택 도상봉 황염수 김환기 이성자 김태호 신성희 박현기 김정숙 이준 정영렬 박고석 변종하 임직순 최영림 김보희 지근욱 이희준 범진용
박광수 민정기 임옥상 신학철 오윤 고영훈 강익중 이세현 김홍주 박진아 정희민 이우성 김민정 이진주 차명희 홍순명 이교준 김현식 이용덕""".split()
FOREIGN = """쿠사마 야요이 요시토모 나라 무라카미 다카시 무라카미 타카시 데이비드 호크니 앤디 워홀 바스키아 조지 콘도 알렉스 카츠 줄리안 오피
카우스 니콜라스 파티 아야코 록카쿠 록카쿠 에디 마르티네즈 우고 론디노네 마크 로스코 게르하르트 리히터 데미안 허스트 제프 쿤스 키스 해링
뱅크시 피카소 마티스 모네 샤갈 미로 칼더 루이스 부르주아 아니쉬 카푸어 올라퍼 엘리아슨 가브리엘 오로즈코 장-미셸 오토니엘 리처드 프린스
도널드 저드 솔 르윗 이브 클라인 로버트 인디애나 장 뒤뷔페 요셉 보이스 신디 셔먼 앤서니 곰리 토마스 사라세노 제니 홀저 사이 트웜블리
크리스찬 히다카 히로시 스기모토 이토 준지 무라카미 레이크 플로렌틴 호프만 KAWS""".split("\n")
FOREIGN = [x.strip() for line in FOREIGN for x in re.split(r"\s{2,}|(?<=[가-힣A-Z])\s(?=[가-힣A-Z]{2,}\s[가-힣A-Z])", line) if x.strip()]
FOREIGN_NAMES = ["쿠사마 야요이", "쿠사마", "요시토모 나라", "나라 요시토모", "무라카미 다카시", "무라카미 타카시", "데이비드 호크니", "호크니", "앤디 워홀",
                 "워홀", "바스키아", "조지 콘도", "알렉스 카츠", "줄리안 오피", "카우스", "KAWS", "니콜라스 파티", "아야코 록카쿠", "록카쿠", "에디 마르티네즈",
                 "우고 론디노네", "마크 로스코", "로스코", "게르하르트 리히터", "리히터", "데미안 허스트", "제프 쿤스", "키스 해링", "뱅크시", "피카소",
                 "마티스", "모네", "샤갈", "칼더", "루이스 부르주아", "아니쉬 카푸어", "올라퍼 엘리아슨", "장-미셸 오토니엘", "오토니엘", "리처드 프린스",
                 "이브 클라인", "로버트 인디애나", "사이 트웜블리", "크리스찬 히다카", "히로시 스기모토", "앤서니 곰리", "아드리안 게니", "다니엘 아샴",
                 "안젤름 키퍼", "로버트 나바", "하비에르 카예하", "카틀린 레크", "게오르그 바젤리츠", "바젤리츠"]
CANON = {"쿠사마": "쿠사마 야요이", "나라 요시토모": "요시토모 나라", "무라카미 타카시": "무라카미 다카시", "호크니": "데이비드 호크니", "워홀": "앤디 워홀",
         "KAWS": "카우스", "록카쿠": "아야코 록카쿠", "로스코": "마크 로스코", "리히터": "게르하르트 리히터", "오토니엘": "장-미셸 오토니엘", "바젤리츠": "게오르그 바젤리츠"}
SHORT_OK = r"(?=[\s,.'\"’”)(·/에의은는이가과와을를도만님작화씨]|$)"

GALLERIES = ["국제갤러리", "갤러리현대", "PKM", "학고재", "가나아트", "리안갤러리", "조현화랑", "아라리오", "페이스", "타데우스 로팍", "리만머핀", "페로탕",
             "화이트큐브", "글래드스톤", "에스더쉬퍼", "쾨닉", "디스위켄드룸", "휘슬", "P21", "띠오", "우손갤러리", "김리아", "갤러리바톤", "바라캇", "선화랑",
             "노화랑", "표갤러리", "아트사이드", "원앤제이", "실린더", "상업화랑", "BHAK", "가고시안", "하우저앤워스", "데이비드 즈워너", "탕 컨템포러리",
             "갤러리조선", "스페이스K", "송은", "프람프트", "더페이지", "이유진갤러리", "갤러리2", "다다프로젝트", "갤러리 SP", "파운드리서울", "두아르트스퀘이라",
             "알민레쉬", "에브리데이몬데이", "지갤러리", "공근혜갤러리", "갤러리기체", "아뜰리에 아키", "나이트갤러리", "갤러리마크", "갤러리 마크"]
AUCTIONS = {"서울옥션": "서울옥션", "케이옥션": "케이옥션", "K옥션": "케이옥션", "크리스티": "크리스티", "Christie": "크리스티", "소더비": "소더비",
            "Sotheby": "소더비", "필립스": "필립스", "Phillips": "필립스", "마이아트옥션": "마이아트옥션", "에이옥션": "에이옥션", "아이옥션": "아이옥션",
            "칸옥션": "칸옥션", "라이즈아트": "라이즈아트", "헤리티지": "헤리티지", "본햄스": "본햄스", "폴리옥션": "폴리옥션", "블루칩옥션": "블루칩옥션"}
FAIRS = ["프리즈", "키아프", "아트부산", "화랑미술제", "아모리쇼", "아트바젤", "아트 바젤", "대구아트페어", "아트페어"]
PRICE = re.compile(r"(?:(?:USD|HKD|HK\$|US\$|\$|£|€|GBP|EUR)\s?\d[\d,\.]*\s?(?:만|억|M|K|m|k|million)?|\d[\d,\.]*\s?(?:억\s?\d{0,4}\s?(?:천)?만?\s?원?|천만\s?원?|백만\s?원?|만\s?원|원|만 원|억원|달러|홍콩달러|파운드|유로)|호당\s?\d[\d,\.]*\s?(?:만|억)?\s?원?|\d{1,3}\s?호(?=[\s가-힣]|$))")
CATS = {
    "작품 구매 과정": r"구매|구입|소장|샀|사왔|입양|컬렉팅|웨이팅|대기|문의|결제|액자|배송|예약|홀드|분할|할부|첫 작품|사고 싶|살까|들였",
    "가격과 거래 관행": r"가격|호당|할인|수수료|낙찰|추정가|시작가|재판매|리세일|되팔|프라이머리|세컨더리|1차\s?시장|2차\s?시장|세금|양도세|원\b|만원|억|정가|DC|유찰|응찰",
    "작가 및 갤러리": r"작가|갤러리|화랑|전시|개인전|전속|미술관|레지던시|비엔날레",
    "컬렉터 네트워크": r"컬렉터들|컬렉터 분|컬렉터분|스친|모임|커뮤니티|단톡|딜러|지인|교류|VIP|네트워크|아트어드바이저|어드바이저|소개받|추천받",
    "시장 동향": r"시장|블루칩|낙찰률|거래량|침체|하락|상승|호황|불황|경기|금리|트렌드|수요|공급|거품|조정|회복|반등|매출|거래액",
}
TOPIC_CAT = {"미술시장": "시장 동향", "옥션": "가격과 거래 관행", "컬렉팅": "작품 구매 과정", "컬렉션": "작품 구매 과정", "컬렉터": "컬렉터 네트워크",
             "전시추천": "작가 및 갤러리", "투자": "시장 동향", "아트페어": "작가 및 갤러리", "아모리쇼": "작가 및 갤러리"}


def find_artists(t):
    found = []
    for n in KOREAN:
        pat = re.escape(n) + (SHORT_OK if len(n) <= 2 else "")
        if re.search(pat, t):
            found.append(n)
    for n in FOREIGN_NAMES:
        if n in t:
            found.append(CANON.get(n, n))
    return sorted(set(found), key=lambda x: t.find(x.split()[0]) if x.split()[0] in t else 9999)


def main():
    path = ROOT / "data" / "posts.json"
    d = json.loads(path.read_text(encoding="utf-8"))
    counts = defaultdict(Counter)
    for p in d["posts"]:
        if p.get("source") == "검색 색인" and p.get("artists"):
            continue  # hand-annotated search-index records stay as written
        t = p.get("text", "") or ""
        tt = (p.get("topic", "") or "") + "\n" + t
        p["artists"] = find_artists(tt)
        p["galleries"] = sorted({g for g in GALLERIES if g in t})
        p["auction_houses"] = sorted({v for k, v in AUCTIONS.items() if k in t})
        p["fairs"] = sorted({f for f in FAIRS if f in tt})
        p["prices"] = list(dict.fromkeys(m.group(0).strip() for m in PRICE.finditer(t)))[:12]
        cats = [c for c, rx in CATS.items() if re.search(rx, t)]
        if p.get("topic") in TOPIC_CAT and TOPIC_CAT[p["topic"]] not in cats:
            cats.append(TOPIC_CAT[p["topic"]])
        p["categories"] = [c for c in CATS if c in cats]
        p["market_related"] = bool(set(p["categories"]) & {"작품 구매 과정", "가격과 거래 관행", "컬렉터 네트워크", "시장 동향"}) or bool(p["artists"] or p["galleries"] or p["auction_houses"])
        if not p.get("summary") or p["summary"].startswith("(자동)"):
            first = re.split(r"(?<=[.!?。])\s|\n", t.strip())[0] if t.strip() else ""
            p["summary"] = "(자동·첫 문장) " + (first[:120] + ("…" if len(first) > 120 else ""))
        for a in p["artists"]:
            counts["artists"][a] += 1
        for g in p["galleries"]:
            counts["galleries"][g] += 1
        for a in p["auction_houses"]:
            counts["auction_houses"][a] += 1
        for f in p["fairs"]:
            counts["fairs"][f] += 1
        for c in p["categories"]:
            counts["categories"][c] += 1
    path.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    out = {k: v.most_common() for k, v in counts.items()}
    (ROOT / "data" / "entity_counts.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("market_related:", sum(1 for p in d["posts"] if p["market_related"]), "/", len(d["posts"]))
    for k in ("categories", "auction_houses", "fairs"):
        print(k, out.get(k))
    print("galleries", out.get("galleries", [])[:30])
    print("artists", out.get("artists", [])[:80])
    print("requested:", {a: counts["artists"][a] for a in REQUESTED})


if __name__ == "__main__":
    main()
