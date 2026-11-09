"""Merge browser capture files (from tools/threads_capture.js) into data/posts.json.

Usage:
  python3 -I research/collector_s/tools/import_capture.py CAPTURE.json [CAPTURE2.json ...] [--no-images]

What it does
  * keeps collector S's own posts (원글, 고정 글, 답글) and the posts collector S reposted (재게시물)
  * links each reply to the post shown just above it on the replies tab (상위 글, 화면 순서 기준)
  * converts timestamps to KST and cross-checks them against the shortcode decoder
  * downloads attached images into bundle/images/ unless --no-images (failures are recorded per image)
  * writes data/capture_meta.json (profile header, per-run steps and gap check) for the workbook
Existing search-index records are kept; when the capture has the same URL its data replaces the
index text and the record notes both sources.
"""
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from shortcode import KST, created_at  # noqa: E402

HANDLE = "collector___s"
NOISE = re.compile(r"^(번역하기|Translate|See translation|더 보기|See more|Read more|수정됨|Edited|·|\d+(\.\d+)?[천만KkMm]?|\d+\s*(초|분|시간|일|주)|\d+[smhdw]|\d{2}/\d{2}/\d{2,4}|\d{4}-\d{2}-\d{2})$")
REPOST = re.compile(r"(리포스트|reposted|Reposted)")


def clean_text(post, names):
    parts = [t for t in post.get("text_parts", []) if t not in names and not NOISE.match(t.strip())]
    return "\n".join(parts).strip()


def kst(iso):
    t = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return t.astimezone(KST).strftime("%Y-%m-%d %H:%M:%S")


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        dest.write_bytes(data)
        return "ok", len(data)
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}", 0
    except Exception as e:  # network policy refusals surface as URLError/ssl errors
        return f"실패: {type(e).__name__}: {str(e)[:80]}", 0


def main(argv):
    files = [a for a in argv if not a.startswith("--")]
    want_images = "--no-images" not in argv
    meta_path = ROOT / "data" / "posts.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    existing = {p["shortcode"]: p for p in meta["posts"]}
    runs, captured = [], {}
    for f in files:
        cap = json.loads(Path(f).read_text(encoding="utf-8"))
        m = cap["meta"]
        runs.append({"file": Path(f).name, **{k: m.get(k) for k in ("tab", "started_at", "finished_at", "finish_reason", "total_seen", "own_posts", "steps", "gap_steps", "profile_header_text", "og_description")},
                     "segments": [{"step": s["step"], "visible": s["visible"], "fresh": s["fresh"]} for s in cap["steps"]]})
        by_code = {p["code"]: p for p in cap["posts"]}
        for p in cap["posts"]:
            p["_by_code"] = by_code
            key = p["code"]
            if key in captured and len(captured[key].get("text_raw", "")) >= len(p.get("text_raw", "")):
                continue
            captured[key] = p

    names = {HANDLE, "컬렉터S"}
    img_dir = ROOT / "bundle" / "images"
    added = updated = 0
    for code, p in captured.items():
        own = p["author_is_handle"]
        repost = (not own) and p["tab"] == "threads" and bool(REPOST.search(p.get("context_before", "")))
        if not own and not repost:
            continue
        parent_url, parent_text = "", ""
        if p["tab"] == "replies" and own and p.get("prev_code"):
            par = p["_by_code"].get(p["prev_code"])
            if par:
                parent_url = par["url"]
                parent_text = clean_text(par, names | {par["author"]})[:300]
        if repost:
            ptype = "재게시물"
        elif p["tab"] == "replies":
            ptype = "답글"
        elif p.get("pinned"):
            ptype = "고정 글"
        else:
            ptype = "원글"
        text = clean_text(p, names | ({p["author"]} if repost else set()))
        decoded = created_at(code).astimezone(KST).strftime("%Y-%m-%d %H:%M:%S") if re.fullmatch(r"[A-Za-z0-9_-]{11}", code) else ""
        images = []
        for n, im in enumerate(p.get("images", []), 1):
            entry = {"src": im["src"], "alt": im.get("alt", "")}
            if want_images:
                img_dir.mkdir(parents=True, exist_ok=True)
                ext = ".mp4" if ".mp4" in im["src"] else ".jpg"
                dest = img_dir / f"{kst(p['datetime'])[:10]}_{code}_{n}{ext}"
                status, size = download(im["src"], dest)
                entry.update({"file": f"images/{dest.name}" if status == "ok" else "", "status": status, "bytes": size,
                              "host": urllib.parse.urlparse(im["src"]).hostname})
            images.append(entry)
        rec = existing.get(code, {})
        rec.update({
            "shortcode": code,
            "url": p["url"],
            "url_as_indexed": rec.get("url_as_indexed", ""),
            "type": ptype,
            "type_basis": {"재게시물": "프로필 '스레드' 탭에서 다른 계정 글 위에 리포스트 표시", "답글": "프로필 '답글' 탭에서 수집",
                           "고정 글": "프로필 '스레드' 탭에서 고정 표시", "원글": "프로필 '스레드' 탭에서 수집"}[ptype],
            "original_author": p["author"] if repost else "",
            "parent_url": parent_url or ("" if ptype != "답글" else "미확인"),
            "parent_text": parent_text,
            "text": text,
            "text_raw": p.get("text_raw", ""),
            "text_status": "전문(브라우저 화면 기준)" if text else "본문 없음(이미지·링크만 있거나 추출 실패, text_raw 참조)",
            "images": images,
            "videos": p.get("videos", []),
            "links": p.get("links", []),
            "quoted": p.get("quoted", []),
            "datetime_utc_page": p.get("datetime", ""),
            "created_kst_page": kst(p["datetime"]) if p.get("datetime") else "",
            "created_kst_decoded": decoded,
            "source": "검색 색인 + 브라우저 수집" if code in existing else "브라우저 수집",
            "found_by": rec.get("found_by", []),
        })
        for k, default in (("summary", ""), ("artists", []), ("works", []), ("galleries", []), ("prices", []),
                           ("categories", []), ("market_related", None), ("page_meta", "")):
            rec.setdefault(k, default)
        if code in existing:
            updated += 1
        else:
            added += 1
            existing[code] = rec
    meta["posts"] = list(existing.values())
    meta["_note"] = ("컬렉터S(@collector___s) 게시물. 브라우저 수집 파일(tools/threads_capture.js 출력)과 검색엔진 색인을 합쳤다. "
                     "게시일시는 페이지의 time 요소 값(created_kst_page)을 우선하고, shortcode 디코딩 값(created_kst_decoded)으로 대조했다.")
    if runs:
        hdr = runs[0].get("profile_header_text") or ""
        meta["account"]["profile_opened"] = True
        meta["account"]["profile_header_text"] = hdr
        meta["account"]["og_description"] = runs[0].get("og_description") or ""
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "data" / "capture_meta.json").write_text(json.dumps({"runs": runs}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    mism = [p["shortcode"] for p in meta["posts"] if p.get("created_kst_page") and p.get("created_kst_decoded") and p["created_kst_page"][:16] != p["created_kst_decoded"][:16]]
    imgs = [i for p in meta["posts"] for i in p.get("images", []) if isinstance(i, dict)]
    print(f"captured {len(captured)} posts in {len(files)} file(s); added {added}, updated {updated}; total {len(meta['posts'])}")
    print("types:", {t: sum(1 for p in meta["posts"] if p["type"] == t) for t in sorted({p["type"] for p in meta["posts"]})})
    print("timestamp mismatches (page vs decoded):", mism[:10], len(mism))
    if want_images:
        print("images:", sum(1 for i in imgs if i.get("status") == "ok"), "ok /", len(imgs),
              "failed hosts:", sorted({i.get("host") for i in imgs if i.get("status") not in (None, "ok")}))


if __name__ == "__main__":
    main(sys.argv[1:])
