#!/usr/bin/env python3
"""
Generic directory seed generator (public pages only).

This script crawls directory listing pages and extracts company/profile URLs.
You use it for sources that don't provide a sitemap.

Config approach:
- Provide: --start-url
- Provide: --link-contains (e.g. "/company/" or "/member/")
- Provide: --next-selector OR --next-contains for pagination
- Provide: --max-pages

Examples:
  # TurkishHealthcare (example: company profile links contain "/companies/")
  python scripts/generate_seed_urls_generic_directory.py \
    --start-url "https://turkishhealthcare.org/companies" \
    --link-contains "/company/" \
    --next-contains "page=" \
    --max-pages 50 \
    --out automation/output/turkey_company_urls.txt

This does NOT log in or register accounts.
"""
import argparse
import time
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

UA = {"User-Agent": "Mozilla/5.0 (compatible; ZomorodRFQBot/1.0; +info@zomorodmedical.com)"}

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--start-url", required=True)
    p.add_argument("--link-contains", required=True, help="Only keep links whose href contains this substring.")
    p.add_argument("--next-selector", default="", help="CSS selector for the 'next page' link.")
    p.add_argument("--next-contains", default="", help="Alternative: pick first link containing this substring for pagination.")
    p.add_argument("--max-pages", type=int, default=50)
    p.add_argument("--delay", type=float, default=0.8)
    p.add_argument("--out", required=True)
    p.add_argument("--timeout", type=int, default=30)
    return p.parse_args()

def get(url: str, timeout: int) -> str:
    r = requests.get(url, headers=UA, timeout=timeout)
    r.raise_for_status()
    return r.text

def main():
    a = parse_args()
    url = a.start_url
    seen_pages = set()
    seen_links = set()
    out_links = []

    for i in range(1, a.max_pages + 1):
        if url in seen_pages:
            break
        seen_pages.add(url)
        html = get(url, a.timeout)
        soup = BeautifulSoup(html, "lxml")

        for tag in soup.select("a[href]"):
            href = (tag.get("href") or "").strip()
            if not href:
                continue
            full = href if href.startswith("http") else urljoin(url, href)
            if a.link_contains in full and full not in seen_links:
                seen_links.add(full)
                out_links.append(full)

        # find next page
        next_url = None
        if a.next_selector:
            nxt = soup.select_one(a.next_selector)
            if nxt and nxt.get("href"):
                next_url = nxt.get("href").strip()
        elif a.next_contains:
            for tag in soup.select("a[href]"):
                href = (tag.get("href") or "").strip()
                full = href if href.startswith("http") else urljoin(url, href)
                if a.next_contains in full and full not in seen_pages:
                    next_url = full
                    break

        if not next_url:
            break
        url = next_url if next_url.startswith("http") else urljoin(url, next_url)

        if i % 5 == 0:
            print(f"✅ pages={i} links={len(out_links)} current={url}")

        time.sleep(a.delay)

    with open(a.out, "w", encoding="utf-8") as f:
        for u in out_links:
            f.write(u + "\n")

    print(f"✅ Saved {len(out_links)} URLs to {a.out}")

if __name__ == "__main__":
    main()
