// ProductsPage.jsx (only the changes you need)
// Replace your bForm init + Receive Batch form fields + payload build + batches table columns accordingly.

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { getUser, hasRole } from "../auth";

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
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function expiryBadge(status) {
  if (status === "EXPIRED") return { label: "Expired", color: "#ef4444" };
  if (status === "EXPIRING_SOON") return { label: "Expiring soon", color: "#f59e0b" };
  if (status === "GOOD") return { label: "Good", color: "#22c55e" };
  return { label: "No expiry", color: "#94a3b8" };
}

const UOM_OPTIONS = [
  { value: "piece", label: "Piece" },
  { value: "dozen", label: "Dozen (12)" },
  { value: "pack10", label: "Pack/Box of 10" },
  { value: "pack20", label: "Pack/Box of 20" },
  { value: "pack25", label: "Pack/Box of 25" },
  { value: "pack50", label: "Pack/Box of 50" },
  { value: "pack100", label: "Pack/Box of 100" },
  { value: "custom", label: "Custom pack size…" },
];

function uomMultiplier(uom, customPackSize) {
  if (uom === "piece") return 1;
  if (uom === "dozen") return 12;
  const m = String(uom || "").match(/^pack(\d+)$/);
  if (m) return Math.max(1, Number(m[1]) || 1);
  if (uom === "custom") {
    const k = Math.floor(Number(customPackSize || 0));
    return k > 0 ? k : 0;
  }
  return 0;
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

    // Purchase price is "per selected unit"
    purchasePriceJod: "",

    // Quantity in selected unit
    qtyReceived: "",

    qtyUom: "piece",
    customPackSize: "",

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
  const qtyInputNum = useMemo(() => Math.floor(Number(bForm.qtyReceived || 0)), [bForm.qtyReceived]);
  const totalPiecesPreview = useMemo(() => (mult > 0 ? qtyInputNum * mult : 0), [qtyInputNum, mult]);
  const unitCostPerPiecePreview = useMemo(() => {
    const priceInput = Number(bForm.purchasePriceJod || 0);
    if (!(priceInput > 0) || !(mult > 0)) return 0;
    return priceInput / mult;
  }, [bForm.purchasePriceJod, mult]);

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

  async function onReceiveBatch(e) {
    e.preventDefault();
    setErr("");

    const payload = {
      productId: Number(bForm.productId),
      lotNumber: String(bForm.lotNumber || "").trim(),
      purchaseDate: String(bForm.purchaseDate || "").trim(),
      expiryDate: String(bForm.expiryDate || "").trim() || null,

      // price per selected unit
      purchasePriceJod: Number(bForm.purchasePriceJod || 0),

      // qty in selected unit
      qtyReceived: Math.floor(Number(bForm.qtyReceived || 0)),

      qtyUom: bForm.qtyUom,
      customPackSize: bForm.qtyUom === "custom" ? Number(bForm.customPackSize || 0) : null,

      supplierId: bForm.supplierId ? Number(bForm.supplierId) : null,
      supplierName: String(bForm.supplierName || "").trim() || null,
      supplierInvoiceNo: String(bForm.supplierInvoiceNo || "").trim() || null,
    };

    if (!payload.productId) return setErr("Please select a product.");
    if (!payload.lotNumber) return setErr("Lot Number is required.");
    if (!payload.purchaseDate) return setErr("Purchase Date is required.");

    if (!Number.isFinite(payload.qtyReceived) || payload.qtyReceived <= 0) return setErr("Quantity Received must be > 0.");
    if (!Number.isFinite(payload.purchasePriceJod) || payload.purchasePriceJod <= 0) return setErr("Purchase Price must be > 0.");

    if (!payload.qtyUom) return setErr("Unit is required.");
    if (payload.qtyUom === "custom") {
      const k = Math.floor(Number(payload.customPackSize || 0));
      if (!(k > 0)) return setErr("Custom pack size must be a positive number.");
    }

    try {
      const res = await apiFetch("/api/batches", { method: "POST", body: payload });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Keep selected product; clear other fields
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

  return (
    <div className="crm-content">
      {/* ... keep your Products table exactly as-is ... */}

      {isMain ? (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {/* ... keep Add Product form as-is ... */}

          <div className="crm-card">
            <h3 style={{ marginTop: 0 }}>Receive Batch (Main only)</h3>

            {selectedProduct ? (
              <div className="dash-note" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  Selected: {selectedProduct.productCode} — {selectedProduct.officialName}
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  On-hand: <b>{Number(selectedProduct.onHandQty || 0)}</b> pcs
                </div>
              </div>
            ) : null}

            <form className="crm-form" onSubmit={onReceiveBatch}>
              <div className="grid grid-2">
                <div className="field">
                  <label>Product</label>
                  <select value={bForm.productId} onChange={(e) => setBForm((s) => ({ ...s, productId: e.target.value }))}>
                    <option value="">Select product…</option>
                    {productOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
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
                  <label>Unit</label>
                  <select value={bForm.qtyUom} onChange={(e) => setBForm((s) => ({ ...s, qtyUom: e.target.value }))}>
                    {UOM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {bForm.qtyUom === "custom" ? (
                    <input
                      className="input"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Units per pack (e.g., 30)"
                      value={bForm.customPackSize}
                      onChange={(e) => setBForm((s) => ({ ...s, customPackSize: e.target.value }))}
                      style={{ marginTop: 10 }}
                    />
                  ) : null}

                  <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Inventory is stored in <b>pieces</b>. Selected unit converts to pieces automatically.
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
                  />
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Total pieces to add: <b>{totalPiecesPreview || 0}</b>
                  </div>
                </div>

                <div className="field">
                  <label>Purchase Price (JOD) — per selected unit</label>
                  <input
                    className="input"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={bForm.purchasePriceJod}
                    onChange={(e) => setBForm((s) => ({ ...s, purchasePriceJod: e.target.value }))}
                  />
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Unit cost per piece: <b>{unitCostPerPiecePreview ? unitCostPerPiecePreview.toFixed(4) : "0.0000"}</b> JOD
                  </div>
                </div>

                <div className="field">
                  <label>Supplier</label>
                  <select value={bForm.supplierId || ""} onChange={(e) => setBForm((s) => ({ ...s, supplierId: e.target.value }))}>
                    <option value="">Select supplier…</option>
                    {suppliers.map((sp) => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
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
                  <input className="input" value={bForm.supplierInvoiceNo} onChange={(e) => setBForm((s) => ({ ...s, supplierInvoiceNo: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="crm-btn crm-btn-primary" type="submit">Receive</button>
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
                          <th>Base (pcs)</th>
                          <th>Price / unit</th>
                          <th>Cost / pc</th>
                          <th>Status</th>
                          <th>Supplier</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((batch) => {
                          const status = expiryBadge(batch.expiryStatus);
                          const qtyInput = Number(batch.qtyInput ?? 0);
                          const qtyUom = String(batch.qtyUom || "piece");
                          const priceInput = Number(batch.purchasePriceInputJod ?? 0);
                          const costPerPc = Number(batch.purchasePriceJod ?? 0);

                          return (
                            <tr key={batch.id}>
                              <td style={{ fontWeight: 900 }}>{batch.lotNumber}</td>
                              <td>{formatDateTime(batch.purchaseDate)}</td>
                              <td>{formatDateTime(batch.expiryDate)}</td>
                              <td>{qtyInput} {qtyUom}</td>
                              <td>{Number(batch.qtyReceived || 0)}</td>
                              <td>{formatMoneyMax2(priceInput)}</td>
                              <td>{Number.isFinite(costPerPc) ? costPerPc.toFixed(4) : "—"}</td>
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

      {err ? <div className="banner">{err}</div> : null}
      {loading ? <p className="muted">Loading…</p> : null}
    </div>
  );
}
