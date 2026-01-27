import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import { getUser, hasRole } from "../auth";

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
    purchasePriceJod: "",
    qtyReceived: "",
    supplierName: "",
    supplierInvoiceNo: "",
  });

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

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  useEffect(() => {
    if (isMain && bForm.productId) loadBatches(Number(bForm.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bForm.productId]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      label: `${p.productCode} — ${p.officialName}${p.archivedAt ? " (archived)" : ""}`,
    }));
  }, [products]);

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
      setErr("productCode and officialName are required");
      return;
    }

    try {
      const res = await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
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

    const payload = {
      productId: Number(bForm.productId),
      lotNumber: String(bForm.lotNumber || "").trim(),
      purchaseDate: String(bForm.purchaseDate || "").trim(),
      expiryDate: String(bForm.expiryDate || "").trim() || null,
      purchasePriceJod: Number(bForm.purchasePriceJod || 0),
      qtyReceived: Number(bForm.qtyReceived || 0),
      supplierName: String(bForm.supplierName || "").trim() || null,
      supplierInvoiceNo: String(bForm.supplierInvoiceNo || "").trim() || null,
    };

    if (!payload.productId || !payload.lotNumber || !payload.purchaseDate || payload.qtyReceived <= 0) {
      setErr("product, lotNumber, purchaseDate, and qtyReceived are required");
      return;
    }

    try {
      const res = await apiFetch("/api/batches", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Keep product selected; clear other fields
      setBForm((s) => ({
        ...s,
        lotNumber: "",
        purchaseDate: "",
        expiryDate: "",
        purchasePriceJod: "",
        qtyReceived: "",
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
        body: JSON.stringify({ id: p.id, archived: !p.archivedAt }),
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
    if (!confirm(`Delete product "${p.productCode}" permanently? This only works if it has no batches/movements/tiers.`)) {
      return;
    }
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
    if (!confirm("Void this batch? This will reduce stock and affect average cost.")) return;

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
    <div className="crm-wrap">
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Products</h2>

          <label className="muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Category</th>
                <th>Official</th>
                <th>Market</th>
                <th>On-hand</th>
                <th>Sell Price (JOD)</th>
                {canSeePurchase ? <th>Avg Purchase (JOD)</th> : null}
                {canSeePurchase ? <th>Last Purchase Date</th> : null}
                <th>Tiers</th>
                {isMain ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {!loading && products.length === 0 ? (
                <tr>
                  <td colSpan={isMain ? (canSeePurchase ? 10 : 8) : (canSeePurchase ? 9 : 7)} className="muted">
                    No products yet.
                  </td>
                </tr>
              ) : null}

              {products.map((p) => (
                <tr key={p.id} style={p.archivedAt ? { opacity: 0.65 } : undefined}>
                  <td>
                    {p.productCode}
                    {p.archivedAt ? <span className="muted"> {" "} (archived)</span> : null}
                  </td>
                  <td>{p.category}</td>
                  <td>{p.officialName}</td>
                  <td>{p.marketName}</td>
                  <td>{p.onHandQty}</td>
                  <td>{p.defaultSellPriceJod}</td>

                  {canSeePurchase ? <td>{p.avgPurchasePriceJod ?? ""}</td> : null}
                  {canSeePurchase ? <td>{p.lastPurchaseDate ?? ""}</td> : null}

                  <td>
                    {Array.isArray(p.priceTiers) && p.priceTiers.length ? (
                      <ul className="list" style={{ margin: 0 }}>
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
                      <button className="button button--ghost" type="button" onClick={() => toggleArchive(p)}>
                        {p.archivedAt ? "Unarchive" : "Archive"}
                      </button>
                      {" "}
                      <button className="button button--ghost" type="button" onClick={() => deleteProduct(p)}>
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
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Add Product (Main only)</h3>
          <form className="form" onSubmit={onAddProduct}>
            <div className="field">
              <label>Product Code</label>
              <input
                value={pForm.productCode}
                onChange={(e) => setPForm((s) => ({ ...s, productCode: e.target.value }))}
                placeholder="e.g., S-L11"
              />
            </div>

            <div className="field">
              <label>Category</label>
              <input
                value={pForm.category}
                onChange={(e) => setPForm((s) => ({ ...s, category: e.target.value }))}
                placeholder="e.g., Mask"
              />
            </div>

            <div className="field">
              <label>Official Name</label>
              <input
                value={pForm.officialName}
                onChange={(e) => setPForm((s) => ({ ...s, officialName: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Market Name</label>
              <input
                value={pForm.marketName}
                onChange={(e) => setPForm((s) => ({ ...s, marketName: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Default Sell Price (JOD)</label>
              <input
                type="number"
                step="0.001"
                value={pForm.defaultSellPriceJod}
                onChange={(e) => setPForm((s) => ({ ...s, defaultSellPriceJod: e.target.value }))}
              />
            </div>

            <button className="button button--primary" type="submit">
              Add
            </button>
          </form>
        </div>
      ) : null}

      {isMain ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Receive Batch / Lot (Main only)</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            Tip: If you enter the <strong>same Lot/Batch Number</strong> again for the same product, it will <strong>add quantity</strong> to that lot and update its average cost.
          </p>

          <form className="form" onSubmit={onReceiveBatch}>
            <div className="field">
              <label>Select product…</label>
              <select
                value={bForm.productId}
                onChange={(e) => setBForm((s) => ({ ...s, productId: e.target.value }))}
              >
                <option value="">Select product…</option>
                {productOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Lot/Batch Number</label>
              <input
                value={bForm.lotNumber}
                onChange={(e) => setBForm((s) => ({ ...s, lotNumber: e.target.value }))}
                placeholder="e.g., LOT-2026-001"
              />
            </div>

            <div className="field">
              <label>Purchase Date (YYYY-MM-DD)</label>
              <input
                value={bForm.purchaseDate}
                onChange={(e) => setBForm((s) => ({ ...s, purchaseDate: e.target.value }))}
                placeholder="2026-01-21"
              />
            </div>

            <div className="field">
              <label>Expiry Date (YYYY-MM-DD) optional</label>
              <input
                value={bForm.expiryDate}
                onChange={(e) => setBForm((s) => ({ ...s, expiryDate: e.target.value }))}
                placeholder="2027-01-21"
              />
            </div>

            <div className="field">
              <label>Purchase Price (JOD)</label>
              <input
                type="number"
                step="0.001"
                value={bForm.purchasePriceJod}
                onChange={(e) => setBForm((s) => ({ ...s, purchasePriceJod: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Quantity Received</label>
              <input
                type="number"
                step="1"
                value={bForm.qtyReceived}
                onChange={(e) => setBForm((s) => ({ ...s, qtyReceived: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Supplier Name </label>
              <select
 value={bForm.supplierId || ""}
       onChange={(e) => setBForm({ ...bForm, supplierId: e.target.value ? Number(e.target.value) : null })}
     >
       <option value="">Select supplier...</option>
       {suppliers.map((s) => (
         <option key={s.id} value={s.id}>{s.name}</option>
       ))}
     </select>
     <input
       placeholder="Supplier Name (optional)"
       value={bForm.supplierName}
       onChange={(e) => setBForm({ ...bForm, supplierName: e.target.value })}
     />


            </div>

            <div className="field">
              <label>Supplier Invoice No (optional)</label>
              <input
                value={bForm.supplierInvoiceNo}
                onChange={(e) => setBForm((s) => ({ ...s, supplierInvoiceNo: e.target.value }))}
              />
            </div>

            <button className="button button--primary" type="submit">
              Receive
            </button>
          </form>

          {bForm.productId ? (
            <div style={{ marginTop: 18 }}>
              <h4 style={{ margin: "0 0 10px" }}>Batches for selected product</h4>
              {batchesLoading ? <p className="muted">Loading batches…</p> : null}
              {!batchesLoading && batches.length === 0 ? <p className="muted">No batches yet.</p> : null}

              {batches.length ? (
                <div className="table">
                  <table>
                    <thead>
                      <tr>
                        <th>Lot</th>
                        <th>Date</th>
                        <th>Qty</th>
                        <th>Price (JOD)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b) => (
                        <tr key={b.id}>
                          <td>{b.lotNumber}</td>
                          <td>{b.purchaseDate}</td>
                          <td>{b.qtyReceived}</td>
                          <td>{b.purchasePriceJod ?? ""}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <button className="button button--ghost" type="button" onClick={() => voidBatch(b.id)}>
                              Void
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
