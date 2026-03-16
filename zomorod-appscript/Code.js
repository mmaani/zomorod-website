/**
 * Zomorod Supplier RFQ System (ZMS)
 * Google Sheets + Apps Script
 *
 * v2 Enhancements (this update):
 * - Adds Customers module + Sources registry
 * - Adds multiple import adapters (Supplier + Customer):
 *   - CSV paste (manual)
 *   - URL CSV feed
 *   - Generic HTML directory listing (best-effort)
 *   - MARGMA member pages (best-effort)
 *   - OpenStreetMap Overpass (customers: pharmacies/clinics/hospitals) (best-effort)
 *   - Google Places Text Search (optional; requires API key stored in Script Properties)
 * - Adds test runner + run history + better dedupe/indexing
 *
 * Notes:
 * - Some sites block automated fetching (Cloudflare / JS challenges). When blocked,
 *   the importer logs the block and writes to staging for manual review.
 * - Overpass/Nominatim are community services; keep queries small and sequential.
 */

const ZMS = {
  SHEETS: {
    CONFIG: "Config",
    SUPPLIERS: "Suppliers",
    RFQS: "RFQs",
    STAGING: "Import_Staging",
    SOURCES: "Sources",
    CUSTOMERS: "Customers",
    CUST_STAGING: "Customer_Staging",
    RUNS: "Runs",
    LOGS: "Logs",
    TEST: "ZMS_TEST",
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
    "Selected",
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
    SELECTED: 14,
  },

  // Customers headers/cols
  CUSTOMERS_HEADERS: [
    "Customer_ID",
    "Customer_Name",
    "Country",
    "City",
    "Customer_Type",
    "Segment",
    "Contact_Name",
    "Email",
    "WhatsApp",
    "Phone",
    "Website",
    "Address",
    "Notes",
    "Active",
    "Selected",
    "Source",
  ],

  CUST_COL: {
    CUSTOMER_ID: 1,
    CUSTOMER_NAME: 2,
    COUNTRY: 3,
    CITY: 4,
    CUSTOMER_TYPE: 5,
    SEGMENT: 6,
    CONTACT_NAME: 7,
    EMAIL: 8,
    WHATSAPP: 9,
    PHONE: 10,
    WEBSITE: 11,
    ADDRESS: 12,
    NOTES: 13,
    ACTIVE: 14,
    SELECTED: 15,
    SOURCE: 16,
  },

  // Sources sheet headers
  SOURCES_HEADERS: [
    "Enabled",
    "Entity",
    "Source_Name",
    "Source_Type",
    "Country",
    "Category",
    "URL_or_Query",
    "Parser",
    "Max_Items",
    "Notes",
    "Last_Run",
    "Last_Status",
    "Last_Added",
  ],

  CONFIG: {
    // Config sheet columns
    COUNTRIES_COL: 1, // A
    SUPPLIER_TYPES_COL: 2, // B
    CATEGORIES_COL: 3, // C
    CUSTOMER_TYPES_COL: 4, // D
    CUSTOMER_SEGMENTS_COL: 5, // E
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
      "Other",
    ],

    CUSTOMER_TYPES: ["Pharmacy", "Hospital", "Clinic", "Lab", "Distributor", "Reseller", "Other"],
    CUSTOMER_SEGMENTS: ["A (Key)", "B (Growth)", "C (Long-tail)", "Unknown"],

    // Seed Sources (editable in Sources sheet)
    SOURCES: [
      // Enabled, Entity, Source_Name, Source_Type, Country, Category, URL_or_Query, Parser, Max_Items, Notes
      [true, "Supplier", "MARGMA Ordinary Members", "Directory", "Malaysia", "", "https://www.margma.com.my/type-of-member/ordinary-members/", "MARGMA", 120, "Best-effort; may be blocked"],
      [true, "Supplier", "MARGMA Associate Members", "Directory", "Malaysia", "", "https://www.margma.com.my/type-of-member/associate-members/", "MARGMA", 120, "Best-effort; may be blocked"],

      // Turkish directory is user-provided; keep disabled until you paste the correct URL
      [false, "Supplier", "Turkey Directory (paste URL)", "Directory", "Turkey", "", "https://example.com/directory", "HTML_LISTING", 50, "Paste real URL then enable"],

      // Customers (OSM Overpass): default bbox around Amman. Adjust in Sources sheet if needed.
      [false, "Customer", "OSM Amman Pharmacies (bbox)", "OSM", "Jordan", "Pharmacy", "bbox:31.83,35.77,32.10,36.10;amenity=pharmacy", "OVERPASS", 500, "Enable + adjust bbox if needed"],
      [false, "Customer", "OSM Amman Hospitals/Clinics (bbox)", "OSM", "Jordan", "Healthcare", "bbox:31.83,35.77,32.10,36.10;amenity=hospital,clinic", "OVERPASS", 500, "Enable + adjust bbox if needed"],

      // Optional Google Places (requires API key set via menu)
      [false, "Customer", "Google Places: pharmacies in Amman", "API", "Jordan", "Pharmacy", "query:pharmacy in Amman Jordan", "GOOGLE_PLACES", 60, "Requires API key"],
    ],
  },

  MAX_ROWS_VALIDATE: 5000, // validations applied down to row 5000

  OVERPASS_ENDPOINT: "https://overpass-api.de/api/interpreter",

  PROP: {
    GOOGLE_PLACES_KEY: "ZMS_GOOGLE_PLACES_KEY",
  },
};

// -------------------- UI Menu --------------------

function onOpen() {
  ZMS_menu_();
}

function ZMS_menu_() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Zomorod RFQ")
    .addItem("Setup / Repair", "ZMS_setup")
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu("Import Suppliers")
        .addItem("Run enabled supplier sources (Sources tab)", "ZMS_runSupplierSources")
        .addItem("Import from CSV (paste)", "ZMS_importFromCSV")
        .addItem("Import from MARGMA (Ordinary / Associate)", "ZMS_importFromMARGMA")
        .addItem("Import from TurkishHealthcare Directory (Turkey)", "ZMS_importFromTurkishHealthcare")
    )
    .addSubMenu(
      ui
        .createMenu("Import Customers")
        .addItem("Run enabled customer sources (Sources tab)", "ZMS_runCustomerSources")
        .addItem("Import customers from CSV (paste)", "ZMS_importCustomersFromCSV")
        .addItem("Set Google Places API key", "ZMS_setGooglePlacesKey")
    )
    .addSeparator()
    .addSubMenu(
      ui
        .createMenu("Diagnostics")
        .addItem("Test enabled sources (no write)", "ZMS_testEnabledSources")
        .addItem("Run Self-Test (Category multi-select)", "ZMS_selfTest_multiSelect")
        .addItem("Re-apply Dropdowns & Validations", "ZMS_applyValidations")
    )
    .addToUi();
}

// -------------------- Setup / Repair --------------------

function ZMS_setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const shConfig = zmsEnsureSheet_(ss, ZMS.SHEETS.CONFIG);
  const shSuppliers = zmsEnsureSheet_(ss, ZMS.SHEETS.SUPPLIERS);
  const shRfqs = zmsEnsureSheet_(ss, ZMS.SHEETS.RFQS);
  const shStaging = zmsEnsureSheet_(ss, ZMS.SHEETS.STAGING);
  const shSources = zmsEnsureSheet_(ss, ZMS.SHEETS.SOURCES);
  const shCustomers = zmsEnsureSheet_(ss, ZMS.SHEETS.CUSTOMERS);
  const shCustStg = zmsEnsureSheet_(ss, ZMS.SHEETS.CUST_STAGING);
  const shRuns = zmsEnsureSheet_(ss, ZMS.SHEETS.RUNS);
  const shLogs = zmsEnsureSheet_(ss, ZMS.SHEETS.LOGS);

  zmsSetupConfig_(shConfig);
  zmsSetupSuppliers_(shSuppliers);
  zmsSetupRfqs_(shRfqs);
  zmsSetupStaging_(shStaging);
  zmsSetupSources_(shSources);
  zmsSetupCustomers_(shCustomers);
  zmsSetupCustomerStaging_(shCustStg);
  zmsSetupRuns_(shRuns);
  zmsSetupLogs_(shLogs);

  ZMS_applyValidations();

  zmsToast_("ZMS setup complete ✅  (Suppliers + Customers + Sources ready)");
}

function ZMS_applyValidations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shConfig = ss.getSheetByName(ZMS.SHEETS.CONFIG);
  const shSuppliers = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);
  const shCustomers = ss.getSheetByName(ZMS.SHEETS.CUSTOMERS);

  if (!shConfig || !shSuppliers) {
    throw new Error("Missing Config or Suppliers sheet. Run Setup / Repair first.");
  }

  const cr = zmsGetConfigRanges_(shConfig);

  // Suppliers dropdowns
  zmsSetDropdown_(shSuppliers, ZMS.COL.COUNTRY, cr.countriesRange, true, true);
  zmsSetDropdown_(shSuppliers, ZMS.COL.SUPPLIER_TYPE, cr.supplierTypesRange, true, true);
  zmsSetDropdown_(shSuppliers, ZMS.COL.CATEGORY, cr.categoriesRange, true, true);

  // Active & Selected checkboxes
  zmsSetCheckbox_(shSuppliers, ZMS.COL.ACTIVE);
  zmsSetCheckbox_(shSuppliers, ZMS.COL.SELECTED);

  // Customers validations (if Customers sheet exists)
  if (shCustomers) {
    const custTypesRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.CUSTOMER_TYPES_COL);
    const custSegRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.CUSTOMER_SEGMENTS_COL);

    zmsSetDropdown_(shCustomers, ZMS.CUST_COL.COUNTRY, cr.countriesRange, true, true);
    zmsSetDropdown_(shCustomers, ZMS.CUST_COL.CUSTOMER_TYPE, custTypesRange, true, true);
    zmsSetDropdown_(shCustomers, ZMS.CUST_COL.SEGMENT, custSegRange, true, true);

    zmsSetCheckbox_(shCustomers, ZMS.CUST_COL.ACTIVE);
    zmsSetCheckbox_(shCustomers, ZMS.CUST_COL.SELECTED);
  }
}

// -------------------- Multi-select support (Category) --------------------

function onEdit(e) {
  try {
    if (!e || !e.range) return;

    const sh = e.range.getSheet();
    if (sh.getName() !== ZMS.SHEETS.SUPPLIERS) return;

    const row = e.range.getRow();
    const col = e.range.getColumn();

    // Only Category column and ignore header row
    if (row <= 1) return;
    if (col !== ZMS.COL.CATEGORY) return;

    const newValue = (e.value || "").toString().trim();
    const oldValue = (e.oldValue || "").toString().trim();

    if (!newValue) return;

    // If user selects same value repeatedly, keep unique
    if (!oldValue) {
      e.range.setValue(newValue);
      return;
    }

    const oldParts = oldValue.split(",").map(s => s.trim()).filter(Boolean);
    const exists = oldParts.some(x => x.toLowerCase() === newValue.toLowerCase());
    if (exists) {
      // keep old
      e.range.setValue(oldValue);
      return;
    }

    oldParts.push(newValue);
    e.range.setValue(oldParts.join(", "));
  } catch (err) {
    // Avoid breaking user edit
    zmsLog_("onEdit error: " + (err && err.message ? err.message : String(err)));
  }
}

// -------------------- Suppliers: setup + ID generation --------------------

function zmsSetupSuppliers_(sh) {
  // Ensure headers
  const existing = sh.getRange(1, 1, 1, ZMS.SUPPLIERS_HEADERS.length).getValues()[0];
  const needsHeaders = existing.join("|") !== ZMS.SUPPLIERS_HEADERS.join("|");
  if (needsHeaders) {
    sh.clear();
    sh.getRange(1, 1, 1, ZMS.SUPPLIERS_HEADERS.length).setValues([ZMS.SUPPLIERS_HEADERS]).setFontWeight("bold");
  }

  sh.setFrozenRows(1);

  // Make sure there are enough rows for validations
  const targetRows = Math.max(sh.getMaxRows(), ZMS.MAX_ROWS_VALIDATE);
  if (sh.getMaxRows() < targetRows) {
    sh.insertRowsAfter(sh.getMaxRows(), targetRows - sh.getMaxRows());
  }

  // Formatting
  sh.setColumnWidths(1, ZMS.SUPPLIERS_HEADERS.length, 160);
  sh.setColumnWidth(ZMS.COL.SUPPLIER_ID, 120);
  sh.setColumnWidth(ZMS.COL.SUPPLIER_NAME, 240);
  sh.setColumnWidth(ZMS.COL.NOTES, 280);

  // Add checkboxes to Active/Selected columns
  zmsSetCheckbox_(sh, ZMS.COL.ACTIVE);
  zmsSetCheckbox_(sh, ZMS.COL.SELECTED);
}

function zmsEnsureSupplierId_(sh, row) {
  const idCell = sh.getRange(row, ZMS.COL.SUPPLIER_ID);
  const nameCell = sh.getRange(row, ZMS.COL.SUPPLIER_NAME);
  const currentId = (idCell.getValue() || "").toString().trim();
  const name = (nameCell.getValue() || "").toString().trim();

  if (!name) return;
  if (currentId) return;

  const nextId = zmsNextSupplierId_(sh);
  idCell.setValue(nextId);
}

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

// -------------------- Customers: setup + ID generation --------------------

function zmsSetupCustomers_(sh) {
  const existing = sh.getRange(1, 1, 1, ZMS.CUSTOMERS_HEADERS.length).getValues()[0];
  const needsHeaders = existing.join("|") !== ZMS.CUSTOMERS_HEADERS.join("|");
  if (needsHeaders) {
    sh.clear();
    sh.getRange(1, 1, 1, ZMS.CUSTOMERS_HEADERS.length).setValues([ZMS.CUSTOMERS_HEADERS]).setFontWeight("bold");
  }

  sh.setFrozenRows(1);

  const targetRows = Math.max(sh.getMaxRows(), ZMS.MAX_ROWS_VALIDATE);
  if (sh.getMaxRows() < targetRows) {
    sh.insertRowsAfter(sh.getMaxRows(), targetRows - sh.getMaxRows());
  }

  sh.setColumnWidths(1, ZMS.CUSTOMERS_HEADERS.length, 160);
  sh.setColumnWidth(ZMS.CUST_COL.CUSTOMER_ID, 120);
  sh.setColumnWidth(ZMS.CUST_COL.CUSTOMER_NAME, 240);
  sh.setColumnWidth(ZMS.CUST_COL.ADDRESS, 260);
  sh.setColumnWidth(ZMS.CUST_COL.NOTES, 280);

  zmsSetCheckbox_(sh, ZMS.CUST_COL.ACTIVE);
  zmsSetCheckbox_(sh, ZMS.CUST_COL.SELECTED);
}

function zmsAppendCustomer_(sh, obj, source) {
  const row = sh.getLastRow() + 1;
  sh.getRange(row, ZMS.CUST_COL.CUSTOMER_ID).setValue(zmsNextCustomerId_(sh));
  sh.getRange(row, ZMS.CUST_COL.CUSTOMER_NAME).setValue(obj.Customer_Name || "");
  sh.getRange(row, ZMS.CUST_COL.COUNTRY).setValue(obj.Country || "");
  sh.getRange(row, ZMS.CUST_COL.CITY).setValue(obj.City || "");
  sh.getRange(row, ZMS.CUST_COL.CUSTOMER_TYPE).setValue(obj.Customer_Type || "");
  sh.getRange(row, ZMS.CUST_COL.SEGMENT).setValue(obj.Segment || "");
  sh.getRange(row, ZMS.CUST_COL.CONTACT_NAME).setValue(obj.Contact_Name || "");
  sh.getRange(row, ZMS.CUST_COL.EMAIL).setValue(obj.Email || "");
  sh.getRange(row, ZMS.CUST_COL.WHATSAPP).setValue(obj.WhatsApp || "");
  sh.getRange(row, ZMS.CUST_COL.PHONE).setValue(obj.Phone || "");
  sh.getRange(row, ZMS.CUST_COL.WEBSITE).setValue(obj.Website || "");
  sh.getRange(row, ZMS.CUST_COL.ADDRESS).setValue(obj.Address || "");
  sh.getRange(row, ZMS.CUST_COL.NOTES).setValue(obj.Notes || "");
  sh.getRange(row, ZMS.CUST_COL.ACTIVE).setValue(true);
  sh.getRange(row, ZMS.CUST_COL.SELECTED).setValue(false);
  sh.getRange(row, ZMS.CUST_COL.SOURCE).setValue(source || "");
}

function zmsNextCustomerId_(shCustomers) {
  const lastRow = shCustomers.getLastRow();
  if (lastRow < 2) return "CUS-1000";

  const ids = shCustomers.getRange(2, ZMS.CUST_COL.CUSTOMER_ID, lastRow - 1, 1).getValues().flat();
  let maxNum = 999;
  ids.forEach(v => {
    const s = (v || "").toString().trim();
    const m = s.match(/^CUS-(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  });
  return `CUS-${maxNum + 1}`;
}

// -------------------- Config + other sheet setups --------------------

function zmsSetupConfig_(sh) {
  const headers = ["Countries", "Supplier_Types", "Categories", "Customer_Types", "Customer_Segments"];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.COUNTRIES_COL, ZMS.DEFAULTS.COUNTRIES);
  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.SUPPLIER_TYPES_COL, ZMS.DEFAULTS.SUPPLIER_TYPES);
  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.CATEGORIES_COL, ZMS.DEFAULTS.CATEGORIES);
  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.CUSTOMER_TYPES_COL, ZMS.DEFAULTS.CUSTOMER_TYPES);
  zmsWriteDefaultsIfEmpty_(sh, ZMS.CONFIG.CUSTOMER_SEGMENTS_COL, ZMS.DEFAULTS.CUSTOMER_SEGMENTS);

  sh.autoResizeColumns(1, headers.length);
}

function zmsSetupRfqs_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1, 1).getValue() !== "RFQ_ID") {
    sh.clear();
    sh.getRange(1, 1, 1, 7)
      .setValues([
        ["RFQ_ID", "Date", "Customer", "Product", "Qty", "Target_Price", "Notes"],
      ])
      .setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 7);
}

function zmsSetupStaging_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1, 1).getValue() !== "Source") {
    sh.clear();
    sh.getRange(1, 1, 1, 8)
      .setValues([
        ["Source", "Supplier_Name", "Country", "Website", "Email", "WhatsApp", "Category", "Notes"],
      ])
      .setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 8);
}

function zmsSetupCustomerStaging_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1, 1).getValue() !== "Source") {
    sh.clear();
    sh.getRange(1, 1, 1, 10)
      .setValues([
        [
          "Source",
          "Customer_Name",
          "Country",
          "City",
          "Customer_Type",
          "Email",
          "Phone",
          "Website",
          "Address",
          "Notes",
        ],
      ])
      .setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 10);
}

function zmsSetupSources_(sh) {
  const existing = sh.getRange(1, 1, 1, ZMS.SOURCES_HEADERS.length).getValues()[0];
  const needsHeaders = existing.join("|") !== ZMS.SOURCES_HEADERS.join("|");
  if (needsHeaders) {
    sh.clear();
    sh.getRange(1, 1, 1, ZMS.SOURCES_HEADERS.length)
      .setValues([ZMS.SOURCES_HEADERS])
      .setFontWeight("bold");
  }
  sh.setFrozenRows(1);

  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    const seed = ZMS.DEFAULTS.SOURCES.map(r => r.concat(["", "", ""]));
    sh.getRange(2, 1, seed.length, ZMS.SOURCES_HEADERS.length).setValues(seed);
  }

  // Enabled checkbox
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), 1).insertCheckboxes();
  sh.autoResizeColumns(1, ZMS.SOURCES_HEADERS.length);
}

function zmsSetupRuns_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1, 1).getValue() !== "Timestamp") {
    sh.clear();
    sh.getRange(1, 1, 1, 8)
      .setValues([
        [
          "Timestamp",
          "Entity",
          "Source",
          "Parser",
          "Added",
          "TestOnly",
          "Duration_ms",
          "Status",
        ],
      ])
      .setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 8);
}

function zmsSetupLogs_(sh) {
  if (sh.getLastRow() === 0) sh.insertRowBefore(1);
  if (sh.getRange(1, 1).getValue() !== "Timestamp") {
    sh.clear();
    sh.getRange(1, 1, 1, 3).setValues([["Timestamp", "Level", "Message"]]).setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, 3);
}

// -------------------- Import: Suppliers (existing + improved) --------------------

function ZMS_importFromCSV() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    "Import Suppliers from CSV",
    "Paste CSV rows here. Recommended headers:\nSupplier_Name,Country,Website,Email,WhatsApp,Category,Notes,Source_Name,Source_URL",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const text = (resp.getResponseText() || "").trim();
  if (!text) return;

  const rows = Utilities.parseCsv(text);
  if (!rows || rows.length === 0) return;

  const hasHeader = rows[0].some(v => (v || "").toString().toLowerCase().includes("supplier"))
    || rows[0].some(v => (v || "").toString().toLowerCase().includes("email"));

  let data = rows;
  let map = null;
  if (hasHeader) {
    map = zmsHeaderMap_(rows[0].map(x => (x || "").toString().trim()));
    data = rows.slice(1);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSup = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);
  const shStg = ss.getSheetByName(ZMS.SHEETS.STAGING);
  if (!shSup || !shStg) throw new Error("Missing Suppliers or Import_Staging. Run Setup.");

  const idx = zmsBuildSupplierIndex_(shSup);
  let added = 0;

  data.forEach(r => {
    const obj = zmsRowToSupplierObj_(r, map);
    if (!obj.Supplier_Name) return;

    // staging
    shStg.appendRow([
      "CSV",
      obj.Supplier_Name,
      obj.Country,
      obj.Website,
      obj.Email,
      obj.WhatsApp,
      obj.Category,
      obj.Notes,
    ]);

    if (zmsSupplierExistsByIndex_(idx, obj)) return;

    zmsAppendSupplier_(shSup, obj, "CSV");
    zmsSupplierIndexAdd_(idx, obj);
    added++;
  });

  zmsToast_(`Imported ${added} suppliers from CSV ✅`);
}

function ZMS_importFromMARGMA() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSup = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);
  const shStg = ss.getSheetByName(ZMS.SHEETS.STAGING);
  if (!shSup || !shStg) throw new Error("Missing Suppliers or Import_Staging. Run Setup.");

  const ui = SpreadsheetApp.getUi();
  const pick = ui.alert(
    "Import from MARGMA",
    "Import from:\nYES = Ordinary Members\nNO = Associate Members\nCANCEL = abort",
    ui.ButtonSet.YES_NO_CANCEL
  );
  if (pick === ui.Button.CANCEL) return;

  const url =
    pick === ui.Button.YES
      ? "https://www.margma.com.my/type-of-member/ordinary-members/"
      : "https://www.margma.com.my/type-of-member/associate-members/";

  const items = zmsFetchMargma_(url, 120, "MARGMA");
  const added = zmsUpsertSuppliers_(items, "MARGMA", {
    testOnly: false,
    shSup,
    shSupStg: shStg,
    supplierIndex: zmsBuildSupplierIndex_(shSup),
  });

  zmsToast_(`Imported ${added} suppliers from MARGMA ✅`);
}

function ZMS_importFromTurkishHealthcare() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    "Import from TurkishHealthcare Directory",
    "Paste the directory URL here (companies listing).\nExample: https://www.turkishhealthcare.org/en/companies",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const url = (resp.getResponseText() || "").trim();
  if (!url) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSup = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);
  const shStg = ss.getSheetByName(ZMS.SHEETS.STAGING);
  if (!shSup || !shStg) throw new Error("Missing Suppliers or Import_Staging. Run Setup.");

  // Best-effort HTML directory fetch
  const items = zmsFetchHtmlDirectory_(url, 50, "TurkishHealthcare", "Turkey");
  const added = zmsUpsertSuppliers_(items, "TurkishHealthcare", {
    testOnly: false,
    shSup,
    shSupStg: shStg,
    supplierIndex: zmsBuildSupplierIndex_(shSup),
  });

  zmsToast_(`Imported ${added} suppliers from TurkishHealthcare (best-effort) ✅`);
}

// -------------------- Import: Customers --------------------

function ZMS_importCustomersFromCSV() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    "Import Customers from CSV",
    "Paste CSV rows here. Recommended headers:\nCustomer_Name,Country,City,Customer_Type,Email,Phone,Website,Address,Notes",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const text = (resp.getResponseText() || "").trim();
  if (!text) return;

  const rows = Utilities.parseCsv(text);
  if (!rows || rows.length === 0) return;

  const hasHeader = rows[0].some(v => (v || "").toString().toLowerCase().includes("customer"))
    || rows[0].some(v => (v || "").toString().toLowerCase().includes("email"));

  let data = rows;
  let map = null;
  if (hasHeader) {
    map = zmsHeaderMap_(rows[0].map(x => (x || "").toString().trim()));
    data = rows.slice(1);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shCust = ss.getSheetByName(ZMS.SHEETS.CUSTOMERS);
  const shStg = ss.getSheetByName(ZMS.SHEETS.CUST_STAGING);
  if (!shCust || !shStg) throw new Error("Missing Customers or Customer_Staging. Run Setup.");

  const idx = zmsBuildCustomerIndex_(shCust);
  let added = 0;

  data.forEach(r => {
    const obj = zmsRowToCustomerObj_(r, map);
    if (!obj.Customer_Name) return;

    shStg.appendRow([
      "CSV",
      obj.Customer_Name,
      obj.Country,
      obj.City,
      obj.Customer_Type,
      obj.Email,
      obj.Phone,
      obj.Website,
      obj.Address,
      obj.Notes,
    ]);

    if (zmsCustomerExistsByIndex_(idx, obj)) return;

    zmsAppendCustomer_(shCust, obj, "CSV");
    zmsCustomerIndexAdd_(idx, obj);
    added++;
  });

  zmsToast_(`Imported ${added} customers from CSV ✅`);
}

function ZMS_setGooglePlacesKey() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    "Google Places API Key",
    "Paste your Google Maps Places API key here. It will be stored in Script Properties (not in the sheet).",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const key = (resp.getResponseText() || "").trim();
  if (!key) return;
  PropertiesService.getScriptProperties().setProperty(ZMS.PROP.GOOGLE_PLACES_KEY, key);
  zmsToast_("Google Places key saved ✅");
}

// -------------------- Sources runner --------------------

function ZMS_runSupplierSources() {
  return zmsRunSources_({ entity: "Supplier", testOnly: false });
}

function ZMS_runCustomerSources() {
  return zmsRunSources_({ entity: "Customer", testOnly: false });
}

function ZMS_testEnabledSources() {
  return zmsRunSources_({ entity: "ALL", testOnly: true });
}

function zmsRunSources_({ entity, testOnly }) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const shSources = ss.getSheetByName(ZMS.SHEETS.SOURCES);
  if (!shSources) throw new Error("Missing Sources sheet. Run Setup / Repair.");

  const sources = zmsReadSources_(shSources)
    .filter(s => !!s.Enabled)
    .filter(s => (entity === "ALL" ? true : s.Entity === entity));

  if (sources.length === 0) {
    zmsToast_("No enabled sources found (Sources tab). Nothing to run.");
    return;
  }

  const shSup = ss.getSheetByName(ZMS.SHEETS.SUPPLIERS);
  const shSupStg = ss.getSheetByName(ZMS.SHEETS.STAGING);
  const shCust = ss.getSheetByName(ZMS.SHEETS.CUSTOMERS);
  const shCustStg = ss.getSheetByName(ZMS.SHEETS.CUST_STAGING);
  const shRuns = ss.getSheetByName(ZMS.SHEETS.RUNS);

  const supplierIndex = !testOnly && shSup ? zmsBuildSupplierIndex_(shSup) : null;
  const customerIndex = !testOnly && shCust ? zmsBuildCustomerIndex_(shCust) : null;

  let totalAdded = 0;
  let ok = 0;
  let failed = 0;

  sources.forEach(src => {
    const started = new Date();
    let added = 0;
    let status = "OK";

    try {
      added = zmsRunOneSource_(src, {
        testOnly,
        shSup,
        shSupStg,
        shCust,
        shCustStg,
        supplierIndex,
        customerIndex,
      });
      totalAdded += added || 0;
      ok++;
    } catch (err) {
      status = "ERROR: " + (err && err.message ? err.message : String(err));
      failed++;
      zmsLog_("SOURCE ERROR (" + src.Source_Name + "): " + status);
    }

    const ended = new Date();
    zmsWriteRun_(shRuns, {
      when: ended,
      entity: src.Entity,
      source: src.Source_Name,
      parser: src.Parser,
      added,
      testOnly,
      ms: ended.getTime() - started.getTime(),
      status,
    });
    zmsUpdateSourceStatus_(shSources, src.__row, ended, status, added);
  });

  const label = testOnly ? "Tested" : "Imported";
  zmsToast_(`${label} sources: OK ${ok}, Failed ${failed}, Added ${totalAdded}.`);
}

function zmsRunOneSource_(src, ctx) {
  const parser = (src.Parser || "").toString().trim().toUpperCase();
  const maxItems = zmsToInt_(src.Max_Items) || 50;
  const urlOrQuery = (src.URL_or_Query || "").toString().trim();
  const testOnly = !!ctx.testOnly;

  if (!urlOrQuery && parser !== "GOOGLE_PLACES") {
    throw new Error("Source has empty URL_or_Query");
  }

  if (parser === "MARGMA") {
    const items = zmsFetchMargma_(urlOrQuery, maxItems, src.Source_Name);
    if (testOnly) return 0;
    if (src.Entity === "Supplier") return zmsUpsertSuppliers_(items, src.Source_Name, ctx);
    return 0;
  }

  if (parser === "HTML_LISTING") {
    const items = zmsFetchHtmlDirectory_(urlOrQuery, maxItems, src.Source_Name, src.Country);
    if (testOnly) return 0;
    if (src.Entity === "Supplier") return zmsUpsertSuppliers_(items, src.Source_Name, ctx);
    if (src.Entity === "Customer") return zmsUpsertCustomers_(items, src.Source_Name, ctx);
    return 0;
  }

  if (parser === "CSV_URL") {
    const items = zmsFetchCsvUrl_(urlOrQuery, maxItems, src.Source_Name);
    if (testOnly) return 0;
    if (src.Entity === "Supplier") return zmsUpsertSuppliers_(items, src.Source_Name, ctx);
    if (src.Entity === "Customer") return zmsUpsertCustomers_(items, src.Source_Name, ctx);
    return 0;
  }

  if (parser === "OVERPASS") {
    const items = zmsFetchOverpass_(urlOrQuery, maxItems, src.Source_Name);
    if (testOnly) return 0;
    if (src.Entity === "Customer") return zmsUpsertCustomers_(items, src.Source_Name, ctx);
    if (src.Entity === "Supplier") return zmsUpsertSuppliers_(items, src.Source_Name, ctx);
    return 0;
  }

  if (parser === "GOOGLE_PLACES") {
    const items = zmsFetchGooglePlaces_(urlOrQuery, maxItems, src.Source_Name);
    if (testOnly) return 0;
    if (src.Entity === "Customer") return zmsUpsertCustomers_(items, src.Source_Name, ctx);
    return 0;
  }

  throw new Error("Unsupported parser: " + parser);
}

// -------------------- Upserts --------------------

function zmsUpsertSuppliers_(items, sourceName, ctx) {
  if (!items || !items.length) return 0;
  const shSup = ctx.shSup;
  const shStg = ctx.shSupStg;
  if (!shSup || !shStg) throw new Error("Missing Suppliers or Import_Staging sheet.");

  const idx = ctx.supplierIndex || zmsBuildSupplierIndex_(shSup);

  let added = 0;
  items.forEach(it => {
    const name = (it.Supplier_Name || it.Customer_Name || "").toString().trim();
    if (!name) return;

    const obj = {
      Supplier_Name: name,
      Country: (it.Country || "").toString().trim(),
      City: (it.City || "").toString().trim(),
      Supplier_Type: (it.Supplier_Type || "").toString().trim(),
      Category: (it.Category || "").toString().trim(),
      Contact_Name: (it.Contact_Name || "").toString().trim(),
      Email: (it.Email || "").toString().trim(),
      WhatsApp: (it.WhatsApp || "").toString().trim(),
      Website: (it.Website || "").toString().trim(),
      Certifications: (it.Certifications || "").toString().trim(),
      Notes: (it.Notes || "").toString().trim() || "Imported from " + sourceName,
      Source_Name: (it.Source_Name || it.Source || sourceName || "").toString().trim(),
      Source_URL: (it.Source_URL || it.Source_Link || it.Source_Website || "").toString().trim(),
    };

    // Always stage
    shStg.appendRow([
      obj.Source_Name || sourceName,
      obj.Supplier_Name,
      obj.Country,
      obj.Website,
      obj.Email,
      obj.WhatsApp,
      obj.Category,
      obj.Notes,
    ]);

    if (zmsSupplierExistsByIndex_(idx, obj)) return;

    zmsAppendSupplier_(shSup, obj, sourceName);
    zmsSupplierIndexAdd_(idx, obj);
    added++;
  });

  return added;
}

function zmsUpsertCustomers_(items, sourceName, ctx) {
  if (!items || !items.length) return 0;
  const shCust = ctx.shCust;
  const shStg = ctx.shCustStg;
  if (!shCust || !shStg) throw new Error("Missing Customers or Customer_Staging sheet.");

  const idx = ctx.customerIndex || zmsBuildCustomerIndex_(shCust);

  let added = 0;
  items.forEach(it => {
    const name = (it.Customer_Name || it.Supplier_Name || "").toString().trim();
    if (!name) return;

    const obj = {
      Customer_Name: name,
      Country: (it.Country || "").toString().trim(),
      City: (it.City || "").toString().trim(),
      Customer_Type: (it.Customer_Type || "").toString().trim(),
      Segment: (it.Segment || "").toString().trim(),
      Contact_Name: (it.Contact_Name || "").toString().trim(),
      Email: (it.Email || "").toString().trim(),
      WhatsApp: (it.WhatsApp || "").toString().trim(),
      Phone: (it.Phone || "").toString().trim(),
      Website: (it.Website || "").toString().trim(),
      Address: (it.Address || "").toString().trim(),
      Notes: (it.Notes || "").toString().trim() || "Imported from " + sourceName,
    };

    shStg.appendRow([
      sourceName,
      obj.Customer_Name,
      obj.Country,
      obj.City,
      obj.Customer_Type,
      obj.Email,
      obj.Phone,
      obj.Website,
      obj.Address,
      obj.Notes,
    ]);

    if (zmsCustomerExistsByIndex_(idx, obj)) return;

    zmsAppendCustomer_(shCust, obj, sourceName);
    zmsCustomerIndexAdd_(idx, obj);
    added++;
  });

  return added;
}

function zmsAppendSupplier_(sh, obj, source) {
  const row = sh.getLastRow() + 1;

  sh.getRange(row, ZMS.COL.SUPPLIER_NAME).setValue(obj.Supplier_Name || "");
  zmsEnsureSupplierId_(sh, row);

  sh.getRange(row, ZMS.COL.COUNTRY).setValue(obj.Country || "");
  sh.getRange(row, ZMS.COL.CITY).setValue(obj.City || "");
  sh.getRange(row, ZMS.COL.SUPPLIER_TYPE).setValue(obj.Supplier_Type || "");
  sh.getRange(row, ZMS.COL.CATEGORY).setValue(obj.Category || "");
  sh.getRange(row, ZMS.COL.CONTACT_NAME).setValue(obj.Contact_Name || "");
  sh.getRange(row, ZMS.COL.EMAIL).setValue(obj.Email || "");
  sh.getRange(row, ZMS.COL.WHATSAPP).setValue(obj.WhatsApp || "");
  sh.getRange(row, ZMS.COL.WEBSITE).setValue(obj.Website || "");
  sh.getRange(row, ZMS.COL.CERTIFICATIONS).setValue(obj.Certifications || "");
  sh.getRange(row, ZMS.COL.NOTES).setValue(obj.Notes || `Imported from ${source || ""}`);

  sh.getRange(row, ZMS.COL.ACTIVE).setValue(true);
  sh.getRange(row, ZMS.COL.SELECTED).setValue(false);
}

// -------------------- Fetchers / Parsers --------------------

function zmsFetch_(url, opts) {
  const options = opts || {};
  const cacheSecs = zmsToInt_(options.cacheSeconds) || 900;
  const cacheKey = "ZMS_FETCH:" + Utilities.base64EncodeWebSafe(url).slice(0, 240);

  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const resp = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    method: options.method || "get",
    payload: options.payload,
    contentType: options.contentType,
    headers: Object.assign(
      { "User-Agent": "Mozilla/5.0 (compatible; ZMS-Importer/2.0; +https://www.zomorodmedical.com)" },
      options.headers || {}
    ),
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code >= 400) {
    throw new Error("HTTP " + code + " fetching " + url);
  }

  if (text && text.length) cache.put(cacheKey, text, cacheSecs);
  return text;
}

function zmsLooksBlockedHtml_(html) {
  const lower = (html || "").toLowerCase();
  return (
    lower.includes("cloudflare") ||
    lower.includes("just a moment") ||
    lower.includes("enable javascript") ||
    lower.includes("access denied") ||
    lower.includes("captcha")
  );
}

function zmsFetchMargma_(url, maxItems, sourceName) {
  const html = zmsFetch_(url, { cacheSeconds: 3600 });
  if (zmsLooksBlockedHtml_(html)) {
    throw new Error("Blocked by bot protection (" + sourceName + ")");
  }

  const items = [];

  // Best-effort extraction: anchors
  const linkRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gims;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = (m[1] || "").trim();
    let text = (m[2] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (!text) continue;
    if (text.length > 90) continue;
    if (/read more|view|learn more|privacy|terms|cookie|home|menu/i.test(text)) continue;
    if (href.includes("type-of-member") || href.includes("wp-") || href.includes("#")) continue;

    items.push({
      Supplier_Name: text,
      Country: "Malaysia",
      Website: zmsNormalizeUrl_(href),
      Notes: "Imported from MARGMA",
    });

    if (items.length >= maxItems) break;
  }

  // Fallback: headings
  if (!items.length) {
    const tagRegex = /<(h2|h3|h4)[^>]*>(.*?)<\/\1>/gims;
    while ((m = tagRegex.exec(html)) !== null) {
      const t = (m[2] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!t) continue;
      if (t.length < 3 || t.length > 90) continue;
      if (/member|ordinary|associate/i.test(t)) continue;
      items.push({ Supplier_Name: t, Country: "Malaysia", Notes: "Imported from MARGMA" });
      if (items.length >= maxItems) break;
    }
  }

  return items;
}

function zmsFetchHtmlDirectory_(url, maxItems, sourceName, defaultCountry) {
  const html = zmsFetch_(url, { cacheSeconds: 1800 });
  if (zmsLooksBlockedHtml_(html)) {
    throw new Error("Blocked by bot protection (" + sourceName + ")");
  }

  const emails = Array.from(
    new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(x => x.trim()))
  );
  const phones = Array.from(
    new Set((html.match(/\+?\d[\d\s().-]{7,}/g) || []).map(x => x.trim()))
  );

  // Names from headings/strong
  const nameCandidates = [];
  const tagRegex = /<(h1|h2|h3|h4|strong)[^>]*>(.*?)<\/\1>/gims;
  let m;
  while ((m = tagRegex.exec(html)) !== null) {
    const text = (m[2] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.length < 3 || text.length > 90) continue;
    if (/member|directory|contact|login|search|home|about|categories|results|privacy|terms/i.test(text)) continue;
    nameCandidates.push(text);
    if (nameCandidates.length >= maxItems * 2) break;
  }

  const links = Array.from(
    new Set((html.match(/https?:\/\/[^\s"'<>]+/gi) || []).map(x => x.replace(/[),.;]+$/, "")))
  );
  const websites = links.filter(l => !/(google|facebook|twitter|linkedin|instagram|youtube)/i.test(l));

  const items = [];
  const count = Math.min(maxItems, Math.max(0, nameCandidates.length));
  for (let i = 0; i < count; i++) {
    const name = nameCandidates[i];
    items.push({
      Supplier_Name: name,
      Customer_Name: name,
      Country: defaultCountry || "",
      Website: websites[i] || websites[0] || "",
      Email: emails[i] || emails[0] || "",
      Phone: phones[i] || phones[0] || "",
      Notes: "Imported from " + sourceName,
    });
  }

  return items;
}

function zmsFetchCsvUrl_(url, maxItems) {
  const text = zmsFetch_(url, { cacheSeconds: 900 });
  const rows = Utilities.parseCsv(text);
  if (!rows || rows.length < 2) return [];
  const map = zmsHeaderMap_(rows[0].map(x => (x || "").toString().trim()));
  const data = rows.slice(1, 1 + maxItems);
  return data.map(r => Object.assign(zmsRowToSupplierObj_(r, map), zmsRowToCustomerObj_(r, map)));
}

// Overpass query spec in Sources: bbox:south,west,north,east;amenity=pharmacy OR amenity=hospital,clinic
function zmsFetchOverpass_(querySpec, maxItems, sourceName) {
  const spec = (querySpec || "").trim();
  if (!spec) return [];

  const parts = spec.split(";").map(s => s.trim()).filter(Boolean);
  const bboxPart = parts.find(p => p.toLowerCase().startsWith("bbox:"));
  if (!bboxPart) throw new Error("OVERPASS source missing bbox:... in URL_or_Query");

  const bbox = bboxPart
    .substring(5)
    .split(",")
    .map(x => parseFloat(x.trim()));

  if (bbox.length !== 4 || bbox.some(n => !isFinite(n))) {
    throw new Error("Invalid bbox format: " + bboxPart);
  }

  const south = bbox[0],
    west = bbox[1],
    north = bbox[2],
    east = bbox[3];

  const tagParts = parts.filter(p => !p.toLowerCase().startsWith("bbox:"));
  if (!tagParts.length) throw new Error("OVERPASS source missing tag filter e.g. amenity=pharmacy");

  const filters = [];
  tagParts.forEach(tp => {
    const eq = tp.indexOf("=");
    if (eq === -1) return;
    const k = tp.substring(0, eq).trim();
    const v = tp.substring(eq + 1).trim();
    v.split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .forEach(val => filters.push({ k, v: val }));
  });

  if (!filters.length) throw new Error("OVERPASS tag filters invalid: " + querySpec);

  let q = "[out:json][timeout:25];(\n";
  filters.forEach(f => {
    q += `  node[\"${f.k}\"=\"${f.v}\"](${south},${west},${north},${east});\n`;
    q += `  way[\"${f.k}\"=\"${f.v}\"](${south},${west},${north},${east});\n`;
    q += `  relation[\"${f.k}\"=\"${f.v}\"](${south},${west},${north},${east});\n`;
  });
  q += ");out center tags;";

  // One sequential request. Keep modest.
  const jsonText = zmsFetch_(ZMS.OVERPASS_ENDPOINT, {
    method: "post",
    payload: q,
    contentType: "application/x-www-form-urlencoded",
    cacheSeconds: 600,
    headers: {
      Accept: "application/json",
      "User-Agent": "ZMS-Importer/2.0 (+https://www.zomorodmedical.com)",
    },
  });

  const obj = JSON.parse(jsonText);
  const els = obj && obj.elements ? obj.elements : [];

  const items = [];
  for (let i = 0; i < els.length && items.length < maxItems; i++) {
    const el = els[i];
    const tags = el.tags || {};

    const name = tags.name || tags["name:en"] || tags.operator || "";
    if (!name) continue;

    const phone = tags.phone || tags["contact:phone"] || "";
    const email = tags.email || tags["contact:email"] || "";
    const website = tags.website || tags["contact:website"] || "";

    const addr = [tags["addr:street"], tags["addr:housenumber"], tags["addr:postcode"], tags["addr:city"]]
      .filter(Boolean)
      .join(" ");

    let custType = tags.amenity || tags.shop || tags.healthcare || "";
    custType = custType ? custType.toString() : "";
    if (/pharmacy/i.test(custType)) custType = "Pharmacy";
    else if (/hospital/i.test(custType)) custType = "Hospital";
    else if (/clinic/i.test(custType)) custType = "Clinic";
    else custType = "Other";

    items.push({
      Customer_Name: name,
      Country: "",
      City: tags["addr:city"] || "",
      Customer_Type: custType,
      Email: email,
      Phone: phone,
      Website: website,
      Address: addr,
      Notes: "Imported from Overpass",
    });
  }

  // Respect public service: avoid burst runs
  Utilities.sleep(400);

  return items;
}

function zmsFetchGooglePlaces_(querySpec, maxItems, sourceName) {
  const key = PropertiesService.getScriptProperties().getProperty(ZMS.PROP.GOOGLE_PLACES_KEY);
  if (!key) throw new Error("Google Places API key not set (Import Customers → Set Google Places API key)");

  const spec = (querySpec || "").trim();
  if (!spec.toLowerCase().startsWith("query:")) {
    throw new Error("GOOGLE_PLACES expects URL_or_Query like: query:pharmacy in Amman Jordan");
  }
  const q = spec.substring(6).trim();
  if (!q) throw new Error("Empty Google Places query");

  const url =
    "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" +
    encodeURIComponent(q) +
    "&key=" +
    encodeURIComponent(key);

  const text = zmsFetch_(url, { cacheSeconds: 600 });
  const obj = JSON.parse(text);

  const results = obj && obj.results ? obj.results : [];
  const items = [];

  for (let i = 0; i < results.length && items.length < maxItems; i++) {
    const r = results[i];
    const name = r.name || "";
    if (!name) continue;

    items.push({
      Customer_Name: name,
      Customer_Type: "Other",
      Address: r.formatted_address || "",
      Notes: "Imported from Google Places",
    });
  }

  return items;
}

// -------------------- Diagnostics --------------------

function ZMS_selfTest_multiSelect() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(ZMS.SHEETS.TEST) || ss.insertSheet(ZMS.SHEETS.TEST);
  sh.clear();

  sh.getRange(1, 1, 1, 3)
    .setValues([["Step", "Expected", "Result"]])
    .setFontWeight("bold");

  // Create a mini suppliers-like range for testing multi-select logic
  sh.getRange(2, 1).setValue("Select Category twice");
  sh.getRange(2, 2).setValue("Cell should contain 'A, B'");

  // Simulate by calling helper
  const cell = sh.getRange(3, 1);
  cell.setValue("A");
  zmsMultiSelectSim_(cell, "B", "A");
  const result = cell.getValue();

  sh.getRange(2, 3).setValue(result);

  zmsToast_("Self-test wrote results to ZMS_TEST sheet ✅");
}

function zmsMultiSelectSim_(range, newValue, oldValue) {
  const nv = (newValue || "").toString().trim();
  const ov = (oldValue || "").toString().trim();
  if (!nv) return;
  if (!ov) {
    range.setValue(nv);
    return;
  }
  const parts = ov.split(",").map(s => s.trim()).filter(Boolean);
  const exists = parts.some(x => x.toLowerCase() === nv.toLowerCase());
  if (exists) {
    range.setValue(ov);
    return;
  }
  parts.push(nv);
  range.setValue(parts.join(", "));
}

// -------------------- Helpers: config ranges + validation --------------------

function zmsGetConfigRanges_(shConfig) {
  const countriesRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.COUNTRIES_COL);
  const supplierTypesRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.SUPPLIER_TYPES_COL);
  const categoriesRange = zmsColumnDataRange_(shConfig, ZMS.CONFIG.CATEGORIES_COL);
  return { countriesRange, supplierTypesRange, categoriesRange };
}

function zmsColumnDataRange_(sh, col) {
  const lastRow = sh.getLastRow();
  const rows = Math.max(1, lastRow - 1);
  return sh.getRange(2, col, rows, 1);
}

function zmsSetDropdown_(sh, col, valuesRange, allowInvalid, showDropdown) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(valuesRange, true)
    .setAllowInvalid(!!allowInvalid)
    .setHelpText("Select a value")
    .build();

  const startRow = 2;
  const numRows = Math.max(1, ZMS.MAX_ROWS_VALIDATE - 1);
  const range = sh.getRange(startRow, col, numRows, 1);
  range.setDataValidation(rule);
  if (showDropdown === false) {
    range.setDataValidation(rule);
  }
}

function zmsSetCheckbox_(sh, col) {
  const startRow = 2;
  const numRows = Math.max(1, ZMS.MAX_ROWS_VALIDATE - 1);
  sh.getRange(startRow, col, numRows, 1).insertCheckboxes();
}

function zmsWriteDefaultsIfEmpty_(sh, col, values) {
  const lastRow = sh.getLastRow();
  const existing = lastRow >= 2 ? sh.getRange(2, col, lastRow - 1, 1).getValues().flat() : [];
  const hasAny = existing.some(v => (v || "").toString().trim() !== "");
  if (hasAny) return;

  const data = values.map(v => [v]);
  sh.getRange(2, col, data.length, 1).setValues(data);
}

// -------------------- Helpers: parse + mapping --------------------

function zmsHeaderMap_(headers) {
  const map = {};
  headers.forEach((h, idx) => {
    const key = (h || "").toString().toLowerCase().trim().replace(/\s+/g, "_");
    if (!key) return;
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
    Supplier_Name: get(["supplier_name", "name", "company", "company_name"], 0),
    Country: get(["country"], 1),
    Website: get(["website", "url"], 2),
    Email: get(["email"], 3),
    WhatsApp: get(["whatsapp", "mobile"], 4),
    Category: get(["category", "categories"], 5),
    Notes: get(["notes", "note"], 6),
    Source_Name: get(["source_name", "source"], 7),
    Source_URL: get(["source_url", "source_link", "source_website"], 8),
  };
}

function zmsRowToCustomerObj_(row, map) {
  const get = (keys, fallbackIndex) => {
    if (map) {
      for (const k of keys) {
        if (map[k] !== undefined) return (row[map[k]] || "").toString().trim();
      }
    }
    return (row[fallbackIndex] || "").toString().trim();
  };

  return {
    Customer_Name: get(["customer_name", "name", "company", "company_name"], 0),
    Country: get(["country"], 1),
    City: get(["city"], 2),
    Customer_Type: get(["customer_type", "type"], 3),
    Email: get(["email"], 4),
    Phone: get(["phone", "mobile", "tel"], 5),
    Website: get(["website", "url"], 6),
    Address: get(["address"], 7),
    Notes: get(["notes", "note"], 8),
  };
}

// -------------------- Dedupe / Indexing --------------------

function zmsNormalizeName_(s) {
  return (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
}

function zmsNormalizeUrl_(u) {
  const s = (u || "").toString().trim();
  if (!s) return "";
  if (s.startsWith("//")) return "https:" + s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return s;
}

function zmsDomain_(url) {
  const u = zmsNormalizeUrl_(url);
  const m = u.match(/^https?:\/\/([^\/]+)/i);
  return m ? m[1].toLowerCase().replace(/^www\./, "") : "";
}

function zmsNormalizePhone_(p) {
  const s = (p || "").toString().replace(/[^\d+]/g, "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length > 12) return digits.slice(-12);
  return digits;
}

function zmsBuildSupplierIndex_(sh) {
  const last = sh.getLastRow();
  const idx = { name: new Set(), domain: new Set(), email: new Set() };
  if (last < 2) return idx;

  const names = sh.getRange(2, ZMS.COL.SUPPLIER_NAME, last - 1, 1).getValues().flat();
  const sites = sh.getRange(2, ZMS.COL.WEBSITE, last - 1, 1).getValues().flat();
  const emails = sh.getRange(2, ZMS.COL.EMAIL, last - 1, 1).getValues().flat();

  for (let i = 0; i < names.length; i++) {
    const nm = zmsNormalizeName_(names[i]);
    if (nm) idx.name.add(nm);
    const dom = zmsDomain_(sites[i]);
    if (dom) idx.domain.add(dom);
    const em = (emails[i] || "").toString().toLowerCase().trim();
    if (em) idx.email.add(em);
  }

  return idx;
}

function zmsSupplierExistsByIndex_(idx, obj) {
  if (!idx) return false;
  const nm = zmsNormalizeName_(obj.Supplier_Name);
  if (nm && idx.name.has(nm)) return true;
  const dom = zmsDomain_(obj.Website);
  if (dom && idx.domain.has(dom)) return true;
  const em = (obj.Email || "").toString().toLowerCase().trim();
  if (em && idx.email.has(em)) return true;
  return false;
}

function zmsSupplierIndexAdd_(idx, obj) {
  if (!idx) return;
  const nm = zmsNormalizeName_(obj.Supplier_Name);
  if (nm) idx.name.add(nm);
  const dom = zmsDomain_(obj.Website);
  if (dom) idx.domain.add(dom);
  const em = (obj.Email || "").toString().toLowerCase().trim();
  if (em) idx.email.add(em);
}

function zmsBuildCustomerIndex_(sh) {
  const last = sh.getLastRow();
  const idx = { name: new Set(), domain: new Set(), email: new Set(), phone: new Set() };
  if (last < 2) return idx;

  const names = sh.getRange(2, ZMS.CUST_COL.CUSTOMER_NAME, last - 1, 1).getValues().flat();
  const sites = sh.getRange(2, ZMS.CUST_COL.WEBSITE, last - 1, 1).getValues().flat();
  const emails = sh.getRange(2, ZMS.CUST_COL.EMAIL, last - 1, 1).getValues().flat();
  const phones = sh.getRange(2, ZMS.CUST_COL.PHONE, last - 1, 1).getValues().flat();

  for (let i = 0; i < names.length; i++) {
    const nm = zmsNormalizeName_(names[i]);
    if (nm) idx.name.add(nm);
    const dom = zmsDomain_(sites[i]);
    if (dom) idx.domain.add(dom);
    const em = (emails[i] || "").toString().toLowerCase().trim();
    if (em) idx.email.add(em);
    const ph = zmsNormalizePhone_(phones[i]);
    if (ph) idx.phone.add(ph);
  }

  return idx;
}

function zmsCustomerExistsByIndex_(idx, obj) {
  if (!idx) return false;
  const nm = zmsNormalizeName_(obj.Customer_Name);
  if (nm && idx.name.has(nm)) return true;
  const dom = zmsDomain_(obj.Website);
  if (dom && idx.domain.has(dom)) return true;
  const em = (obj.Email || "").toString().toLowerCase().trim();
  if (em && idx.email.has(em)) return true;
  const ph = zmsNormalizePhone_(obj.Phone);
  if (ph && idx.phone.has(ph)) return true;
  return false;
}

function zmsCustomerIndexAdd_(idx, obj) {
  if (!idx) return;
  const nm = zmsNormalizeName_(obj.Customer_Name);
  if (nm) idx.name.add(nm);
  const dom = zmsDomain_(obj.Website);
  if (dom) idx.domain.add(dom);
  const em = (obj.Email || "").toString().toLowerCase().trim();
  if (em) idx.email.add(em);
  const ph = zmsNormalizePhone_(obj.Phone);
  if (ph) idx.phone.add(ph);
}

// -------------------- Sources sheet IO --------------------

function zmsReadSources_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, ZMS.SOURCES_HEADERS.length).getValues();
  return values.map((r, i) => ({
    __row: i + 2,
    Enabled: !!r[0],
    Entity: (r[1] || "").toString().trim(),
    Source_Name: (r[2] || "").toString().trim(),
    Source_Type: (r[3] || "").toString().trim(),
    Country: (r[4] || "").toString().trim(),
    Category: (r[5] || "").toString().trim(),
    URL_or_Query: (r[6] || "").toString().trim(),
    Parser: (r[7] || "").toString().trim(),
    Max_Items: r[8],
    Notes: (r[9] || "").toString().trim(),
    Last_Run: r[10],
    Last_Status: r[11],
    Last_Added: r[12],
  }));
}

function zmsUpdateSourceStatus_(shSources, row, when, status, added) {
  if (!shSources || !row) return;
  shSources.getRange(row, 11).setValue(when);
  shSources.getRange(row, 12).setValue(status);
  shSources.getRange(row, 13).setValue(added || 0);
}

function zmsWriteRun_(sh, run) {
  if (!sh) return;
  sh.appendRow([
    run.when || new Date(),
    run.entity || "",
    run.source || "",
    run.parser || "",
    run.added || 0,
    run.testOnly ? true : false,
    run.ms || 0,
    run.status || "",
  ]);
}

// -------------------- Misc helpers --------------------

function zmsEnsureSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function zmsToast_(msg) {
  SpreadsheetApp.getActiveSpreadsheet().toast(msg, "ZMS", 5);
}

function zmsLog_(message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(ZMS.SHEETS.LOGS) || ss.insertSheet(ZMS.SHEETS.LOGS);
  const ts = new Date();
  sh.appendRow([ts, "INFO", message]);
}

function zmsToInt_(v) {
  const x = Number(v);
  return Number.isFinite(x) ? Math.trunc(x) : 0;
}
