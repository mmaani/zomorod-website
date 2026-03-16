#!/usr/bin/env python3
"""
Medzell seed URL generator (v2)
- Discovers working sitemap via robots.txt + common paths.
- Extracts /company/ URLs.
"""
import sys
import requests
import xml.etree.ElementTree as ET

UA = {"User-Agent": "Mozilla/5.0 (compatible; ZomorodRFQBot/1.0; +info@zomorodmedical.com)"}

def try_get(url: str, timeout=30):
    try:
        r = requests.get(url, headers=UA, timeout=timeout)
        if r.status_code == 200 and r.text.strip():
            return r.text
    except Exception:
        return None
    return None

def get(url: str, timeout=30) -> str:
    r = requests.get(url, headers=UA, timeout=timeout)
    r.raise_for_status()
    return r.text

def parse_sitemap_xml(xml: str):
    root = ET.fromstring(xml)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = []
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall("sm:sitemap", ns):
            loc = sm.find("sm:loc", ns)
            if loc is not None and loc.text:
                urls.extend(parse_sitemap_xml(get(loc.text.strip())))
        return urls
    for u in root.findall("sm:url", ns):
        loc = u.find("sm:loc", ns)
        if loc is not None and loc.text:
            urls.append(loc.text.strip())
    return urls

def discover_sitemaps(domain: str):
    candidates = []
    robots_url = domain.rstrip("/") + "/robots.txt"
    robots = try_get(robots_url)
    if robots:
        for line in robots.splitlines():
            if line.lower().startswith("sitemap:"):
                candidates.append(line.split(":", 1)[1].strip())
    common = [
        "/sitemap.xml",
        "/sitemap_index.xml",
        "/sitemap-index.xml",
        "/sitemaps.xml",
        "/wp-sitemap.xml",
        "/sitemap.xml/",
    ]
    for p in common:
        candidates.append(domain.rstrip("/") + p)

    seen = set()
    out = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out

def main():
    out_file = sys.argv[1] if len(sys.argv) > 1 else "automation/output/medzell_company_urls.txt"
    domain = "https://www.medzell.net"

    sitemaps = discover_sitemaps(domain)
    working = None
    for s in sitemaps:
        xml = try_get(s)
        if not xml:
            continue
        if "<urlset" in xml or "<sitemapindex" in xml:
            working = s
            break
    if not working:
        raise SystemExit("No working sitemap found.")

    xml = get(working)
    urls = parse_sitemap_xml(xml)
    company_urls = sorted({u for u in urls if "/company/" in u})

    with open(out_file, "w", encoding="utf-8") as f:
        for u in company_urls:
            f.write(u + "\n")

    print(f"✅ Working sitemap: {working}")
    print(f"✅ Saved {len(company_urls)} company URLs to {out_file}")

if __name__ == "__main__":
    main()
