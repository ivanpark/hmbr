"""Decode Threads/Instagram post shortcodes to media IDs and the creation time embedded in them.

Instagram-family media IDs follow the sharded-ID scheme: the top 41 bits are milliseconds
since the custom epoch 2011-08-24T21:07:01.721Z. The result is an estimate of posting time,
not a value read from the post page.
"""
import sys
from datetime import datetime, timezone, timedelta

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
EPOCH_MS = 1314220021721
KST = timezone(timedelta(hours=9))


def media_id(code: str) -> int:
    n = 0
    for ch in code:
        n = n * 64 + ALPHABET.index(ch)
    return n


def created_at(code: str) -> datetime:
    ms = (media_id(code) >> 23) + EPOCH_MS
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)


if __name__ == "__main__":
    for c in sys.argv[1:]:
        t = created_at(c)
        print(c, media_id(c), t.isoformat(), t.astimezone(KST).strftime("%Y-%m-%d %H:%M:%S KST"))
