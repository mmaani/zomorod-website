#!/usr/bin/env python3
import sys
import re
import requests
import xml.etree.ElementTree as ET

UA = {"User-Agent": "Mozilla/5.0 (compatible; ZomorodRFQBot/1.0; +info@zomorodmedical.com)"}

def get(url: str) -> str:
    r = requests.get(url, headers=UA, timeout=30)
    r.raise_for_status()
    return r.text

def parse_sitemap(url: str):
    xml = get(url)
    root = ET.fromstring(xml)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = []
    # sitemapindex?
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall("sm:sitemap", ns):
            loc = sm.find("sm:loc", ns)
            if loc is not None and loc.text:
                urls.extend(parse_sitemap(loc.text.strip()))
        return urls
    # urlset
    for u in root.findall("sm:url", ns):
        loc = u.find("sm:loc", ns)
        if loc is not None and loc.text:
            urls.append(loc.text.strip())
    return urls

def main():
    if len(sys.argv) < 4:
        print("Usage: python scripts/generate_seed_urls_from_sitemap.py <sitemap_url> <contains_pattern> <out.txt>")
        print("Example: python scripts/generate_seed_urls_from_sitemap.py https://www.medzell.net/sitemap_index.xml /company/ output/medzell_company_urls.txt")
        sys.exit(1)

    sitemap_url = sys.argv[1]
    pattern = sys.argv[2]
    out_file = sys.argv[3]

    urls = parse_sitemap(sitemap_url)
    urls = [u for u in urls if pattern in u]

    # de-dup
    seen = set()
    clean = []
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        clean.append(u)

    with open(out_file, "w", encoding="utf-8") as f:
        for u in clean:
            f.write(u + "\n")

    print(f"✅ Saved {len(clean)} URLs to {out_file}")

if __name__ == "__main__":
    main()