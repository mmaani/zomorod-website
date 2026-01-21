import React from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth.js";

export default function ProductsPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const canSeePurchase = hasRole("main") || hasRole("doctor");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/products");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load products");
      setItems(json.data || []);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Products</h2>

      {loading ? <div>Loading...</div> : null}
      {error ? <div style={{ color: "crimson" }}>{error}</div> : null}

      {!loading && !error ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Code</th>
              <th align="left">Official</th>
              <th align="left">Market</th>
              <th align="left">Category</th>
              <th align="right">Qty Received</th>
              {canSeePurchase ? <th align="right">Avg Purchase (JOD)</th> : null}
              <th align="right">Selling (JOD)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.productCode}</td>
                <td>{p.officialName}</td>
                <td>{p.marketName || "-"}</td>
                <td>{p.category || "-"}</td>
                <td align="right">{p.qtyReceived}</td>
                {canSeePurchase ? <td align="right">{p.avgPurchasePriceJod ?? "-"}</td> : null}
                <td align="right">{p.baseSellingPriceJod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <button onClick={load}>Refresh</button>
      </div>
    </div>
  );
}
