"""Download the images listed in data/posts.json into bundle/images/ and record the result per image.

Usage: python3 -I research/collector_s/tools/download_images.py [--workers 6] [--max-side 1600]
Images are re-encoded as JPEG with the long side capped (default 1600 px) so text in screenshots
stays legible while the archive stays a manageable size. Already downloaded files are skipped,
so the script can be re-run after an interruption. Image URLs from Threads expire after a few days.
"""
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "data" / "posts.json"
OUT = ROOT / "bundle" / "images"


def arg(name, default):
    return type(default)(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


def fetch(job, max_side):
    dest, src = job["dest"], job["src"]
    if dest.exists() and dest.stat().st_size > 0:
        return job, "ok", dest.stat().st_size
    last = ""
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"}), timeout=60) as r:
                raw = r.read()
            im = Image.open(io.BytesIO(raw))
            im = im.convert("RGB")
            im.thumbnail((max_side, max_side))
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=85, optimize=True)
            dest.write_bytes(buf.getvalue())
            return job, "ok", len(buf.getvalue())
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
            if e.code in (403, 404, 410):
                break
        except Exception as e:
            last = f"{type(e).__name__}: {str(e)[:80]}"
        time.sleep(2 * (attempt + 1))
    return job, last, 0


def main():
    workers, max_side = arg("--workers", 6), arg("--max-side", 1600)
    meta = json.loads(POSTS.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    for p in meta["posts"]:
        if not isinstance(p.get("images"), list):
            continue
        day = (p.get("created_kst_page") or "")[:10] or "unknown"
        for n, im in enumerate(p["images"], 1):
            if not isinstance(im, dict) or not im.get("src"):
                continue
            jobs.append({"post": p, "im": im, "src": im["src"], "dest": OUT / f"{day}_{p['shortcode']}_{n}.jpg"})
    print(f"{len(jobs)} images, {workers} workers", flush=True)
    done = ok = 0
    t0 = time.time()
    with ThreadPoolExecutor(workers) as ex:
        futs = [ex.submit(fetch, j, max_side) for j in jobs]
        for f in as_completed(futs):
            job, status, size = f.result()
            im = job["im"]
            im["status"], im["bytes"] = status, size
            im["file"] = f"images/{job['dest'].name}" if status == "ok" else ""
            im["host"] = urllib.parse.urlparse(job["src"]).hostname
            done += 1
            ok += status == "ok"
            if done % 100 == 0 or done == len(jobs):
                print(f"{done}/{len(jobs)} done, {ok} ok, {round(time.time() - t0)}s", flush=True)
                POSTS.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    POSTS.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    fails = [j["im"]["status"] for j in jobs if j["im"].get("status") != "ok"]
    print("finished:", ok, "ok,", len(fails), "failed", dict((s, fails.count(s)) for s in set(fails)))


if __name__ == "__main__":
    main()
