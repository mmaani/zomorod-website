/***************************************
 * Zomorod Supplier RFQ System (ZMS)
 * Google Sheets + Apps Script
 *
 * Features:
 * - Creates/repairs tabs: Config, Suppliers, RFQs, Import_Staging, Logs
 * - Suppliers:
 *   - Country dropdown: Jordan/China/Syria/Turkey/Malaysia/Other
 *   - Category dropdown + MULTI-SELECT (comma-separated)
 *   - Active/Selected checkboxes
 *   - Auto Supplier_ID generation when Supplier_Name entered
 * - Safe setup (fixes “range must be at least 1 row”)
 ***************************************/

const ZMS = {
  SHEETS: {
    CONFIG: "Config",
    SUPPLIERS: "Suppliers",
    RFQS: "RFQs",
    STAGING: "Import_Staging",
    LOGS: "Logs",
    TEST: "ZMS_TEST"
  },

  // Suppliers columns (MUST match headers)
  SUPPLIERS_HEADERS: [
    "Supplier_ID",
    "Supplier_Name",
    "Country",
    "City",
    "Supplier_Type",
    "Category",
    "Contact_Name",
    "Email",
    "WhatsApp",
    "Website",
    "Certifications",
    "Notes",
    "Active",
    "Selected"
  ],

  COL: {
    SUPPLIER_ID: 1,
    SUPPLIER_NAME: 2,
    COUNTRY: 3,
    CITY: 4,
    SUPPLIER_TYPE: 5,
    CATEGORY: 6,
    CONTACT_NAME: 7,
    EMAIL: 8,
    WHATSAPP: 9,
    WEBSITE: 10,
    CERTIFICATIONS: 11,
    NOTES: 12,
    ACTIVE: 13,
    SELECTED: 14
  },

  CONFIG: {
    // Config sheet columns
    COUNTRIES_COL: 1,      // A
    SUPPLIER_TYPES_COL: 2, // B
    CATEGORIES_COL: 3      // C
  },

  DEFAULTS: {
    COUNTRIES: ["Jordan", "China", "Syria", "Turkey", "Malaysia", "Other"],
    SUPPLIER_TYPES: ["Manufacturer", "Authorized Distributor", "Trading Company", "Agent", "Other"],
    CATEGORIES: [
      "Wound Care",
      "Syringes & Needles",
      "IV Cannulas",
      "IV Infusion Sets",
      "Catheters",
      "Gloves",
      "PPE",
      "Gauze & Bandages",
      "Disinfectants",
      "Lab Consumables",
      "Other"
    ]
  },

  MAX_ROWS_VALIDATE: 5000, // validations applied down to row 5000
};

// --- UI Menu ---
function onOpen() {
  ZMS_menu_();
}

function ZMS_menu_() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Zomorod RFQ")
    .addItem("Setup / Repair", "ZMS_setup")
    .addSeparator()
    .addSubMenu(
      ui.createMenu("Import Suppliers")
        .addItem("Import from CSV (paste)", "ZMS_importFromCSV")
        .addItem("Import from MARGMA (Ordinary / Associate)", "ZMS_importFromMARGMA")
        .addItem("Import from TurkishHealthcare Directory (Turkey)", "ZMS_importFromTurkishHealthcare")
    )
    .addSeparator()
    .addSubMenu(
      ui.createMenu("Diagnostics")
        .addItem("Run Self-Test (Category multi-select)", "ZMS_selfTest_multiSelect")
        .addItem("Re-apply Dropdowns & Validations", "ZMS_applyValidations")
    )
    .addToUi();
}

// --- Setup / Repair ---
function ZMS_setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const shConfig = zmsEnsureSheet_(ss, ZMS.SHEETS.CONFIG);
  const shSuppliers = zmsEnsureSheet_(ss, ZMS.SHEETS.SUPPLIERS);
  const shRfqs = zmsEnsureSheet_(ss, ZMS.SHEETS.RFQS);
  const shStaging = zmsEnsureSheet_(ss, ZMS.SHEETS.STAGING);
  const shLogs = zmsEnsureSheet_(ss, ZMS.SHEETS.LOGS);

  zmsSetupConfig_(shConfig);
  zmsSetupSuppliers_(shSuppliers);
  zmsSetupRFQs_(shRfqs);
  zmsSetupStaging_(shStaging);
  zmsSetupLogs_(shLogs);

  ZMS_applyValidations();

  zmsToast_("ZMS setup complete ✅  (Tabs + dropdowns + multi-select ready)");
}

// --- Apply validations anytime ---
function ZMS_applyValidations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shConfig = ss.getSheetByName(ZMS.SHEETS.CONFIG);
  const shSuppliers = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);

  if (!shConfig || !shSuppliers) {
    throw new Error("Missing Config or Suppliers sheet. Run Setup / Repair first.");
  }

  const ranges = zmsGetConfigRanges_(shConfig);

  // Country dropdown
  zmsSetDropdown_(shSuppliers, ZMS.COL.COUNTRY, ranges.countriesRange, true /*show*/, true /*allowInvalid*/);

  // Supplier Type dropdown
  zmsSetDropdown_(shSuppliers, ZMS.COL.SUPPLIER_TYPE, ranges.supplierTypesRange, true, true);

  // Category dropdown: allowInvalid MUST be true to support comma-separated multi-select
  zmsSetDropdown_(shSuppliers, ZMS.COL.CATEGORY, ranges.categoriesRange, true, true);

  // Active & Selected checkboxes
  zmsSetCheckbox_(shSuppliers, ZMS.COL.ACTIVE);
  zmsSetCheckbox_(shSuppliers, ZMS.COL.SELECTED);

  zmsToast_("Dropdowns & validations re-applied ✅");
}

// --- onEdit: category multi-select + supplier ID auto ---
function onEdit(e) {
  try {
    if (!e || !e.range) return;

    const sh = e.range.getSheet();
    if (sh.getName() !== ZMS.SHEETS.SUPPLIERS) return;

    const row = e.range.getRow();
    const col = e.range.getColumn();
    if (row <= 1) return; // header row

    // Auto-generate Supplier_ID when Supplier_Name is entered
    if (col === ZMS.COL.SUPPLIER_NAME) {
      const name = (e.value || "").trim();
      if (!name) return;

      const idCell = sh.getRange(row, ZMS.COL.SUPPLIER_ID);
      const existingId = (idCell.getValue() || "").toString().trim();
      if (!existingId) {
        idCell.setValue(zmsNextSupplierId_(sh));
      }
      return;
    }

    // Multi-select Category
    if (col === ZMS.COL.CATEGORY) {
      const newValue = (e.value || "").toString().trim();
      const oldValue = (e.oldValue || "").toString().trim();

      // If user cleared the cell, do nothing
      if (!newValue) return;

      // If user pasted multiple values already, don't re-append
      if (newValue.includes(",")) return;

      const merged = zmsMergeMultiSelect_(oldValue, newValue);
      e.range.setValue(merged);
    }
  } catch (err) {
    // Avoid breaking user editing experience
    zmsLog_("onEdit error: " + err.message);
  }
}

// --- Multi-select helper ---
function zmsMergeMultiSelect_(oldValue, newValue) {
  if (!oldValue) return newValue;

  const split = oldValue
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // If already selected, keep as-is
  if (split.some(v => v.toLowerCase() === newValue.toLowerCase())) {
    return oldValue;
  }
  split.push(newValue);
  return split.join(", ");
}

// --- Config setup ---
function zmsSetupConfig_(sh) {
  // Ensure headers
  const headers = ["Countries", "Supplier_Types", "Categories"];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  // Write defaults ONLY if column is empty (so you can customize later)
  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.COUNTRIES_COL, ZMS.DEFAULTS.COUNTRIES);
  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.SUPPLIER_TYPES_COL, ZMS.DEFAULTS.SUPPLIER_TYPES);
  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.CATEGORIES_COL, ZMS.DEFAULTS.CATEGORIES);

  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 3);
}

// --- Suppliers setup ---
function zmsSetupSuppliers_(sh) {
  // Clear and rebuild sheet formatting safely (but keep if already correct)
  const existingHeaders = sh.getRange(1, 1, 1, ZMS.SUPPLIERS_HEADERS.length).getValues()[0];
  const needsHeaders = existingHeaders.join("|") !== ZMS.SUPPLIERS_HEADERS.join("|");

  if (needsHeaders) {
    sh.clear();
    sh.getRange(1, 1, 1, ZMS.SUPPLIERS_HEADERS.length)
      .setValues([ZMS.SUPPLIERS_HEADERS])
      .setFontWeight("bold");
  }

  sh.setFrozenRows(1);

  // Ensure enough rows exist (so validations don’t fail)
  const targetRows = Math.max(sh.getMaxRows(), ZMS.MAX_ROWS_VALIDATE);
  if (sh.getMaxRows() < targetRows) {
    sh.insertRowsAfter(sh.getMaxRows(), targetRows - sh.getMaxRows());
  }

  // Basic column widths
  sh.setColumnWidths(1, ZMS.SUPPLIERS_HEADERS.length, 160);
  sh.setColumnWidth(ZMS.COL.SUPPLIER_ID, 120);
  sh.setColumnWidth(ZMS.COL.SUPPLIER_NAME, 220);
  sh.setColumnWidth(ZMS.COL.NOTES, 260);

  // Default FALSE checkboxes in data area (optional; user can tick)
  // We apply checkbox validation in ZMS_applyValidations()
}

// --- RFQs setup (minimal placeholder) ---
function zmsSetupRFQs_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1,1).getValue() !== "RFQ_ID") {
    sh.clear();
    sh.getRange(1, 1, 1, 8).setValues([[
      "RFQ_ID","Created_At","Product","Spec","Target_Country","Suppliers_Selected","Status","Notes"
    ]]).setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 8);
}

// --- Staging setup ---
function zmsSetupStaging_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1,1).getValue() !== "Source") {
    sh.clear();
    sh.getRange(1, 1, 1, 8).setValues([[
      "Source","Supplier_Name","Country","Website","Email","WhatsApp","Category","Notes"
    ]]).setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 8);
}

// --- Logs setup ---
function zmsSetupLogs_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1,1).getValue() !== "Timestamp") {
    sh.clear();
    sh.getRange(1, 1, 1, 3).setValues([["Timestamp","Level","Message"]]).setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 3);
}

// --- IMPORT: CSV paste ---
function ZMS_importFromCSV() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    "Import Suppliers from CSV",
    "Paste CSV rows here.\nExpected headers recommended:\nSupplier_Name,Country,Website,Email,WhatsApp,Category,Notes\n\n(You can paste without headers too — it will attempt best-effort mapping.)",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const text = (resp.getResponseText() || "").trim();
  if (!text) return;

  const rows = Utilities.parseCsv(text);
  if (!rows || rows.length === 0) return;

  const hasHeader = rows[0].some(v => (v || "").toString().toLowerCase().includes("supplier"));
  let data = rows;

  let map = null;
  if (hasHeader) {
    const header = rows[0].map(h => (h || "").toString().trim());
    map = zmsHeaderMap_(header);
    data = rows.slice(1);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSup = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);

  let added = 0;
  data.forEach(r => {
    const obj = zmsRowToSupplierObj_(r, map);
    if (!obj.Supplier_Name) return;
    if (zmsSupplierExists_(shSup, obj.Supplier_Name, obj.Website, obj.Email)) return;

    zmsAppendSupplier_(shSup, obj, "CSV");
    added++;
  });

  zmsToast_(`Imported ${added} suppliers from CSV ✅`);
}

// --- IMPORT: MARGMA (Ordinary / Associate) ---
function ZMS_importFromMARGMA() {
  // URLs found for MARGMA member listings:
  // Ordinary:  https://www.margma.com.my/type-of-member/ordinary-members/
  // Associate: https://www.margma.com.my/type-of-member/associate-members/
  //
  // NOTE: These pages may be protected (Cloudflare / login). If UrlFetch cannot access them,
  // the script will log and ask you to use manual import via CSV or copy/paste into Import_Staging.

  const ordinaryUrl = "https://www.margma.com.my/type-of-member/ordinary-members/";
  const associateUrl = "https://www.margma.com.my/type-of-member/associate-members/";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSup = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);
  const shStg = ss.getSheetByName(ZMS.SHEETS.STAGING);

  let totalAdded = 0;
  totalAdded += zmsImportDirectorySimple_(shSup, shStg, ordinaryUrl, "MARGMA-Ordinary", "Malaysia");
  totalAdded += zmsImportDirectorySimple_(shSup, shStg, associateUrl, "MARGMA-Associate", "Malaysia");

  zmsToast_(`MARGMA import finished. Added ${totalAdded}. (Check Logs if blocked)`);
}

// --- IMPORT: TurkishHealthcare Directory (Turkey) ---
// If you meant a different directory, you can paste any listing URL into Import_Staging via CSV instead.
function ZMS_importFromTurkishHealthcare() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    "Turkish Directory Import",
    "Paste the directory listing URL (Turkey) you want to import from.\n\nTip: If a site blocks automation, use CSV import instead.",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const url = (resp.getResponseText() || "").trim();
  if (!url) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSup = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);
  const shStg = ss.getSheetByName(ZMS.SHEETS.STAGING);

  const added = zmsImportDirectorySimple_(shSup, shStg, url, "Turkey-Directory", "Turkey");
  zmsToast_(`Directory import finished. Added ${added}.`);
}

// --- Simple directory importer (best-effort HTML parsing) ---
function zmsImportDirectorySimple_(shSup, shStg, url, source, defaultCountry) {
  try {
    const html = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZMS-Supplier-Importer/1.0)" }
    }).getContentText();

    // Detect common blocks (Cloudflare / bot protection)
    const lower = html.toLowerCase();
    if (lower.includes("cloudflare") || lower.includes("just a moment") || lower.includes("enable javascript")) {
      zmsLog_(`IMPORT BLOCKED (${source}): Bot protection detected at ${url}`);
      return 0;
    }

    // Best-effort extraction:
    // 1) Find emails
    // 2) Find websites
    // 3) Find likely company names from <h1..h4> and strong tags
    const emails = Array.from(new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.trim())));
    const links = Array.from(new Set((html.match(/https?:\/\/[^\s"'<>]+/gi) || []).map(x => x.replace(/[),.;]+$/,""))));

    const nameCandidates = [];
    const tagRegex = /<(h1|h2|h3|h4|strong)[^>]*>(.*?)<\/\1>/gims;
    let m;
    while ((m = tagRegex.exec(html)) !== null) {
      const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length >= 3 && text.length <= 80) nameCandidates.push(text);
    }

    // Clean obvious junk
    const cleanedNames = nameCandidates
      .filter(n => !/member|directory|contact|login|search|home|about|categories/i.test(n))
      .slice(0, 80);

    // Write some extracted items to staging for transparency
    // Then upsert a limited set to Suppliers (we can’t reliably pair name<->email<->website without site-specific parsing)
    let added = 0;
    const toAdd = cleanedNames.slice(0, 30); // keep conservative
    toAdd.forEach((name, idx) => {
      const email = emails[idx] || "";
      const website = links.find(l => !l.includes("google") && !l.includes("facebook") && !l.includes("twitter") && !l.includes("linkedin")) || "";

      // staging row
      shStg.appendRow([source, name, defaultCountry, website, email, "", "", `Imported from ${url}`]);

      if (!zmsSupplierExists_(shSup, name, website, email)) {
        zmsAppendSupplier_(shSup, {
          Supplier_Name: name,
          Country: defaultCountry,
          Website: website,
          Email: email,
          Notes: `Imported from ${source}`
        }, source);
        added++;
      }
    });

    return added;
  } catch (err) {
    zmsLog_(`IMPORT ERROR (${source}): ${err.message} (${url})`);
    return 0;
  }
}

// --- Supplier append / exists ---
function zmsAppendSupplier_(sh, obj, source) {
  const row = sh.getLastRow() + 1;
  sh.getRange(row, ZMS.COL.SUPPLIER_ID).setValue(zmsNextSupplierId_(sh));
  sh.getRange(row, ZMS.COL.SUPPLIER_NAME).setValue(obj.Supplier_Name || "");
  sh.getRange(row, ZMS.COL.COUNTRY).setValue(obj.Country || "");
  sh.getRange(row, ZMS.COL.CITY).setValue(obj.City || "");
  sh.getRange(row, ZMS.COL.SUPPLIER_TYPE).setValue(obj.Supplier_Type || "");
  sh.getRange(row, ZMS.COL.CATEGORY).setValue(obj.Category || "");
  sh.getRange(row, ZMS.COL.CONTACT_NAME).setValue(obj.Contact_Name || "");
  sh.getRange(row, ZMS.COL.EMAIL).setValue(obj.Email || "");
  sh.getRange(row, ZMS.COL.WHATSAPP).setValue(obj.WhatsApp || "");
  sh.getRange(row, ZMS.COL.WEBSITE).setValue(obj.Website || "");
  sh.getRange(row, ZMS.COL.CERTIFICATIONS).setValue(obj.Certifications || "");
  sh.getRange(row, ZMS.COL.NOTES).setValue(obj.Notes || "");
  // Active/Selected are checkboxes; leave blank = unchecked
}

function zmsSupplierExists_(sh, name, website, email) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return false;

  const names = sh.getRange(2, ZMS.COL.SUPPLIER_NAME, lastRow - 1, 1).getValues().flat().map(v => (v || "").toString().toLowerCase().trim());
  const nm = (name || "").toString().toLowerCase().trim();
  if (nm && names.includes(nm)) return true;

  // Optional: also check by website/email if provided
  if (website) {
    const sites = sh.getRange(2, ZMS.COL.WEBSITE, lastRow - 1, 1).getValues().flat().map(v => (v || "").toString().toLowerCase().trim());
    const w = website.toLowerCase().trim();
    if (w && sites.includes(w)) return true;
  }
  if (email) {
    const emails = sh.getRange(2, ZMS.COL.EMAIL, lastRow - 1, 1).getValues().flat().map(v => (v || "").toString().toLowerCase().trim());
    const em = email.toLowerCase().trim();
    if (em && emails.includes(em)) return true;
  }

  return false;
}

// --- CSV mapping helpers ---
function zmsHeaderMap_(headerRow) {
  const map = {};
  headerRow.forEach((h, idx) => {
    const key = h.toLowerCase().replace(/\s+/g, "_");
    map[key] = idx;
  });
  return map;
}

function zmsRowToSupplierObj_(row, map) {
  const get = (keys, fallbackIndex) => {
    if (map) {
      for (const k of keys) {
        if (map[k] !== undefined) return (row[map[k]] || "").toString().trim();
      }
    }
    return (row[fallbackIndex] || "").toString().trim();
  };

  return {
    Supplier_Name: get(["supplier_name","name","company","company_name"], 0),
    Country: get(["country"], 1),
    Website: get(["website","url"], 2),
    Email: get(["email"], 3),
    WhatsApp: get(["whatsapp","phone"], 4),
    Category: get(["category","categories"], 5),
    Notes: get(["notes","note"], 6),
  };
}

// --- Validations ---
function zmsSetDropdown_(sh, col, listRange, showDropdown, allowInvalid) {
  const startRow = 2;
  const numRows = Math.max(1, ZMS.MAX_ROWS_VALIDATE - 1); // ALWAYS >= 1
  const rng = sh.getRange(startRow, col, numRows, 1);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(listRange, showDropdown)
    .setAllowInvalid(allowInvalid) // critical for multi-select
    .build();

  rng.setDataValidation(rule);
}

function zmsSetCheckbox_(sh, col) {
  const startRow = 2;
  const numRows = Math.max(1, ZMS.MAX_ROWS_VALIDATE - 1);
  sh.getRange(startRow, col, numRows, 1).insertCheckboxes();
}

// --- Config ranges ---
function zmsGetConfigRanges_(shConfig) {
  const countriesRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.COUNTRIES_COL);
  const supplierTypesRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.SUPPLIER_TYPES_COL);
  const categoriesRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.CATEGORIES_COL);

  return { countriesRange, supplierTypesRange, categoriesRange };
}

function zmsColumnDataRange_(sh, col) {
  const last = sh.getLastRow();
  const numRows = Math.max(1, last - 1); // ALWAYS >= 1
  return sh.getRange(2, col, numRows, 1);
}

function zmsWriteDefaultsIfEmpty_(sh, col, values) {
  const last = sh.getLastRow();
  const existing = sh.getRange(2, col, Math.max(1, last - 1), 1).getValues().flat().filter(v => (v || "").toString().trim() !== "");
  if (existing.length > 0) return; // user already filled

  const data = values.map(v => [v]);
  sh.getRange(2, col, data.length, 1).setValues(data);
}

// --- ID generator ---
function zmsNextSupplierId_(shSuppliers) {
  const lastRow = shSuppliers.getLastRow();
  if (lastRow < 2) return "SUP-1000";

  const ids = shSuppliers.getRange(2, ZMS.COL.SUPPLIER_ID, lastRow - 1, 1).getValues().flat();
  let maxNum = 999;
  ids.forEach(v => {
    const s = (v || "").toString().trim();
    const m = s.match(/^SUP-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  });

  return `SUP-${maxNum + 1}`;
}

// --- Self test (your error was in your old test; this one is clean) ---
function ZMS_selfTest_multiSelect() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = zmsEnsureSheet_(ss, ZMS.SHEETS.TEST);
  sh.clear();

  // Step 1: basic merge empty + new
  let r = zmsMergeMultiSelect_("", "Wound Care");
  if (r !== "Wound Care") throw new Error("Test failed at step 1");

  // Step 2: merge old + new
  r = zmsMergeMultiSelect_("Wound Care", "Gloves");
  if (r !== "Wound Care, Gloves") throw new Error("Test failed at step 2");

  // Step 3: no duplicates
  r = zmsMergeMultiSelect_("Wound Care, Gloves", "gloves");
  if (r !== "Wound Care, Gloves") throw new Error("Test failed at step 3");

  zmsToast_("Self-test PASSED ✅ (Category multi-select working)");
}

// --- Utilities ---
function zmsEnsureSheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function zmsToast_(msg) {
  SpreadsheetApp.getActiveSpreadsheet().toast(msg, "Zomorod RFQ", 6);
}

function zmsLog_(message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(ZMS.SHEETS.LOGS) || ss.insertSheet(ZMS.SHEETS.LOGS);
  const ts = new Date();
  sh.appendRow([ts, "INFO", message]);
}
