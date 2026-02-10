import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { getUser, hasRole } from "../auth";

/**
 * ProductsPage.jsx — UOM-enabled receiving
 * - Receive batches in piece / dozen / pack10..pack100 / custom pack size
 * - Sends qtyUom + customPackSize to /api/batches
 * - Shows batch "input units" + converted pieces + per-piece cost
 *
 * Notes:
 * - Inventory & sales remain in BASE UNITS (pieces). No sales changes required.
 * - React controlled <select> should have value + onChange (we do). :contentReference[oaicite:2]{index=2}
 */

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} / ${hh}:${min}`;
}

function formatMoneyMax2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(n);
}

function expiryBadge(status) {
  if (status === "EXPIRED") return { label: "Expired", color: "#ef4444" };
  if (status === "EXPIRING_SOON") return { label: "Expiring soon", color: "#f59e0b" };
  if (status === "GOOD") return { label: "Good", color: "#22c55e" };
  return { label: "No expiry", color: "#94a3b8" };
}

/* ---------------- UOM helpers (mirror server behavior) ---------------- */

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function s(v) {
  return String(v ?? "").trim();
}

function normalizeUom(raw) {
  const u = s(raw).toLowerCase();
  if (!u || u === "piece" || u === "pcs" || u === "pc" || u === "unit") return "piece";
  if (u === "dozen" || u === "dz") return "dozen";

  // pack10 / box10 / pack-10 / box_10 / carton12 etc
  const m = u.match(/^(pack|box|carton|case)[-_ ]?(\d+)$/);
  if (m) return `pack${m[2]}`;

  const m2 = u.match(/^pack(\d+)$/);
  if (m2) return `pack${m2[1]}`;

  if (u === "custom") return "custom";
  return u;
}

function uomMultiplier(uomRaw, customPackSizeRaw) {
  const uom = normalizeUom(uomRaw);

  if (uom === "piece") return 1;
  if (uom === "dozen") return 12;

  const m = uom.match(/^pack(\d+)$/);
  if (m) {
    const k = Math.floor(n(m[1]));
    return k > 0 ? k : 0;
  }

  if (uom === "custom") {
    const k = Math.floor(n(customPackSizeRaw));
    return k > 0 ? k : 0;
  }

  return 0;
}

function prettyUom(uomRaw, customPackSizeRaw) {
  const u = normalizeUom(uomRaw);
  if (u === "piece") return "piece";
  if (u === "dozen") return "dozen";
  const m = u.match(/^pack(\d+)$/);
  if (m) return `pack of ${m[1]}`;
  if (u === "custom") return `pack of ${Math.floor(n(customPackSizeRaw)) || "?"}`;
  return u || "piece";
}

const UOM_OPTIONS = [
  { value: "piece", label: "Piece (1)" },
  { value: "dozen", label: "Dozen (12)" },
  { value: "pack10", label: "Pack/Box of 10" },
  { value: "pack20", label: "Pack/Box of 20" },
  { value: "pack25", label: "Pack/Box of 25" },
  { value: "pack50", label: "Pack/Box of 50" },
  { value: "pack100", label: "Pack/Box of 100" },
  { value: "custom", label: "Custom pack size…" },
];

export default function ProductsPage() {
  const user = getUser();
  const roles = user?.roles || [];
  const isMain = hasRole("main");
  const canSeePurchase = roles.includes("main") || roles.includes("doctor");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [products, setProducts] = useState([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [suppliers, setSuppliers] = useState([]);

  const [pForm, setPForm] = useState({
    productCode: "",
    category: "",
    officialName: "",
    marketName: "",
    defaultSellPriceJod: "",
    priceTiers: [],
  });

  const [bForm, setBForm] = useState({
    productId: "",
    lotNumber: "",
    purchaseDate: "",
    expiryDate: "",
    qtyUom: "piece",
    customPackSize: "",
    purchasePriceJod: "",
    qtyReceived: "",
    supplierId: "",
    supplierName: "",
    supplierInvoiceNo: "",
  });

  const selectedProduct = useMemo(() => {
    const pid = String(bForm.productId || "");
    return products.find((p) => String(p.id) === pid) || null;
  }, [products, bForm.productId]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      label: `${p.productCode} — ${p.officialName}${p.archivedAt ? " (archived)" : ""}`,
    }));
  }, [products]);

  const mult = useMemo(() => uomMultiplier(bForm.qtyUom, bForm.customPackSize), [bForm.qtyUom, bForm.customPackSize]);
  const qtyInputNum = useMemo(() => Math.floor(n(bForm.qtyReceived)), [bForm.qtyReceived]);
  const priceInputNum = useMemo(() => n(bForm.purchasePriceJod), [bForm.purchasePriceJod]);

  const qtyBasePieces = useMemo(() => (mult > 0 ? qtyInputNum * mult : 0), [qtyInputNum, mult]);
  const pricePerPiece = useMemo(() => (mult > 0 ? priceInputNum / mult : 0), [priceInputNum, mult]);

  async function loadProducts() {
    setLoading(true);
    setErr("");
    try {
      const url = includeArchived ? "/api/products?includeArchived=1" : "/api/products";
      const res = await apiFetch(url);
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      setErr(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function loadBatches(productId) {
    if (!productId) {
      setBatches([]);
      return;
    }
    setBatchesLoading(true);
    setErr("");
    try {
      const res = await apiFetch(`/api/batches?productId=${productId}`);
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setBatches(Array.isArray(data.batches) ? data.batches : []);
    } catch (e) {
      setErr(e?.message || "Failed to load batches");
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }

  async function loadSuppliers() {
    if (!isMain) return;
    try {
      const res = await apiFetch("/api/suppliers");
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isMain && bForm.productId) loadBatches(Number(bForm.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bForm.productId]);

  async function onAddProduct(e) {
    e.preventDefault();
    setErr("");

    const payload = {
      productCode: String(pForm.productCode || "").trim(),
      category: String(pForm.category || "").trim(),
      officialName: String(pForm.officialName || "").trim(),
      marketName: String(pForm.marketName || "").trim(),
      defaultSellPriceJod: Number(pForm.defaultSellPriceJod || 0),
      priceTiers: Array.isArray(pForm.priceTiers) ? pForm.priceTiers : [],
    };

    if (!payload.productCode || !payload.officialName) {
      setErr("Product Code and Official Name are required.");
      return;
    }
    if (!Number.isFinite(payload.defaultSellPriceJod) || payload.defaultSellPriceJod <= 0) {
      setErr("Default Sell Price must be greater than 0.");
      return;
    }

    try {
      const res = await apiFetch("/api/products", { method: "POST", body: payload });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setPForm({
        productCode: "",
        category: "",
        officialName: "",
        marketName: "",
        defaultSellPriceJod: "",
        priceTiers: [],
      });

      await loadProducts();
    } catch (e2) {
      setErr(e2?.message || "Failed to add product");
    }
  }

  async function onReceiveBatch(e) {
    e.preventDefault();
    setErr("");

    const qtyUomNorm = normalizeUom(bForm.qtyUom);

    const payload = {
      productId: Number(bForm.productId),
      lotNumber: String(bForm.lotNumber || "").trim(),
      purchaseDate: String(bForm.purchaseDate || "").trim(),
      expiryDate: String(bForm.expiryDate || "").trim() || null,

      // NEW: UOM metadata
      qtyUom: qtyUomNorm,
      customPackSize: qtyUomNorm === "custom" ? Math.floor(n(bForm.customPackSize)) : null,

      // Interpreted by API as "price per selected unit"
      purchasePriceJod: Number(bForm.purchasePriceJod || 0),

      // Interpreted by API as "count of selected units"
      qtyReceived: Math.floor(Number(bForm.qtyReceived || 0)),

      supplierId: bForm.supplierId ? Number(bForm.supplierId) : null,
      supplierName: String(bForm.supplierName || "").trim() || null,
      supplierInvoiceNo: String(bForm.supplierInvoiceNo || "").trim() || null,
    };

    if (!payload.productId) return setErr("Please select a product.");
    if (!payload.lotNumber) return setErr("Lot Number is required.");
    if (!payload.purchaseDate) return setErr("Purchase Date is required.");

    const m = uomMultiplier(payload.qtyUom, payload.customPackSize);
    if (!payload.qtyUom) return setErr("Unit (UOM) is required.");
    if (!m || m <= 0) return setErr("Invalid unit multiplier. Fix Unit / Custom pack size.");

    if (!Number.isFinite(payload.qtyReceived) || payload.qtyReceived <= 0) return setErr("Quantity Received must be > 0.");
    if (!Number.isFinite(payload.purchasePriceJod) || payload.purchasePriceJod <= 0) return setErr("Purchase Price must be > 0.");

    try {
      const res = await apiFetch("/api/batches", { method: "POST", body: payload });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Keep selected product + selected UOM; clear rest
      setBForm((s) => ({
        ...s,
        lotNumber: "",
        purchaseDate: "",
        expiryDate: "",
        purchasePriceJod: "",
        qtyReceived: "",
        supplierId: "",
        supplierName: "",
        supplierInvoiceNo: "",
      }));

      await loadProducts();
      await loadBatches(payload.productId);
    } catch (e3) {
      setErr(e3?.message || "Failed to receive batch");
    }
  }

  async function toggleArchive(p) {
    setErr("");
    try {
      const res = await apiFetch("/api/products", {
        method: "PATCH",
        body: { id: p.id, archived: !p.archivedAt },
      });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      await loadProducts();
    } catch (e) {
      setErr(e?.message || "Failed to update product");
    }
  }

  async function deleteProduct(p) {
    setErr("");
    if (!confirm(`Delete product "${p.productCode}" permanently?\n\nOnly works if it has no batches/movements/tiers.`)) return;
    try {
      const res = await apiFetch(`/api/products?id=${p.id}`, { method: "DELETE" });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      await loadProducts();
    } catch (e) {
      setErr(e?.message || "Failed to delete product");
    }
  }

  async function voidBatch(batchId) {
    setErr("");
    if (!confirm("Void this batch?\n\nThis will reduce stock and can affect average cost.")) return;
    try {
      const res = await apiFetch(`/api/batches?id=${batchId}`, { method: "DELETE" });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      await loadProducts();
      if (bForm.productId) await loadBatches(Number(bForm.productId));
    } catch (e) {
      setErr(e?.message || "Failed to void batch");
    }
  }

  const selectedOnHandPieces = Number(selectedProduct?.onHandQty || 0);
  const selectedUomMult = mult > 0 ? mult : 1;
  const onHandInUom = Math.floor(selectedOnHandPieces / selectedUomMult);
  const onHandRemainder = selectedOnHandPieces % selectedUomMult;

  return (
    <div className="crm-content">
      {/* Products table */}
      <div className="crm-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Products</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Manage SKUs, pricing, and inventory batches.
            </div>
          </div>

          <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Show archived
          </label>
        </div>

        {err ? <div className="banner">{err}</div> : null}
        {loading ? <p className="muted">Loading…</p> : null}

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Category</th>
                <th>Official</th>
                <th>Market</th>
                <th>On-hand (pcs)</th>
                <th>Sell Price (JOD)</th>
                {canSeePurchase ? <th>Avg Purchase (JOD/pc)</th> : null}
                {canSeePurchase ? <th>Last Purchase Date</th> : null}
                <th>Tiers</th>
                {isMain ? <th>Actions</th> : null}
              </tr>
            </thead>

            <tbody>
              {!loading && products.length === 0 ? (
                <tr>
                  <td colSpan={isMain ? (canSeePurchase ? 10 : 8) : canSeePurchase ? 9 : 7} className="muted">
                    No products yet.
                  </td>
                </tr>
              ) : null}

              {products.map((p) => (
                <tr key={p.id} style={p.archivedAt ? { opacity: 0.65 } : undefined}>
                  <td>
                    <div style={{ fontWeight: 900 }}>{p.productCode}</div>
                    {p.archivedAt ? <div className="muted" style={{ fontSize: 12 }}>(archived)</div> : null}
                  </td>
                  <td>{p.category}</td>
                  <td>{p.officialName}</td>
                  <td>{p.marketName}</td>
                  <td style={{ fontWeight: 900 }}>{p.onHandQty}</td>
                  <td>{formatMoneyMax2(p.defaultSellPriceJod)}</td>
                  {canSeePurchase ? <td>{formatMoneyMax2(p.avgPurchasePriceJod)}</td> : null}
                  {canSeePurchase ? <td>{formatDateTime(p.lastPurchaseDate)}</td> : null}

                  <td>
                    {Array.isArray(p.priceTiers) && p.priceTiers.length ? (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {p.priceTiers.map((t, idx) => (
                          <li key={idx}>
                            {t.minQty}+ → {t.unitPriceJod} JOD
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  {isMain ? (
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="crm-btn crm-btn-outline" type="button" onClick={() => toggleArchive(p)}>
                        {p.archivedAt ? "Unarchive" : "Archive"}
                      </button>{" "}
                      <button className="crm-btn crm-btn-outline" type="button" onClick={() => deleteProduct(p)}>
                        Delete
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main-only forms */}
      {isMain ? (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {/* Add product */}
          <div className="crm-card">
            <h3 style={{ marginTop: 0 }}>Add Product (Main only)</h3>

            <form className="crm-form" onSubmit={onAddProduct}>
              <div className="grid grid-2">
                <div className="field">
                  <label>Product Code</label>
                  <input
                    className="input"
                    value={pForm.productCode}
                    onChange={(e) => setPForm((s) => ({ ...s, productCode: e.target.value }))}
                    placeholder="e.g., S-L11"
                  />
                </div>

                <div className="field">
                  <label>Category</label>
                  <input
                    className="input"
                    value={pForm.category}
                    onChange={(e) => setPForm((s) => ({ ...s, category: e.target.value }))}
                    placeholder="e.g., Mask"
                  />
                </div>

                <div className="field">
                  <label>Official Name</label>
                  <input
                    className="input"
                    value={pForm.officialName}
                    onChange={(e) => setPForm((s) => ({ ...s, officialName: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Market Name</label>
                  <input
                    className="input"
                    value={pForm.marketName}
                    onChange={(e) => setPForm((s) => ({ ...s, marketName: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Default Sell Price (JOD)</label>
                  <input
                    className="input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={pForm.defaultSellPriceJod}
                    onChange={(e) => setPForm((s) => ({ ...s, defaultSellPriceJod: e.target.value }))}
                    placeholder="e.g., 0.35"
                  />
                  <div className="muted" style={{ fontSize: 12 }}>
                    Must be greater than 0.
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="crm-btn crm-btn-primary" type="submit">
                  Add Product
                </button>
              </div>
            </form>
          </div>

          {/* Receive batch */}
          <div className="crm-card">
            <h3 style={{ marginTop: 0 }}>Receive Batch (Main only)</h3>

            {selectedProduct ? (
              <div className="dash-note" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  Selected: {selectedProduct.productCode} — {selectedProduct.officialName}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  On-hand: <b>{selectedOnHandPieces}</b> pcs
                  {" "}
                  • As {prettyUom(bForm.qtyUom, bForm.customPackSize)}:{" "}
                  <b>{onHandInUom}</b>
                  {onHandRemainder ? <span className="muted"> (remainder {onHandRemainder} pcs)</span> : null}
                  {canSeePurchase && selectedProduct.avgPurchasePriceJod != null ? (
                    <>
                      {" "}
                      • Avg purchase: <b>{formatMoneyMax2(selectedProduct.avgPurchasePriceJod)}</b> / pc
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <form className="crm-form" onSubmit={onReceiveBatch}>
              <div className="grid grid-2">
                <div className="field">
                  <label>Product</label>
                  <select
                    value={bForm.productId}
                    onChange={(e) => setBForm((s) => ({ ...s, productId: e.target.value }))}
                  >
                    <option value="">Select product…</option>
                    {productOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Lot Number</label>
                  <input
                    className="input"
                    value={bForm.lotNumber}
                    onChange={(e) => setBForm((s) => ({ ...s, lotNumber: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Purchase Date</label>
                  <input
                    className="input"
                    type="date"
                    value={bForm.purchaseDate}
                    onChange={(e) => setBForm((s) => ({ ...s, purchaseDate: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Expiry Date (optional)</label>
                  <input
                    className="input"
                    type="date"
                    value={bForm.expiryDate}
                    onChange={(e) => setBForm((s) => ({ ...s, expiryDate: e.target.value }))}
                  />
                </div>

                <div className="field">
                  <label>Unit (how this batch is packed)</label>
                  <select
                    value={bForm.qtyUom}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBForm((s) => ({
                        ...s,
                        qtyUom: v,
                        customPackSize: v === "custom" ? s.customPackSize : "",
                      }));
                    }}
                  >
                    {UOM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {normalizeUom(bForm.qtyUom) === "custom" ? (
                    <input
                      className="input"
                      style={{ marginTop: 10 }}
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Custom pack size (pieces per pack)"
                      value={bForm.customPackSize}
                      onChange={(e) => setBForm((s) => ({ ...s, customPackSize: e.target.value }))}
                    />
                  ) : null}

                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Conversion: 1 {prettyUom(bForm.qtyUom, bForm.customPackSize)} ={" "}
                    <b>{mult || "?"}</b> pcs
                  </div>
                </div>

                <div className="field">
                  <label>Purchase Price (JOD per selected unit)</label>
                  <input
                    className="input"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={bForm.purchasePriceJod}
                    onChange={(e) => setBForm((s) => ({ ...s, purchasePriceJod: e.target.value }))}
                    placeholder="e.g., 2.500 (per pack/dozen)"
                  />
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Estimated per-piece cost:{" "}
                    <b>{mult > 0 && priceInputNum > 0 ? formatMoneyMax2(pricePerPiece) : "—"}</b> JOD / pc
                  </div>
                </div>

                <div className="field">
                  <label>Quantity Received (count of selected units)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    value={bForm.qtyReceived}
                    onChange={(e) => setBForm((s) => ({ ...s, qtyReceived: e.target.value }))}
                    placeholder="e.g., 5 (packs/dozens)"
                  />
                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Converted to base stock:{" "}
                    <b>{qtyBasePieces > 0 ? qtyBasePieces : "—"}</b> pcs
                  </div>
                </div>

                <div className="field">
                  <label>Supplier</label>
                  <select
                    value={bForm.supplierId || ""}
                    onChange={(e) => setBForm((s) => ({ ...s, supplierId: e.target.value }))}
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map((s0) => (
                      <option key={s0.id} value={s0.id}>
                        {s0.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input"
                    placeholder="Supplier Name (optional)"
                    value={bForm.supplierName}
                    onChange={(e) => setBForm((s) => ({ ...s, supplierName: e.target.value }))}
                    style={{ marginTop: 10 }}
                  />
                </div>

                <div className="field">
                  <label>Supplier Invoice No (optional)</label>
                  <input
                    className="input"
                    value={bForm.supplierInvoiceNo}
                    onChange={(e) => setBForm((s) => ({ ...s, supplierInvoiceNo: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="crm-btn crm-btn-primary" type="submit">
                  Receive
                </button>
              </div>
            </form>

            {/* Batches table */}
            {bForm.productId ? (
              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: "0 0 10px" }}>Batches for selected product</h4>
                {batchesLoading ? <p className="muted">Loading batches…</p> : null}
                {!batchesLoading && batches.length === 0 ? <p className="muted">No batches yet.</p> : null}

                {batches.length ? (
                  <div className="table-wrap" style={{ marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Lot</th>
                          <th>Date</th>
                          <th>Expiry</th>
                          <th>Received</th>
                          <th>Cost</th>
                          <th>Status</th>
                          <th>Supplier</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((batch) => {
                          const status = expiryBadge(batch.expiryStatus);

                          const qUom = batch.qtyUom || "piece";
                          const qMult = Number(batch.qtyUomMultiplier || 1) || 1;
                          const qInput = Number(batch.qtyInput ?? 0) || 0;

                          const pInput = batch.purchasePriceInputJod;
                          const pPerPc = batch.purchasePriceJod;

                          return (
                            <tr key={batch.id}>
                              <td style={{ fontWeight: 900 }}>{batch.lotNumber}</td>
                              <td>{formatDateTime(batch.purchaseDate)}</td>
                              <td>{formatDateTime(batch.expiryDate)}</td>

                              <td>
                                <div style={{ fontWeight: 800 }}>
                                  {qInput} × {prettyUom(qUom, qMult)}{" "}
                                  <span className="muted">
                                    ({Number(batch.qtyReceived || 0)} pcs)
                                  </span>
                                </div>
                                <div className="muted" style={{ fontSize: 12 }}>
                                  1 {prettyUom(qUom, qMult)} = {qMult} pcs
                                </div>
                              </td>

                              <td>
                                {canSeePurchase ? (
                                  <>
                                    <div style={{ fontWeight: 800 }}>
                                      {pInput != null ? `${formatMoneyMax2(pInput)} / ${prettyUom(batch.purchasePriceUom || qUom, qMult)}` : "—"}
                                    </div>
                                    <div className="muted" style={{ fontSize: 12 }}>
                                      {pPerPc != null ? `${formatMoneyMax2(pPerPc)} / pc` : "—"}
                                    </div>
                                  </>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>

                              <td>
                                <span style={{ color: status.color, fontWeight: 800 }}>
                                  {status.label}
                                </span>
                              </td>
                              <td>{batch.supplierName || "—"}</td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button className="crm-btn crm-btn-outline" type="button" onClick={() => voidBatch(batch.id)}>
                                  void
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
