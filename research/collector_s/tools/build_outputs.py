"""Build the post index workbook and the per-post text bundle from data/*.json.

Run from anywhere:  python3 -I research/collector_s/tools/build_outputs.py
Outputs (relative to research/collector_s/):
  collector_s_index.xlsx
  bundle/posts/<KST date>_<shortcode>.md
  bundle/README.md
"""
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from shortcode import KST, created_at, media_id  # noqa: E402

CATEGORIES = ["작품 구매 과정", "가격과 거래 관행", "작가 및 갤러리", "컬렉터 네트워크", "시장 동향"]
HEADER_FILL = PatternFill("solid", fgColor="DDE3EA")
WRAP = Alignment(wrap_text=True, vertical="top")


def load(name):
    return json.loads((ROOT / "data" / name).read_text(encoding="utf-8"))


def enrich(posts):
    for p in posts:
        t = created_at(p["shortcode"])
        if p.get("datetime_utc_page"):
            t = datetime.fromisoformat(p["datetime_utc_page"].replace("Z", "+00:00"))
            p["time_source"] = "페이지 time 요소"
        else:
            p["time_source"] = "shortcode 디코딩 추정"
        p["media_id"] = str(media_id(p["shortcode"]))
        p["created_utc"] = t.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        p["created_kst"] = t.astimezone(KST).strftime("%Y-%m-%d %H:%M:%S")
        p["date_kst"] = t.astimezone(KST).strftime("%Y-%m-%d")
        p["month_kst"] = t.astimezone(KST).strftime("%Y-%m")
        p.setdefault("parent_text", "")
        p.setdefault("original_author", "")
        p.setdefault("source", "검색 색인")
    posts.sort(key=lambda p: p["created_kst"])
    return posts


def j(items):
    return "; ".join(items) if items else ""


def imgs(p):
    v = p["images"]
    if isinstance(v, str):
        return v
    if not v:
        return "없음"
    return "\n".join((i.get("file") or i.get("src", "")) + (f" ({i['status']})" if i.get("status") not in (None, "ok") else "") for i in v)


def sheet(wb, title, header, rows, widths, link_cols=()):
    ws = wb.create_sheet(title)
    ws.append(header)
    for c in ws[1]:
        c.font = Font(bold=True)
        c.fill = HEADER_FILL
        c.alignment = WRAP
    for r in rows:
        ws.append(r)
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = WRAP
        for col in link_cols:
            cell = row[col]
            if isinstance(cell.value, str) and cell.value.startswith("http"):
                cell.hyperlink = cell.value
                cell.font = Font(color="1F4E99", underline="single")
    ws.freeze_panes = "B2"
    ws.auto_filter.ref = ws.dimensions
    return ws


def post_row(p, n):
    return [
        n, p["created_kst"], p["type"], p["url"], p["parent_url"], p["text"], p["text_status"],
        p["summary"], j(p["categories"]), j(p["artists"]), j(p["works"]), j(p["galleries"]),
        j(p["prices"]), imgs(p), p["page_meta"], p["type_basis"],
        ", ".join(str(x) for x in p["found_by"]), p["created_utc"], p["media_id"],
        p["time_source"], p["source"], p["original_author"], p["parent_text"], p.get("topic", ""),
    ]


POST_HEADER = [
    "No", "게시일시(KST, ID 디코딩 추정)", "유형", "URL", "상위 글 URL", "본문", "본문 확보 상태",
    "요약", "분류", "언급 작가", "언급 작품", "언급 갤러리·장소", "언급 가격", "첨부 이미지",
    "페이지 메타(검색 요약)", "유형 판단 근거", "발견 질의 ID", "게시일시(UTC)", "미디어 ID",
    "시각 출처", "수집 출처", "재게시 원작성자", "상위 글 본문(앞부분)", "Threads 주제 태그",
]
POST_WIDTHS = [5, 20, 14, 46, 30, 70, 30, 50, 22, 28, 26, 22, 26, 30, 30, 30, 14, 22, 22, 16, 20, 18, 50, 14]


def build_workbook(meta, posts, clues, log, arts, lots):
    wb = Workbook()
    wb.remove(wb.active)
    acct = meta["account"]
    replies = [p for p in posts if "답글" in p["type"]]
    originals = [p for p in posts if p["type"].startswith("원글") or p["type"] in ("고정 글", "타래 이어진 글")]
    pinned = [p for p in posts if p["type"] == "고정 글"]
    reposts = [p for p in posts if p["type"] == "재게시물"]
    market = [p for p in posts if p["market_related"]]
    full_text = [p for p in posts if p["text_status"].startswith("전문")]
    first, last = posts[0]["created_kst"], posts[-1]["created_kst"]
    cap = load("capture_meta.json")["runs"] if (ROOT / "data" / "capture_meta.json").exists() else []
    img_list = [i for p in posts if isinstance(p["images"], list) for i in p["images"] if isinstance(i, dict)]
    img_ok = sum(1 for i in img_list if i.get("status") == "ok")
    if cap:
        opened = "성공: 사용자 브라우저(로그인 상태)에서 수집 스크립트 실행. " + "; ".join(
            f"{r['tab']} 탭 {r['total_seen']}개 확인, {r['steps']}구간, 끊긴 구간 {len(r['gap_steps'] or [])}곳, 종료 사유 {r['finish_reason']}" for r in cap)
        method = "브라우저 수집 파일 " + ", ".join(r["file"] for r in cap) + " + 검색엔진 색인 질의 36회"
        missing = "스크롤구간 시트의 끊긴 구간(있다면), 수집 종료 이후 새 글, 화면에 '더 보기'로 접힌 긴 본문(있다면)"
        pin_rep = f"고정 글 {len(pinned)}건, 재게시물 {len(reposts)}건"
        img_line = f"이미지 {len(img_list)}장 중 {img_ok}장 내려받음" + (f"(실패 {len(img_list) - img_ok}장, 접근기록 참조)" if len(img_list) != img_ok else "")
    else:
        opened = "실패: 세션 네트워크 정책이 www.threads.com 등을 차단(접근기록 시트)"
        method = "검색엔진 색인 질의 36회(수집구간로그 시트). Threads 피드 스크롤 수집은 하지 못함"
        missing = "프로필 피드 전체, 답글 탭, 확보 구간 밖과 각 구간 사이의 미색인 글, 모든 이미지, 상위 글 URL"
        pin_rep = "식별 불가(프로필 화면 미열람)"
        img_line = "0건(이미지 CDN 차단, 첨부 여부도 미확인)"

    summary_rows = [
        ["조사일", "2026-11-09(KST)"],
        ["대상", f"{acct['display_name']} (@{acct['handle']})  {acct['profile_url']}"],
        ["표시명·핸들 일치", acct["name_handle_match"]],
        ["프로필 열람", opened],
        ["프로필 상단 텍스트", acct.get("profile_header_text", "")[:600]],
        ["계정 전체 게시물 수", acct["total_posts"]],
        ["실제 확인한 게시물(URL 기준 중복 제거)", len(posts)],
        ["  원글(고정 글·타래 이어진 글 포함)", f"{len(originals)}건(그중 타래 이어진 글 {sum(1 for p in posts if p['type'] == '타래 이어진 글')}건, 타래 첫 글·단독 글 {len(originals) - sum(1 for p in posts if p['type'] == '타래 이어진 글')}건)"],
        ["  답글", len(replies)],
        ["  고정 글·재게시물", pin_rep],
        ["  미술시장 관련(규칙 기반 분류)", sum(1 for p in market)],
        ["  미술시장 관련 답글", sum(1 for p in replies if p["market_related"])],
        ["본문 확보", f"전문 {len(full_text)}건, 부분·없음 {len(posts) - len(full_text)}건"],
        ["이미지 확보", img_line],
        ["확인한 날짜 구간(KST)", f"{first} ~ {last}"],
        ["확인 방법", method],
        ["누락·접근 불가", missing],
        ["미확인 단서", f"{len(clues['clues'])}건(작성자 불명, 미확인단서 시트)"],
        ["경매 참고 로트", f"{len(lots['lots'])}건(V2 {sum(1 for l in lots['lots'] if l['verification']=='V2')}, V3 {sum(1 for l in lots['lots'] if l['verification']=='V3')}, V4 {sum(1 for l in lots['lots'] if l['verification']=='V4')}, 경매사 원자료 직접 열람 V1 0건)"],
    ]
    ws = sheet(wb, "요약", ["항목", "값"], summary_rows, [34, 110])

    sheet(wb, "게시물인덱스", POST_HEADER, [post_row(p, i) for i, p in enumerate(posts, 1)], POST_WIDTHS, link_cols=(3,))
    sheet(wb, "원글", POST_HEADER, [post_row(p, i) for i, p in enumerate(originals, 1)], POST_WIDTHS, link_cols=(3,))
    sheet(wb, "답글", POST_HEADER, [post_row(p, i) for i, p in enumerate(replies, 1)], POST_WIDTHS, link_cols=(3,))

    cat_rows = []
    for p in posts:
        cat_rows.append([p["created_kst"][:10], p["url"], p["type"]] + ["●" if c in p["categories"] else "" for c in CATEGORIES] + [j([c for c in p["categories"] if c not in CATEGORIES])])
    sheet(wb, "분류", ["게시일(KST)", "URL", "유형"] + CATEGORIES + ["기타"], cat_rows, [12, 46, 14, 14, 16, 14, 16, 12, 24], link_cols=(1,))

    art_rows = []
    for a in arts["artists"]:
        art_rows.append([
            a["artist"], "예" if a["requested"] else "아니오(게시물·추가)", a["cs_mentions"], a["cs_work_period"],
            a["cs_evaluation"], a["cs_basis"], a["cs_claim_type"], "\n".join(a["cs_urls"]),
            ", ".join(a["market_refs"]), a["market_summary"],
        ])
    sheet(wb, "작가별평가표", ["작가", "요청 명단", "컬렉터S 언급(확보분)", "평가 대상 작품·시기", "컬렉터S 평가",
                          "판단 근거", "주장 유형", "게시물 URL", "경매 참고 로트 ID", "시장 현황(외부 자료, 컬렉터S 판단 아님)"],
          art_rows, [24, 12, 14, 30, 40, 36, 18, 46, 18, 70], link_cols=(7,))

    if arts.get("other_artists"):
        oa_rows = [[o["artist"], o["mentions"], o["first_date"], o["last_date"], o["excerpt"], "\n".join(o["urls"])] for o in arts["other_artists"]]
        sheet(wb, "언급작가전체", ["작가", "언급 글 수", "첫 언급", "마지막 언급", "첫 언급 문장(자동 발췌)", "게시물 URL(최대 12)"],
              oa_rows, [20, 10, 12, 12, 70, 50], link_cols=(5,))
    if (ROOT / "data" / "claims.json").exists():
        cl = load("claims.json")["claims"]
        sheet(wb, "주장검증표", ["ID", "게시물 URL", "주장(요지)", "종류", "검증 결과", "근거·메모", "검증 출처"],
              [[c["id"], c["url"], c["claim"], c["kind"], c["result"], c["note"], c["source"]] for c in cl],
              [7, 46, 60, 14, 14, 60, 46], link_cols=(1, 6))

    lot_rows = []
    for l in lots["lots"]:
        lot_rows.append([
            l["id"], l["artist"], l["house"], l["location"], l["sale"], l["sale_date"], l["lot"], l["work"], l["year"],
            l["spec"], l["currency"], l["estimate"], l["starting_price"], l["hammer"], l["premium_inclusive"],
            l["price_basis"], l["verification"], l["conflict"], l["source_url"], "\n".join(l["extra_sources"]),
            l["linked_post"], l["image"],
        ])
    sheet(wb, "경매대조표", ["ID", "작가", "경매사", "장소", "세일", "경매일", "로트", "작품", "제작연도", "재료·크기", "통화",
                        "추정가", "시작가", "해머가(낙찰가, 수수료 별도)", "수수료 포함가", "가격 표기 근거", "검증 수준",
                        "충돌·주의", "출처 URL", "추가 출처", "연결 게시물", "경매 캡처·작품 사진"],
          lot_rows, [7, 9, 11, 8, 30, 16, 8, 26, 9, 24, 7, 26, 18, 26, 30, 26, 8, 26, 46, 40, 30, 12], link_cols=(18,))
    lv = wb.create_sheet("검증수준")
    lv.append(["코드", "의미"])
    for k, v in lots["verification_levels"].items():
        lv.append([k, v])
    lv.append(["", ""])
    lv.append(["가격 용어", "추정가: 경매사 사전 제시 범위 / 시작가: 국내 경매사가 공개하는 호가 시작점 / 해머가(낙찰가): 경매봉이 내려진 가격, 구매자 수수료 별도 / 수수료 포함가: 해머가+구매자 수수료(Phillips 'Sold for', Sotheby's 'Price realised', Christie's 'Price realised'가 여기에 해당)"])
    lv.column_dimensions["A"].width = 12
    lv.column_dimensions["B"].width = 120
    for row in lv.iter_rows():
        for c in row:
            c.alignment = WRAP

    clue_rows = [[c["id"], c["page_url"], c["page_attribution"], "원문 인용" if c["verbatim"] else "요약 의역", c["text"],
                  c["author"], c["why_uncertain"] + (" / 재확인: " + c["resolution_2026_11_09"] if c.get("resolution_2026_11_09") else ""), c["topic"], c["search_query_id"]] for c in clues["clues"]]
    for e in clues["excluded"]:
        clue_rows.append(["정정" if e["reason"].startswith("정정") else "제외", "", "", "", e["text"], "컬렉터S" if e["reason"].startswith("정정") else "타 계정으로 판단", e["reason"], "", ""])
    sheet(wb, "미확인단서", ["ID", "페이지 URL", "페이지 귀속", "문장 성격", "문장", "작성자", "불확실 이유", "주제", "검색 질의 ID"],
          clue_rows, [7, 46, 20, 12, 70, 14, 46, 30, 10], link_cols=(1,))

    by_month = defaultdict(list)
    for p in posts:
        by_month[p["month_kst"]].append(p)
    seg_rows = []
    y0, m0 = map(int, posts[0]["month_kst"].split("-"))
    months = []
    while (y0, m0) <= (2026, 11):
        months.append(f"{y0:04d}-{m0:02d}")
        y0, m0 = (y0 + 1, 1) if m0 == 12 else (y0, m0 + 1)
    for m in months:
        ps = by_month.get(m, [])
        seg_rows.append([m, len(ps), "\n".join(f"{p['created_kst']}  {p['type']}  {p['url']}" for p in ps),
                         "확보" if ps else ("0건(브라우저 수집 기준 해당 월 게시물 없음)" if cap else "0건: 게시물이 없었는지, 색인되지 않았는지 구분 불가")])
    seg_rows.append([f"{months[0]} 이전", 0, "", "브라우저 수집이 가장 오래된 글까지 도달했는지는 스크롤구간 시트의 종료 사유 참조" if cap else "미확인: 계정 개설 시점 미확인"])
    sheet(wb, "수집구간로그", ["구간(KST 월)", "확보 건수", "확보 게시물(게시일시·유형·URL)", "구간 판정"], seg_rows, [14, 10, 90, 50])
    if cap:
        st_rows = []
        for r in cap:
            prev = None
            for sgm in r["segments"]:
                overlap = "첫 구간" if prev is None else ("겹침 있음" if set(sgm["visible"]) & set(prev) else ("화면에 글 없음" if not sgm["visible"] or not prev else "끊김: 앞 구간과 겹치는 글 없음"))
                st_rows.append([r["file"], r["tab"], sgm["step"], len(sgm["visible"]), len(sgm["fresh"]), ", ".join(sgm["fresh"]), overlap])
                prev = sgm["visible"] or prev
        sheet(wb, "스크롤구간", ["수집 파일", "탭", "구간 번호", "화면에 있던 글 수", "새로 확보한 글 수", "새로 확보한 글(shortcode)", "앞 구간과 연속성"], st_rows, [34, 10, 8, 10, 10, 60, 26])

    q_rows = []
    for q in log["queries"]:
        q_rows.append([q["id"], q["q"], q["mode"], q["domains"], len(q["hits"]), ", ".join(q["hits"]), q.get("error", "")])
    sheet(wb, "검색질의로그", ["ID", "질의", "모드", "도메인 제한", "컬렉터S 결과 수", "결과 shortcode", "오류"], q_rows, [5, 60, 10, 22, 10, 40, 30])
    hit_counts = Counter(h for q in log["queries"] for h in q["hits"])
    sat = wb["검색질의로그"]
    sat.append([])
    sat.append(["", "포화도 점검: 질의 36회 중 컬렉터S 결과가 나온 질의 수 / 서로 다른 게시물 수",
                "", "", sum(1 for q in log["queries"] if q["hits"]), len(hit_counts)])
    sat.append(["", "게시물별 등장 횟수: " + ", ".join(f"{k} {v}회" for k, v in hit_counts.most_common())])

    a_rows = [[a["step"], a["target"], a["result"]] for a in log["access_attempts"]]
    a_rows += [[q["id"], q["q"] + (f" [{q['domains']}]" if q["domains"] else ""), q["result"]] for q in log["auction_queries"]]
    sheet(wb, "접근기록", ["단계·ID", "대상", "결과"], a_rows, [26, 80, 60])

    out = ROOT / "collector_s_index.xlsx"
    wb.save(out)
    return out


def build_bundle(posts, clues):
    out = ROOT / "bundle" / "posts"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.md"):
        old.unlink()
    clue_by_page = defaultdict(list)
    for c in clues["clues"]:
        clue_by_page[c["page_url"]].append(c)
    index_lines = []
    for p in posts:
        name = f"{p['date_kst']}_{p['shortcode']}.md"
        lines = [
            f"# {p['date_kst']} · {p['shortcode']}",
            "",
            f"- URL: {p['url']}",
            f"- 색인에 잡힌 URL(슬러그 포함): {p['url_as_indexed']}",
            f"- 게시일시: {p['created_kst']} KST ({p['time_source']}, 미디어 ID {p['media_id']}) / {p['created_utc']}",
            f"- 유형: {p['type']} — {p['type_basis']}",
            f"- 상위 글 URL: {p['parent_url'] or '해당 없음'}",
            f"- 분류: {j(p['categories'])}",
            f"- 언급 작가: {j(p['artists']) or '없음'}",
            f"- 언급 작품: {j(p['works']) or '없음'}",
            f"- 언급 갤러리·장소: {j(p['galleries']) or '없음'}",
            f"- 언급 가격: {j(p['prices']) or '없음'}",
            f"- 첨부 이미지: {imgs(p).replace(chr(10), ', ')}",
            f"- 시각 출처: {p['time_source']} · 수집 출처: {p['source']}",
            f"- 본문 확보 상태: {p['text_status']}",
        ]
        if p["page_meta"]:
            lines.append(f"- 페이지 메타: {p['page_meta']}")
        if p["original_author"]:
            lines.append(f"- 재게시 원작성자: @{p['original_author']}")
        if p["parent_text"]:
            lines += ["", "## 상위 글(앞부분)", "", "> " + p["parent_text"].replace("\n", "\n> ")]
        lines += ["", "## 본문", "", "> " + (p["text"] or "(본문 없음)").replace("\n", "\n> "), ""]
        if isinstance(p["images"], list) and any(isinstance(i, dict) and i.get("file") for i in p["images"]):
            lines += ["## 사진", ""] + [f"![{i.get('alt','')}](../{i['file']})" for i in p["images"] if isinstance(i, dict) and i.get("file")] + [""]
        lines += ["## 요약", "", p["summary"] or "(미작성)", ""]
        if clue_by_page.get(p["url"]):
            lines += ["## 같은 페이지의 미확인 단서(작성자 불명, 컬렉터S 주장으로 인용 금지)", ""]
            for c in clue_by_page[p["url"]]:
                lines.append(f"- {c['id']} ({'원문 인용' if c['verbatim'] else '요약 의역'}): {c['text']}")
            lines.append("")
        (out / name).write_text("\n".join(lines), encoding="utf-8")
        n_img = sum(1 for i in p["images"] if isinstance(i, dict) and i.get("status") == "ok") if isinstance(p["images"], list) else 0
        index_lines.append(f"| {p['created_kst']} | {p['type']} | [{p['shortcode']}]({p['url']}) | [posts/{name}](posts/{name}) | {p['text_status'].split(':')[0].split('(')[0]} | {n_img} |")

    all_imgs = [i for p in posts if isinstance(p["images"], list) for i in p["images"] if isinstance(i, dict)]
    ok = sum(1 for i in all_imgs if i.get("status") == "ok")
    img_note = (f"사진 {len(all_imgs)}장 중 {ok}장을 `images/`에 내려받아 각 게시물 파일에 연결했습니다. 실패한 사진은 게시물 파일과 엑셀에 원래 주소와 실패 사유를 남겼습니다. 경매 캡처는 확보하지 못했고, 경매 로트는 `../collector_s_index.xlsx`의 `경매대조표`에 출처 URL로 연결했습니다."
                if all_imgs else "확보한 이미지는 없습니다. 검색 색인에는 이미지가 포함되지 않고, 첨부 여부도 확인하지 못했습니다. 경매 로트는 `../collector_s_index.xlsx`의 `경매대조표`에 출처 URL로 연결했습니다.")
    readme = [
        "# 본문·이미지 자료 묶음",
        "",
        "게시물마다 Markdown 파일 하나에 메타데이터, 본문, 요약을 담았습니다. 파일 이름은 `게시일(KST)_shortcode.md`입니다.",
        "",
        "| 게시일시(KST) | 유형 | 게시물 | 본문 파일 | 본문 | 이미지 |",
        "|---|---|---|---|---|---|",
        *index_lines,
        "",
        "## 이미지",
        "",
        img_note,
        "",
    ]
    (ROOT / "bundle" / "README.md").write_text("\n".join(readme), encoding="utf-8")
    return out


def main():
    meta = load("posts.json")
    posts = enrich(meta["posts"])
    urls = [p["url"] for p in posts]
    assert len(urls) == len(set(urls)), "duplicate post URL"
    clues, log, arts, lots = load("clues.json"), load("search_log.json"), load("artists.json"), load("auction_refs.json")
    ids = {l["id"] for l in lots["lots"]}
    for a in arts["artists"]:
        missing = [r for r in a["market_refs"] if r not in ids]
        assert not missing, (a["artist"], missing)
    found = {h for q in log["queries"] for h in q["hits"]}
    assert found <= {p["shortcode"] for p in posts}, found - {p["shortcode"] for p in posts}
    for p in posts:
        for qid in p["found_by"]:
            assert p["shortcode"] in log["queries"][qid - 1]["hits"], (p["shortcode"], qid)
    wb = build_workbook(meta, posts, clues, log, arts, lots)
    bundle = build_bundle(posts, clues)
    print("workbook:", wb)
    print("bundle:", bundle, len(list(bundle.glob('*.md'))), "files")
    print("posts:", len(posts), dict(Counter(p["type"] for p in posts)), posts[0]["created_kst"], "~", posts[-1]["created_kst"])


if __name__ == "__main__":
    main()
