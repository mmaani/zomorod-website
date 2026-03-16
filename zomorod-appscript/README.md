# Zomorod RFQ — Google Apps Script (ZMS)

This Apps Script powers your Google Sheet-based supplier/customer directory + RFQ workflow.

## What’s included

### Sheets (created by **Zomorod RFQ → Setup / Repair**)

- **Config** — dropdown lists (Countries, Supplier Types, Categories, Customer Types, Customer Segments)
- **Suppliers** — supplier master table (supports multi-select Categories)
- **Import_Staging** — raw supplier imports for review
- **Customers** — customer master table
- **Customer_Staging** — raw customer imports for review
- **Sources** — registry of import sources (enable/disable + parser + URL/query)
- **Runs** — importer run history
- **Logs** — importer logs
- **RFQs** — simple RFQ tracker

## Quick start

1) Open the Google Sheet → **Extensions → Apps Script** → paste/replace the project with this code (or use clasp).
2) Refresh the sheet.
3) Run: **Zomorod RFQ → Setup / Repair**
4) Use the import menu you want.

## Supplier imports

### A) CSV (paste)
Menu: **Import Suppliers → Import from CSV (paste)**

Recommended CSV headers:

`Supplier_Name,Country,Website,Email,WhatsApp,Category,Notes,Source_Name,Source_URL`

### B) MARGMA (Malaysia)
Menu: **Import Suppliers → Import from MARGMA (Ordinary / Associate)**

This is a best-effort HTML parser and may be blocked by bot protection.

### C) Turkish directory (best-effort)
Menu: **Import Suppliers → Import from TurkishHealthcare Directory (Turkey)**

Paste the directory URL. If the site blocks automation, entries won’t be imported.

### D) Sources tab (recommended)
Menu: **Import Suppliers → Run enabled supplier sources (Sources tab)**

Enable rows in **Sources** where **Entity=Supplier**.

Supported supplier parsers:
- `MARGMA`
- `HTML_LISTING`
- `CSV_URL`
- `OVERPASS` (rare for suppliers)

## Customer imports

### A) CSV (paste)
Menu: **Import Customers → Import customers from CSV (paste)**

Recommended CSV headers:

`Customer_Name,Country,City,Customer_Type,Email,Phone,Website,Address,Notes`

### B) OSM Overpass (no API key)
Enable the Overpass rows in **Sources** where **Entity=Customer** then run:

**Import Customers → Run enabled customer sources (Sources tab)**

Overpass query format in `URL_or_Query`:

`bbox:south,west,north,east;amenity=pharmacy`

Or:

`bbox:south,west,north,east;amenity=hospital,clinic`

### C) Google Places (optional)
1) Menu: **Import Customers → Set Google Places API key**
2) Enable the Places source row in **Sources**

Places query format:

`query:pharmacy in Amman Jordan`

## Multi-select Category (Suppliers)

- The **Category** column in **Suppliers** supports multi-select.
- When you select a new category from the dropdown, it appends it (comma-separated) instead of replacing.

## Diagnostics

- **Diagnostics → Test enabled sources (no write)**: checks sources are reachable/parsers work, but does not write rows.
- **Diagnostics → Run Self-Test (Category multi-select)**: writes a small test to `ZMS_TEST`.

## Notes / limitations

- Some websites block automated scraping (Cloudflare, JS challenges). When blocked, the importer will error and record it in **Logs** and **Sources → Last_Status**.
- Public services (Overpass) should be used responsibly: keep `Max_Items` reasonable.
- `Source_Name` and `Source_URL` are optional but recommended audit fields when importing suppliers from the workbook.
