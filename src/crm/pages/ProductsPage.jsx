import { useEffect, useMemo, useState } from "react";
import { getToken, getUser } from "../auth.js";

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.detail || `HTTP ${res.status}`);
  return data;
}

export default function ProductsPage() {
  const me = getUser(); // should include roles array
  const roles = useMemo(() => (me?.roles || []), [me]);
  const canManage = roles.includes("main");
  const canSeePurchase = roles.includes("main") || roles.includes("doctor");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);

  // Add product form
  const [newP, setNewP] = useState({
    productCode: "",
    category: "",
    officialName: "",
    marketName: "",
    defaultSellPriceJod: 0,
  });

  // Receive batch form
  const [batch, setBatch] = useState({
    productId: "",
    lotNumber: "",
    purchaseDate: "",
    expiryDate: "",
    purchasePriceJod: "",
    quantityReceived: "",
    supplierName: "",
    supplierInvoiceNo: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/products");
      setProducts(data.products || []);
    } catch (e) {
      setError(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct(e) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/api/products", { method: "POST", body: JSON.stringify(newP) });
      setNewP({ productCode: "", category: "", officialName: "", marketName: "", defaultSellPriceJod: 0 });
      await load();
    } catch (e2) {
      setError(e2.message || "Failed to add product");
    }
  }

  async function receiveBatch(e) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...batch,
        productId: Number(batch.productId),
        purchasePriceJod: Number(batch.purchasePriceJod),
        quantityReceived: Number(batch.quantityReceived),
      };
      await apiFetch("/api/batches", { method: "POST", body: JSON.stringify(payload) });
      setBatch({
        productId: "",
        lotNumber: "",
        purchaseDate: "",
        expiryDate: "",
        purchasePriceJod: "",
        quantityReceived: "",
        supplierName: "",
        supplierInvoiceNo: "",
      });
      await load();
    } catch (e2) {
      setError(e2.message || "Failed to receive batch");
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Products</h2>

      {error ? (
        <div style={{ background: "#ffe5e5", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      {loading ? <p>Loading…</p> : null}

      {!loading ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Code</th>
                <th style={th}>Category</th>
                <th style={th}>Official</th>
                <th style={th}>Market</th>
                <th style={th}>On-hand</th>
                <th style={th}>Sell Price (JOD)</th>
                {canSeePurchase ? <th style={th}>Last Purchase (JOD)</th> : null}
                {canSeePurchase ? <th style={th}>Last Purchase Date</th> : null}
                <th style={th}>Tiers</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={td}>{p.productCode}</td>
                  <td style={td}>{p.category}</td>
                  <td style={td}>{p.officialName}</td>
                  <td style={td}>{p.marketName}</td>
                  <td style={td}>{p.onHandQty}</td>
                  <td style={td}>{Number(p.defaultSellPriceJod || 0).toFixed(3)}</td>
                  {canSeePurchase ? <td style={td}>{p.lastPurchasePriceJod ? Number(p.lastPurchasePriceJod).toFixed(3) : "-"}</td> : null}
                  {canSeePurchase ? <td style={td}>{p.lastPurchaseDate || "-"}</td> : null}
                  <td style={td}>
                    {(p.priceTiers || []).length
                      ? p.priceTiers.map((t) => `≥${t.minQty}: ${Number(t.unitPriceJod).toFixed(3)}`).join(" | ")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canManage ? (
        <>
          <hr style={{ margin: "18px 0" }} />
          <h3>Add Product (Main only)</h3>
          <form onSubmit={addProduct} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <input placeholder="Product Code" value={newP.productCode} onChange={(e) => setNewP({ ...newP, productCode: e.target.value })} />
            <input placeholder="Category" value={newP.category} onChange={(e) => setNewP({ ...newP, category: e.target.value })} />
            <input placeholder="Official Name" value={newP.officialName} onChange={(e) => setNewP({ ...newP, officialName: e.target.value })} />
            <input placeholder="Market Name" value={newP.marketName} onChange={(e) => setNewP({ ...newP, marketName: e.target.value })} />
            <input
              placeholder="Default Sell Price (JOD)"
              type="number"
              step="0.001"
              value={newP.defaultSellPriceJod}
              onChange={(e) => setNewP({ ...newP, defaultSellPriceJod: e.target.value })}
            />
            <button type="submit">Add</button>
          </form>

          <hr style={{ margin: "18px 0" }} />
          <h3>Receive Batch / Lot (Main only)</h3>
          <form onSubmit={receiveBatch} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
            <select value={batch.productId} onChange={(e) => setBatch({ ...batch, productId: e.target.value })}>
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productCode} — {p.officialName}
                </option>
              ))}
            </select>

            <input placeholder="Lot/Batch Number" value={batch.lotNumber} onChange={(e) => setBatch({ ...batch, lotNumber: e.target.value })} />
            <input placeholder="Purchase Date (YYYY-MM-DD)" value={batch.purchaseDate} onChange={(e) => setBatch({ ...batch, purchaseDate: e.target.value })} />
            <input placeholder="Expiry Date (YYYY-MM-DD) optional" value={batch.expiryDate} onChange={(e) => setBatch({ ...batch, expiryDate: e.target.value })} />
            <input placeholder="Purchase Price (JOD)" type="number" step="0.001" value={batch.purchasePriceJod} onChange={(e) => setBatch({ ...batch, purchasePriceJod: e.target.value })} />
            <input placeholder="Quantity Received" type="number" value={batch.quantityReceived} onChange={(e) => setBatch({ ...batch, quantityReceived: e.target.value })} />
            <input placeholder="Supplier Name (optional)" value={batch.supplierName} onChange={(e) => setBatch({ ...batch, supplierName: e.target.value })} />
            <input placeholder="Supplier Invoice No (optional)" value={batch.supplierInvoiceNo} onChange={(e) => setBatch({ ...batch, supplierInvoiceNo: e.target.value })} />

            <button type="submit">Receive</button>
          </form>
        </>
      ) : null}
    </div>
  );
}

const th = { borderBottom: "1px solid #ddd", textAlign: "left", padding: 8, fontWeight: 700 };
const td = { borderBottom: "1px solid #f0f0f0", padding: 8, verticalAlign: "top" };
