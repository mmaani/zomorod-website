#!/usr/bin/env python3
"""
Zomorod Supplier Intelligence Autofill (v2)

- Per-country / per-source harvesting (wave execution)
- Append mode (default) or replace mode
- Optional seed-file input (txt with URLs)
- Robust HTTP (retries, timeouts, SSL handshake protection)
- Email filtering + dedupe
"""
from __future__ import annotations

import argparse
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from bs4 import FeatureNotFound
from openpyxl import load_workbook

UA = {
    "User-Agent": "Mozilla/5.0 (compatible; ZomorodRFQBot/1.0; +info@zomorodmedical.com)"
}

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)

EMAIL_BLOCKLIST = {
    "customercare@medzell.net",
    "support@medzell.net",
    "info@medzell.net",
    "customercare@turkishhealthcare.org",
}

SOCIAL_DOMAINS = ("facebook.com", "linkedin.com", "instagram.com", "twitter.com", "t.me", "wa.me", "whatsapp.com")

COLUMNS = [
    "Supplier_ID","Company","Country","Supplier_Type",
    "Primary_Category","Secondary_Categories","Product_Focus (free text)",
    "Website","Email(s)","Phone/WhatsApp",
    "Export_Experience (explicit)",
    "Cert_ISO13485_Claim","Cert_CE_Claim","Cert_Other (FDA/UKCA/etc.)",
    "Evidence_URL (email or cert claim page)",
    "Expected_Price_Range_USD (sanity check)",
    "Risk_Score (0=low,100=high)","Risk_Level",
    "Status","Last_Checked","Notes"
]

@dataclass
class SourceCfg:
    name: str
    base_url: str
    strategy: str
    max_items: int
    max_pages: int
    delay_s: float

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("xlsx", help="Workbook path, e.g. input/Zomorod_Supplier_Intelligence_3000_SYSTEM.xlsx")
    p.add_argument("--country", default="", help="Only process Seed_URLs rows matching this Country (exact). Blank = all.")
    p.add_argument("--source", default="", help="Only process Seed_URLs rows matching this Source_Name (exact). Blank = all.")
    p.add_argument("--mode", default="append", choices=["append", "replace"], help="append (default) or replace")
    p.add_argument("--limit", type=int, default=0, help="Stop after collecting this many NEW suppliers (0 = no early stop)")
    p.add_argument("--seed-file", default="", help="Optional text file with URLs to crawl (one per line).")
    p.add_argument("--delay", type=float, default=0.0, help="Override delay between requests (seconds). 0 = use Source_Config delay.")
    p.add_argument("--timeout", type=int, default=30, help="HTTP timeout seconds.")
    p.add_argument("--retries", type=int, default=2, help="HTTP retries per URL.")
    return p.parse_args()

def http_get(url: str, *, timeout: int, retries: int) -> Optional[str]:
    if timeout <= 0:
        timeout = 30
    for attempt in range(retries + 1):
        try:
            r = requests.get(url, headers=UA, timeout=timeout)
            r.raise_for_status()
            return r.text
        except requests.exceptions.SSLError:
            time.sleep(0.4 + attempt * 0.4)
            continue
        except Exception:
            time.sleep(0.3 + attempt * 0.5)
            continue
    return None

def normalize_obfuscations(text: str) -> str:
    t = (text or "")
    t = t.replace("[at]", "@").replace("(at)", "@").replace(" at ", "@")
    t = t.replace("[dot]", ".").replace("(dot)", ".").replace(" dot ", ".")
    return t

def extract_emails(html: str) -> List[str]:
    html2 = normalize_obfuscations(html or "")
    emails = sorted(set(EMAIL_RE.findall(html2)))
    emails = [e for e in emails if e.lower() not in EMAIL_BLOCKLIST]
    return emails

def extract_title(soup: BeautifulSoup) -> str:
    for tag in ["h1", "h2"]:
        h = soup.find(tag)
        if h and h.get_text(strip=True):
            return h.get_text(" ", strip=True)
    if soup.title and soup.title.get_text(strip=True):
        return soup.title.get_text(" ", strip=True)
    return ""

def best_website_from_page(soup: BeautifulSoup, fallback_url: str) -> str:
    for a in soup.select("a[href]"):
        href = (a.get("href") or "").strip()
        if href.startswith("http"):
            lh = href.lower()
            if lh.startswith("mailto:") or lh.startswith("tel:"):
                continue
            if any(d in lh for d in SOCIAL_DOMAINS):
                continue
            return href
    p = urlparse(fallback_url)
    if p.scheme and p.netloc:
        return f"{p.scheme}://{p.netloc}/"
    return ""

def read_source_config(ws) -> Dict[str, SourceCfg]:
    cfg: Dict[str, SourceCfg] = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[0]:
            continue
        name = str(row[0]).strip()
        base_url = str(row[1] or "").strip()
        strategy = str(row[2] or "").strip()
        max_items = int(row[3] or 0)
        max_pages = int(row[4] or 0)
        delay_s = float(row[5] or 0.6)
        cfg[name] = SourceCfg(name, base_url, strategy, max_items, max_pages, delay_s)
    return cfg

def read_seed_urls(ws, *, country: str, source: str) -> List[Dict[str, str]]:
    seeds: List[Dict[str, str]] = []
    for row in ws.iter_rows(min_row=3, values_only=True):
        url = str(row[2] or "").strip()
        use_raw = row[5]
        if isinstance(use_raw, bool):
            use = "TRUE" if use_raw else "FALSE"
        else:
            use = str(use_raw or "").strip().upper()
        if use not in {"TRUE", "YES", "Y", "1"} or not url:
            continue
        src = str(row[0] or "").strip()
        cty = str(row[1] or "").strip()
        if country and cty != country:
            continue
        if source and src != source:
            continue
        seeds.append({
            "Source_Name": src,
            "Country": cty,
            "URL": url,
            "Category_Hint": str(row[3] or "").strip(),
            "Seed_Notes": str(row[4] or "").strip(),
        })
    return seeds

def read_keywords(ws) -> Dict[str, List[str]]:
    kw: Dict[str, List[str]] = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[0]:
            continue
        cat = str(row[0]).strip()
        kws = [k.strip().lower() for k in str(row[1] or "").split(",") if k.strip()]
        kw[cat] = kws
    return kw

def map_categories(text: str, keyword_map: Dict[str, List[str]]) -> Tuple[str, str]:
    t = (text or "").lower()
    hits = []
    for cat, kws in keyword_map.items():
        score = sum(1 for k in kws if k and k in t)
        if score > 0:
            hits.append((cat, score))
    if not hits:
        return ("", "")
    hits.sort(key=lambda x: x[1], reverse=True)
    primary = hits[0][0]
    secondary = ", ".join([c for c, _ in hits[1:]])
    return (primary, secondary)

def infer_supplier_type(text: str) -> str:
    t = (text or "").lower()
    exporter_words = ["exporter", "trading", "trader", "export", "distributor", "wholesale"]
    manufacturer_words = ["manufacturer", "manufacturing", "factory", "oem", "production"]
    exp = any(w in t for w in exporter_words)
    man = any(w in t for w in manufacturer_words)
    if man and not exp:
        return "Manufacturer"
    if exp and not man:
        return "Exporter"
    if man and exp:
        return "Manufacturer"
    return ""

def extract_cert_claims(text: str) -> Tuple[str, str, str]:
    t = (text or "").lower()
    iso = "Stated" if ("iso 13485" in t or "iso13485" in t) else ""
    ce = "Stated" if ("ce mark" in t or "ce certified" in t or " ce " in f" {t} ") else ""
    other = []
    for w in ["fda", "ukca", "gmp", "sgs", "tuv", "bv", "intertek"]:
        if w in t:
            other.append(w.upper())
    return iso, ce, ", ".join(sorted(set(other)))

def calc_risk(emails: List[str], iso: str, ce: str, evidence_url: str, supplier_type: str) -> int:
    score = 0
    em = " ".join(emails).lower()
    if (not emails) or any(dom in em for dom in ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]):
        score += 20
    if not iso:
        score += 15
    if not ce:
        score += 10
    if not evidence_url:
        score += 15
    if supplier_type == "Exporter":
        score += 10
    return min(100, score)

def normalize_domain(url: str) -> str:
    try:
        p = urlparse(url)
        host = (p.netloc or "").lower().strip()
        host = host.replace("www.", "")
        return host
    except Exception:
        return ""

def get_target_rows(ws_out) -> int:
    n = 0
    for r in range(2, ws_out.max_row + 1):
        v = ws_out.cell(r, 1).value
        if isinstance(v, int) and v > 0:
            n = max(n, v)
    return n if n > 0 else 180

def load_existing_keys(ws_out, target: int) -> set:
    seen = set()
    for r in range(2, target + 2):
        company = str(ws_out.cell(r, 2).value or "").strip()
        emails = str(ws_out.cell(r, 9).value or "").strip()
        website = str(ws_out.cell(r, 8).value or "").strip()
        if not company and not emails:
            continue
        key = (company.lower(), normalize_domain(website), emails.lower())
        seen.add(key)
    return seen

def find_first_empty_row(ws_out, target: int) -> int:
    for r in range(2, target + 2):
        if not str(ws_out.cell(r, 2).value or "").strip() and not str(ws_out.cell(r, 9).value or "").strip():
            return r
    return target + 2

def clear_output(ws_out, target: int):
    for r in range(2, target + 2):
        for c in range(2, len(COLUMNS) + 1):
            if c == 18:
                continue
            ws_out.cell(r, c).value = None

def write_row(ws_out, r: int, row: Dict[str, object]):
    ws_out.cell(r, 2).value = row.get("Company", "")
    ws_out.cell(r, 3).value = row.get("Country", "")
    ws_out.cell(r, 4).value = row.get("Supplier_Type", "")
    ws_out.cell(r, 5).value = row.get("Primary_Category", "")
    ws_out.cell(r, 6).value = row.get("Secondary_Categories", "")
    ws_out.cell(r, 7).value = row.get("Product_Focus (free text)", "")
    ws_out.cell(r, 8).value = row.get("Website", "")
    ws_out.cell(r, 9).value = row.get("Email(s)", "")
    ws_out.cell(r, 12).value = row.get("Cert_ISO13485_Claim", "")
    ws_out.cell(r, 13).value = row.get("Cert_CE_Claim", "")
    ws_out.cell(r, 14).value = row.get("Cert_Other (FDA/UKCA/etc.)", "")
    ws_out.cell(r, 15).value = row.get("Evidence_URL (email or cert claim page)", "")
    ws_out.cell(r, 17).value = row.get("Risk_Score (0=low,100=high)", "")
    ws_out.cell(r, 19).value = row.get("Status", "New")
    ws_out.cell(r, 20).value = row.get("Last_Checked", "")
    ws_out.cell(r, 21).value = row.get("Notes", "")

def build_soup(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except FeatureNotFound:
        return BeautifulSoup(html, "html.parser")

def crawl_urls(
    urls: List[Dict[str, str]],
    *,
    keywords: Dict[str, List[str]],
    default_delay_s: float,
    timeout: int,
    retries: int,
    limit: int,
    existing_keys: set,
    cfg: Dict[str, SourceCfg],
    delay_override: float
) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    for idx, s in enumerate(urls, 1):
        url = s["URL"]
        html = http_get(url, timeout=timeout, retries=retries)
        if not html:
            continue

        ems = extract_emails(html)
        if not ems:
            continue

        soup = build_soup(html)
        name = extract_title(soup) or url
        text = soup.get_text("\n", strip=True)

        primary, secondary = map_categories(text, keywords)
        stype = infer_supplier_type(text)
        iso, ce, other = extract_cert_claims(text)
        website = best_website_from_page(soup, url)

        company = name.strip()
        emails_str = ", ".join(ems[:5])
        key = (company.lower(), normalize_domain(website), emails_str.lower())
        if key in existing_keys:
            continue
        existing_keys.add(key)

        row = {
            "Company": company,
            "Country": s.get("Country","").strip(),
            "Supplier_Type": stype,
            "Primary_Category": primary or s.get("Category_Hint",""),
            "Secondary_Categories": secondary,
            "Website": website,
            "Email(s)": emails_str,
            "Cert_ISO13485_Claim": iso,
            "Cert_CE_Claim": ce,
            "Cert_Other (FDA/UKCA/etc.)": other,
            "Evidence_URL (email or cert claim page)": url,
            "Risk_Score (0=low,100=high)": calc_risk(ems, iso, ce, url, stype),
            "Status": "New",
            "Last_Checked": datetime.now(timezone.utc).date().isoformat(),
            "Notes": f"Seed={s.get('Source_Name','')}; {s.get('Seed_Notes','')}".strip(),
        }
        rows.append(row)

        if len(rows) % 25 == 0:
            print(f"✅ NEW suppliers: {len(rows)} (visited {idx}/{len(urls)} URLs)")

        if limit and len(rows) >= limit:
            break

        if delay_override > 0:
            time.sleep(delay_override)
        else:
            src_name = s.get("Source_Name", "")
            src_delay = cfg.get(src_name).delay_s if src_name in cfg else default_delay_s
            time.sleep(src_delay)
    return rows

def load_seed_file_urls(path: str) -> List[str]:
    if not path:
        return []
    if not os.path.exists(path):
        raise SystemExit(f"Seed file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        out = []
        for ln in f:
            u = ln.strip()
            if u.startswith("http"):
                out.append(u)
        return out

def require_sheet(wb, name: str):
    if name in wb.sheetnames:
        return wb[name]
    raise SystemExit(f"Missing required sheet: {name}")

def main():
    args = parse_args()

    if not os.path.exists(args.xlsx):
        raise SystemExit(f"Workbook not found: {args.xlsx}")

    wb = load_workbook(args.xlsx)
    ws_cfg = require_sheet(wb, "Source_Config")
    ws_seed = require_sheet(wb, "Seed_URLs")
    ws_kw = require_sheet(wb, "Category_Keywords")
    ws_out = require_sheet(wb, "Supplier_Intelligence")
    ws_log = wb["Run_Log"] if "Run_Log" in wb.sheetnames else wb.create_sheet("Run_Log")
    if ws_log.max_row == 1 and not any(ws_log.iter_rows(min_row=1, max_row=1, values_only=True)):
        ws_log.append(["timestamp", "written", "mode", "notes"])

    cfg = read_source_config(ws_cfg)
    keywords = read_keywords(ws_kw)
    seeds = read_seed_urls(ws_seed, country=args.country, source=args.source)

    if args.seed_file:
        seed_urls = load_seed_file_urls(args.seed_file)
        for u in seed_urls:
            seeds.append({
                "Source_Name": args.source or "SeedFile",
                "Country": args.country or "",
                "URL": u,
                "Category_Hint": "",
                "Seed_Notes": f"Seed-file: {args.seed_file}",
            })

    if not seeds:
        raise SystemExit("No seeds found. Set Use=TRUE in Seed_URLs (and/or pass --seed-file) and try again.")

    target = get_target_rows(ws_out)

    if args.mode == "replace":
        clear_output(ws_out, target)

    existing_keys = load_existing_keys(ws_out, target)

    default_delay = 0.6
    if args.source and args.source in cfg:
        default_delay = cfg[args.source].delay_s
    elif not args.source:
        default_delay = 0.8

    new_rows = crawl_urls(
        seeds,
        keywords=keywords,
        default_delay_s=default_delay,
        timeout=args.timeout,
        retries=args.retries,
        limit=args.limit,
        existing_keys=existing_keys,
        cfg=cfg,
        delay_override=args.delay,
    )

    written = 0
    if args.mode == "replace":
        r = 2
        for row in new_rows:
            if r > target + 1:
                break
            write_row(ws_out, r, row)
            written += 1
            r += 1
    else:
        r = find_first_empty_row(ws_out, target)
        for row in new_rows:
            if r > target + 1:
                break
            write_row(ws_out, r, row)
            written += 1
            r += 1

    effective_delay = args.delay if args.delay > 0 else default_delay

    ws_log.append([
        datetime.now(timezone.utc).isoformat(),
        written,
        f"{args.source or 'MULTI'}|{args.country or 'ALL'}|{args.mode}",
        f"Visited {len(seeds)} seeds; wrote {written} NEW suppliers. limit={args.limit or 'none'} delay={effective_delay}s"
    ])

    wb.save(args.xlsx)
    print(f"✅ Saved: {args.xlsx}")
    print(f"✅ Wrote NEW suppliers: {written}")

if __name__ == "__main__":
    main()
