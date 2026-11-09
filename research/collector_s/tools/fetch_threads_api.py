"""Collect every public post of a Threads profile through Meta's official Threads API.

Endpoints (Profile Discovery API, needs threads_basic + threads_profile_discovery):
  GET https://graph.threads.net/v1.0/profile_lookup?username=<u>
  GET https://graph.threads.net/v1.0/profile_posts?username=<u>   (paginated)
The access token is injected by the session's network proxy as an Authorization
header, so this script never holds the real token. Raw responses are saved
page by page under data/api_raw/ so a cut-off run can be inspected and resumed.

Usage: python3 -I research/collector_s/tools/fetch_threads_api.py [username]
"""
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "api_raw"
BASE = "https://graph.threads.net/v1.0"
FULL_FIELDS = ("id,media_product_type,media_type,media_url,thumbnail_url,permalink,username,text,"
               "timestamp,shortcode,is_quote_post,alt_text,link_attachment_url,topic_tag,"
               "children{id,media_type,media_url,thumbnail_url,alt_text}")
MIN_FIELDS = "id,media_type,media_url,permalink,username,text,timestamp,shortcode"
CTX = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE") or None)


def get(path, params):
    url = f"{BASE}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer proxy-injected", "User-Agent": "collector-s-research/1.0"})
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, {"raw": body[:2000]}


def save(name, obj):
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def collect(endpoint, username, fields, tag):
    pages, posts, after = 0, [], None
    while True:
        params = {"username": username, "fields": fields, "limit": 100}
        if after:
            params["after"] = after
        status, body = get(endpoint, params)
        pages += 1
        save(f"{tag}_page{pages:03d}.json", {"status": status, "params": params, "body": body,
                                              "fetched_at": datetime.now(timezone.utc).isoformat()})
        if status != 200:
            return posts, pages, status, body
        data = body.get("data", [])
        posts.extend(data)
        print(f"  {tag} page {pages}: {len(data)} items, total {len(posts)}", flush=True)
        after = body.get("paging", {}).get("cursors", {}).get("after")
        if not data or not after or not body.get("paging", {}).get("next"):
            return posts, pages, 200, None
        time.sleep(1.0)


def main():
    username = sys.argv[1] if len(sys.argv) > 1 else "collector___s"
    status, profile = get("profile_lookup", {"username": username})
    save("profile_lookup.json", {"status": status, "body": profile})
    print("profile_lookup:", status, json.dumps(profile, ensure_ascii=False)[:500])
    if status != 200:
        sys.exit(f"profile_lookup failed ({status}); see data/api_raw/profile_lookup.json")

    posts, pages, status, err = collect("profile_posts", username, FULL_FIELDS, "posts_full")
    if status != 200 and not posts:
        print("full field list rejected, retrying with minimal fields:", json.dumps(err, ensure_ascii=False)[:300])
        posts, pages, status, err = collect("profile_posts", username, MIN_FIELDS, "posts_min")

    replies, rpages, rstatus, rerr = collect("profile_replies", username, MIN_FIELDS, "replies")
    summary = {
        "username": username,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "profile_status": 200,
        "posts": len(posts), "posts_pages": pages, "posts_final_status": status, "posts_error": err,
        "replies": len(replies), "replies_pages": rpages, "replies_final_status": rstatus, "replies_error": rerr,
        "oldest": min((p.get("timestamp", "") for p in posts), default=""),
        "newest": max((p.get("timestamp", "") for p in posts), default=""),
    }
    save("posts_all.json", posts)
    save("replies_all.json", replies)
    save("summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
