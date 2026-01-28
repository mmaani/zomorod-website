// SalesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

function emptyLine() {
  return { productId: "", qty: "", unitPriceJod: "" };
}

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);

  const [form, setForm] = useState({
    clientId: "",
    salespersonId: "", // optional -> API will default
    saleDate: "",
    items: [emptyLine()],
  });

  const itemsNormalized = useMemo(() => {
    return form.items.map((it) => ({
      productId: it.productId,
      qty: Number(it.qty || 0),
      unitPriceJod: Number(it.unitPriceJod || 0),
    }));
  }, [form.items]);

  const totalJod = useMemo(() => {
    const t = itemsNormalized.reduce((sum, it) => {
      if (!it.productId || !it.qty || !it.unitPriceJod) return sum;
      return sum + it.qty * it.unitPriceJod;
    }, 0);
    return Number(t.toFixed(3));
  }, [itemsNormalized]);

  // Build on-hand map
  const onHandByProductId = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(String(p.id), Number(p.onHandQty || 0));
    return m;
  }, [products]);

  // Merge qty per product to validate stock correctly if user repeats same product in multiple lines
  const stockCheck = useMemo(() => {
    const merged = new Map(); // productId -> qty
    for (const it of itemsNormalized) {
      if (!it.productId) continue;
      const key = String(it.productId);
      merged.set(key, (merged.get(key) || 0) + (it.qty || 0));
    }
    for (const [pid, reqQty] of merged.entries()) {
      const onHand = onHandByProductId.get(pid) ?? 0;
      if (reqQty > onHand) return { ok: false, productId: pid, onHand, requested: reqQty };
    }
    return { ok: true };
  }, [itemsNormalized, onHandByProductId]);

  async function load() {
    const [saleRes, clientRes, prodRes, spRes] = await Promise.all([
      apiFetch("/api/sales"),
      apiFetch("/api/clients"),
      apiFetch("/api/products?includeArchived=1"),
      apiFetch("/api/salespersons"),
    ]);

    if (saleRes) {
      const saleData = await saleRes.json().catch(() => ({}));
      if (saleRes.ok && saleData.ok) setSales(saleData.sales || []);
    }
    if (clientRes) {
      const clientData = await clientRes.json().catch(() => ({}));
      if (clientRes.ok && clientData.ok) setClients(clientData.clients || []);
    }
    if (prodRes) {
      const prodData = await prodRes.json().catch(() => ({}));
      if (prodRes.ok && prodData.ok) setProducts(prodData.products || []);
    }
    if (spRes) {
      const spData = await spRes.json().catch(() => ({}));
      if (spRes.ok && spData.ok) setSalespersons(spData.salespersons || []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateLine(idx, patch) {
    setForm((s) => {
      const next = [...s.items];
      next[idx] = { ...next[idx], ...patch };
      return { ...s, items: next };
    });
  }

  function addLine() {
    setForm((s) => ({ ...s, items: [...s.items, emptyLine()] }));
  }

  function removeLine(idx) {
    setForm((s) => {
      const next = s.items.filter((_, i) => i !== idx);
      return { ...s, items: next.length ? next : [emptyLine()] };
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.clientId || !form.saleDate) {
      alert("Please select client and date");
      return;
    }

    // Validate lines
    const cleaned = form.items
      .map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        unitPriceJod: Number(it.unitPriceJod),
      }))
      .filter((it) => it.productId && it.qty && it.unitPriceJod);

    if (!cleaned.length) {
      alert("Add at least one product line (product, qty, price).");
      return;
    }

    for (const it of cleaned) {
      if (!Number.isFinite(it.qty) || it.qty <= 0) return alert("Quantity must be > 0");
      if (!Number.isFinite(it.unitPriceJod) || it.unitPriceJod <= 0) return alert("Unit price must be > 0");
    }

    if (!stockCheck.ok) {
      alert(`Not enough stock for productId=${stockCheck.productId}. Requested=${stockCheck.requested}, Available=${stockCheck.onHand}`);
      return;
    }

    const res = await apiFetch("/api/sales", {
      method: "POST",
      body: {
        clientId: Number(form.clientId),
        salespersonId: form.salespersonId ? Number(form.salespersonId) : null,
        saleDate: form.saleDate,
        items: cleaned,
      },
    });

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to record sale");
      return;
    }

    setForm({ clientId: "", salespersonId: "", saleDate: "", items: [emptyLine()] });
    load();
  };

  const handleVoid = async (id) => {
    if (!window.confirm("Void this sale transaction? Stock will be restored.")) return;
    const res = await apiFetch(`/api/sales?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) alert(data?.error || "Failed to void sale");
    load();
  };

  return (
    <div className="container">
      <h2>Sales</h2>

      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>Record Sale (multi-product)</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select value={form.salespersonId} onChange={(e) => setForm({ ...form, salespersonId: e.target.value })}>
              <option value="">Salesperson (default if empty)</option>
              {salespersons.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.displayName}
                </option>
              ))}
            </select>

            <input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h4 style={{ margin: 0 }}>Items</h4>
              <button type="button" onClick={addLine}>
                + Add product
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {form.items.map((it, idx) => {
                const onHand = it.productId ? (onHandByProductId.get(String(it.productId)) ?? 0) : null;

                return (
                  <div key={idx} className="card" style={{ padding: 12 }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <select value={it.productId} onChange={(e) => updateLine(idx, { productId: e.target.value })}>
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.officialName}
                          </option>
                        ))}
                      </select>

                      {it.productId ? (
                        <div className="muted" style={{ marginTop: -4 }}>
                          Available: <b>{onHand}</b>
                        </div>
                      ) : null}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={it.qty}
                          onChange={(e) => updateLine(idx, { qty: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Unit Price (JOD)"
                          min="0"
                          step="0.001"
                          value={it.unitPriceJod}
                          onChange={(e) => updateLine(idx, { unitPriceJod: e.target.value })}
                        />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div className="muted">
                          Line total:{" "}
                          <b>
                            {it.productId && it.qty && it.unitPriceJod
                              ? (Number(it.qty) * Number(it.unitPriceJod)).toFixed(3)
                              : "0.000"}
                          </b>
                        </div>

                        <button type="button" onClick={() => removeLine(idx)} disabled={form.items.length === 1}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, fontWeight: 800 }}>
              Total: {totalJod.toFixed(3)} JOD{" "}
              {!stockCheck.ok ? (
                <span style={{ marginLeft: 10, color: "#b91c1c" }}>
                  Not enough stock (productId={stockCheck.productId})
                </span>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={!stockCheck.ok}>
                Save Sale
              </button>
            </div>
          </div>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Salesperson</th>
            <th>Total (JOD)</th>
            <th>Items</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {sales.map((s) => (
            <tr key={s.id} style={s.isVoid ? { opacity: 0.6 } : undefined}>
              <td>{s.saleDate}</td>
              <td>{s.clientName}</td>
              <td>{s.salespersonName}</td>
              <td>{Number(s.totalJod || 0).toFixed(3)}</td>
              <td>
                {(s.items || []).map((it) => (
                  <div key={it.id}>
                    {it.productName} — {it.qty} × {Number(it.unitPriceJod).toFixed(3)} ={" "}
                    {Number(it.lineTotalJod).toFixed(3)}
                  </div>
                ))}
              </td>
              <td>{s.isVoid ? "VOID" : "OK"}</td>
              <td>{hasRole("main") && !s.isVoid ? <button onClick={() => handleVoid(s.id)}>Void</button> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
