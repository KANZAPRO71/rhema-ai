import urllib.request
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

UA = "RhemaAI-Probe/1.0"


def probe(no: int) -> tuple[int, bool, str]:
    url = f"https://ende.sibirong.com/index?nomor={no}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        raw = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", errors="replace")
    except Exception:
        return no, False, ""
    if "largefont" not in raw and "class='ayat'" not in raw:
        return no, False, ""
    m = re.search(r"font-size: 150%[^>]*>([^<]+)", raw)
    title = m.group(1).strip() if m else ""
    return no, True, title


def main() -> None:
    missing = []
    ok = 0
    with ThreadPoolExecutor(max_workers=10) as pool:
        futs = [pool.submit(probe, n) for n in range(1, 865)]
        for fut in as_completed(futs):
            no, has, title = fut.result()
            if has:
                ok += 1
            else:
                missing.append(no)
    print("ok", ok, "missing", len(missing), missing[:20])


if __name__ == "__main__":
    main()
