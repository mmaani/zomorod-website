// src/crm/pages/ProductsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { getUser, hasRole } from "../auth";

function normalize(v) {
  return String(v ?? "").trim();
}
function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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
    maximumFractionDigits: 2,
  }).format(n);
}

function formatMoneyMax4(value) {
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

function parseMultiplier(qtyUom, customPackSize) {
  const u = String(qtyUom || "piece").toLowerCase().trim();
  if (u === "piece") return 1;
  if (u === "dozen") return 12;

  const m = u.match(/^pack(\d+)$/);
  if (m) {
    const k = Math.floor(Number(m[1]));
    return k > 0 ? k : 0;
  }

  if (u === "custom") {
    const k = Math.floor(Number(customPackSize || 0));
    return k > 0 ? k : 0;
  }

  return 0;
}

function labelForUom(u) {
  const s = String(u || "piece");
  if (s === "piece") return "Piece";
  if (s === "dozen") return "Dozen (12)";
  const m = s.match(/^pack(\d+)$/);
  if (m) return `Box/Pack of ${m[1]}`;
  if (s === "custom") return "Custom pack size";
  return s;
}

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

  // ✅ Robustness: ensure products have valid numeric IDs (prevents “first item weirdness”)
  const productsSafe = useMemo(() => {
    return (Array.isArray(products) ? products : [])
      .map((p) => ({ ...p, id: toInt(p?.id) }))
      .filter((p) => toInt(p.id) > 0);
  }, [products]);

  const selectedProduct = useMemo(() => {
    const pid = toInt(bForm.productId);
    if (!pid) return null;
    return productsSafe.find((p) => toInt(p.id) === pid) || null;
  }, [productsSafe, bForm.productId]);

  const productOptions = useMemo(() => {
    return productsSafe.map((p) => {
      const code = normalize(p.productCode);
      const name = normalize(p.officialName);
      const labelCore = code && name ? `${code} — ${name}` : name || code || `Product #${p.id}`;
      return {
        id: p.id,
        label: `${labelCore}${p.archivedAt ? " (archived)" : ""}`,
      };
    });
  }, [productsSafe]);

  const receivePreview = useMemo(() => {
    const mult = parseMultiplier(bForm.qtyUom, bForm.customPackSize);
    const qtyUnits = Math.floor(Number(bForm.qtyReceived || 0));
    const pricePerUnit = Number(bForm.purchasePriceJod || 0);

    const qtyPieces = mult > 0 && qtyUnits > 0 ? qtyUnits * mult : 0;
    const pricePerPiece = mult > 0 && pricePerUnit > 0 ? pricePerUnit / mult : 0;

    return { mult, qtyUnits, qtyPieces, pricePerUnit, pricePerPiece };
  }, [bForm.qtyUom, bForm.customPackSize, bForm.qtyReceived, bForm.purchasePriceJod]);

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
    const pid = toInt(productId);
    if (!pid) {
      setBatches([]);
      return;
    }
    setBatchesLoading(true);
    setErr("");
    try {
      const res = await apiFetch(`/api/batches?productId=${pid}`);
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
    // only main loads batches
    if (isMain && bForm.productId) loadBatches(bForm.productId);
    if (!bForm.productId) setBatches([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bForm.productId]);

  async function onAddProduct(e) {
    e.preventDefault();
    setErr("");

    const payload = {
      productCode: normalize(pForm.productCode),
      category: normalize(pForm.category),
      officialName: normalize(pForm.officialName),
      marketName: normalize(pForm.marketName),
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

    const productId = toInt(bForm.productId);
    const qtyUom = normalize(bForm.qtyUom) || "piece";
    const mult = parseMultiplier(qtyUom, bForm.customPackSize);

    const payload = {
      productId,
      lotNumber: normalize(bForm.lotNumber),
      purchaseDate: normalize(bForm.purchaseDate),
      expiryDate: normalize(bForm.expiryDate) || null,

      // api/batches.js interprets qtyReceived as "qty input in selected unit"
      qtyReceived: Math.floor(Number(bForm.qtyReceived || 0)),
      qtyUom,
      customPackSize: qtyUom === "custom" ? Math.floor(Number(bForm.customPackSize || 0)) : null,

      // api/batches.js interprets purchasePriceJod as "price per selected unit"
      purchasePriceJod: Number(bForm.purchasePriceJod || 0),

      supplierId: bForm.supplierId ? toInt(bForm.supplierId) : null,
      supplierName: normalize(bForm.supplierName) || null,
      supplierInvoiceNo: normalize(bForm.supplierInvoiceNo) || null,
    };

    if (!payload.productId) return setErr("Please select a product.");
    if (!payload.lotNumber) return setErr("Lot Number is required.");
    if (!payload.purchaseDate) return setErr("Purchase Date is required.");

    if (!payload.qtyUom) return setErr("Received Unit is required.");
    if (!mult || mult <= 0) return setErr("Invalid Received Unit / pack size.");
    if (payload.qtyUom === "custom" && (!payload.customPackSize || payload.customPackSize <= 0)) {
      return setErr("Custom pack size must be > 0.");
    }

    if (!Number.isFinite(payload.qtyReceived) || payload.qtyReceived <= 0) {
      return setErr("Quantity Received must be > 0.");
    }
    if (!Number.isFinite(payload.purchasePriceJod) || payload.purchasePriceJod <= 0) {
      return setErr("Purchase Price must be > 0.");
    }

    try {
      const res = await apiFetch("/api/batches", { method: "POST", body: payload });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Keep product + UOM; clear rest
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
    if (!window.confirm(`Delete product "${p.productCode}" permanently?\n\nOnly works if it has no batches/movements/tiers.`)) return;
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
    if (!window.confirm("Void this batch?\n\nThis will reduce stock and can affect average cost.")) return;
    try {
      const res = await apiFetch(`/api/batches?id=${batchId}`, { method: "DELETE" });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      await loadProducts();
      if (bForm.productId) await loadBatches(bForm.productId);
    } catch (e) {
      setErr(e?.message || "Failed to void batch");
    }
  }

  return (
    <div className="crm-content">
      <div className="crm-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Products</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Manage SKUs, pricing, and inventory batches.
            </div>
          </div>

          <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
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
              {!loading && productsSafe.length === 0 ? (
                <tr>
                  <td colSpan={isMain ? (canSeePurchase ? 10 : 8) : canSeePurchase ? 9 : 7} className="muted">
                    No products yet.
                  </td>
                </tr>
              ) : null}

              {productsSafe.map((p) => (
                <tr key={p.id} style={p.archivedAt ? { opacity: 0.65 } : undefined}>
                  <td>
                    <div style={{ fontWeight: 900 }}>{p.productCode}</div>
                    {p.archivedAt ? <div className="muted" style={{ fontSize: 12 }}>(archived)</div> : null}
                  </td>
                  <td>{p.category || <span className="muted">—</span>}</td>
                  <td>{p.officialName || <span className="muted">—</span>}</td>
                  <td>{p.marketName || <span className="muted">—</span>}</td>
                  <td style={{ fontWeight: 900 }}>{Number(p.onHandQty || 0)}</td>
                  <td>{formatMoneyMax2(p.defaultSellPriceJod)}</td>
                  {canSeePurchase ? <td>{formatMoneyMax4(p.avgPurchasePriceJod)}</td> : null}
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

      {isMain ? (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
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

          <div className="crm-card">
            <h3 style={{ marginTop: 0 }}>Receive Batch (Main only)</h3>

            {selectedProduct ? (
              <div className="dash-note" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  Selected: {selectedProduct.productCode} — {selectedProduct.officialName}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  On-hand: <b>{Number(selectedProduct.onHandQty || 0)}</b> pcs
                  {canSeePurchase && selectedProduct.avgPurchasePriceJod != null ? (
                    <>
                      {" "}
                      • Avg purchase: <b>{formatMoneyMax4(selectedProduct.avgPurchasePriceJod)}</b> JOD/pc
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
                    className="input"
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
                  <input className="input" value={bForm.lotNumber} onChange={(e) => setBForm((s) => ({ ...s, lotNumber: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Purchase Date</label>
                  <input className="input" type="date" value={bForm.purchaseDate} onChange={(e) => setBForm((s) => ({ ...s, purchaseDate: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Expiry Date (optional)</label>
                  <input className="input" type="date" value={bForm.expiryDate} onChange={(e) => setBForm((s) => ({ ...s, expiryDate: e.target.value }))} />
                </div>

                <div className="field">
                  <label>Received Unit</label>
                  <select className="input" value={bForm.qtyUom} onChange={(e) => setBForm((s) => ({ ...s, qtyUom: e.target.value }))}>
                    <option value="piece">Piece</option>
                    <option value="dozen">Dozen (12)</option>
                    <option value="pack10">Box/Pack of 10</option>
                    <option value="pack20">Box/Pack of 20</option>
                    <option value="pack25">Box/Pack of 25</option>
                    <option value="pack50">Box/Pack of 50</option>
                    <option value="pack100">Box/Pack of 100</option>
                    <option value="custom">Custom…</option>
                  </select>

                  {String(bForm.qtyUom) === "custom" ? (
                    <input
                      className="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Custom pack size (e.g., 75)"
                      value={bForm.customPackSize}
                      onChange={(e) => setBForm((s) => ({ ...s, customPackSize: e.target.value }))}
                      style={{ marginTop: 10 }}
                    />
                  ) : null}

                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Inventory is stored in <b>pieces</b>. We convert automatically.
                  </div>
                </div>

                <div className="field">
                  <label>Quantity Received (in selected unit)</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    value={bForm.qtyReceived}
                    onChange={(e) => setBForm((s) => ({ ...s, qtyReceived: e.target.value }))}
                    placeholder="e.g., 5 (boxes)"
                  />
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
                    placeholder="e.g., 12.50 (per box)"
                  />

                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Preview: <b>{receivePreview.qtyPieces || 0}</b> pcs total • Effective cost:{" "}
                    <b>{formatMoneyMax4(receivePreview.pricePerPiece || 0)}</b> JOD/pc • Unit: <b>{labelForUom(bForm.qtyUom)}</b>
                  </div>
                </div>

                <div className="field">
                  <label>Supplier</label>
                  <select className="input" value={bForm.supplierId || ""} onChange={(e) => setBForm((s) => ({ ...s, supplierId: e.target.value }))}>
                    <option value="">Select supplier…</option>
                    {suppliers.map((s) => {
                      const label =
                        normalize(s.legalName) ||
                        normalize(s.businessName) ||
                        normalize(s.name) ||
                        "—";
                      return (
                        <option key={s.id} value={s.id}>
                          {label}
                        </option>
                      );
                    })}
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
                          <th>Received (input)</th>
                          <th>Qty (pcs)</th>
                          {canSeePurchase ? <th>Price/unit</th> : null}
                          {canSeePurchase ? <th>Cost/pc</th> : null}
                          <th>Status</th>
                          <th>Supplier</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((batch) => {
                          const status = expiryBadge(batch.expiryStatus);

                          const qtyUom = batch.qtyUom || "piece";
                          const mult = Number(batch.qtyUomMultiplier || 1);
                          const qtyInput = Number(batch.qtyInput || 0);
                          const qtyPcs = Number(batch.qtyReceived || 0);

                          const pricePerUnit = Number(batch.purchasePriceInputJod || 0);
                          const costPerPc = Number(batch.purchasePriceJod || 0);

                          return (
                            <tr key={batch.id}>
                              <td style={{ fontWeight: 900 }}>{batch.lotNumber}</td>
                              <td>{formatDateTime(batch.purchaseDate)}</td>
                              <td>{formatDateTime(batch.expiryDate)}</td>

                              <td>
                                <b>{qtyInput}</b> {labelForUom(qtyUom)}
                                {mult > 1 ? <span className="muted"> (×{mult})</span> : null}
                              </td>

                              <td>{qtyPcs}</td>

                              {canSeePurchase ? <td>{pricePerUnit ? `${formatMoneyMax4(pricePerUnit)}` : "—"}</td> : null}
                              {canSeePurchase ? <td>{costPerPc ? `${formatMoneyMax4(costPerPc)}` : "—"}</td> : null}

                              <td>
                                <span style={{ color: status.color, fontWeight: 800 }}>{status.label}</span>
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
