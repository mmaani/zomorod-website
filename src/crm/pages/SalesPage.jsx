import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function emptyLine() {
  return { productId: "", qty: "", unitPriceJod: "" };
}

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]); // needs /api/salespersons
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    clientId: "",
    saleDate: "",
    salespersonId: "", // optional (server uses default if empty)
    notes: "",
    items: [emptyLine()],
  });

  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(String(p.id), p);
    return m;
  }, [products]);

  const enrichedItems = useMemo(() => {
    return form.items.map((it) => {
      const p = productsById.get(String(it.productId));
      const onHand = n(p?.onHandQty);
      const qty = n(it.qty);
      const price = Number(it.unitPriceJod);
      const priceOk = Number.isFinite(price) && price > 0;
      const qtyOk = qty > 0;
      const stockOk = !it.productId || !qtyOk || qty <= onHand;
      const lineTotal = qtyOk && priceOk ? qty * price : 0;

      return {
        ...it,
        product: p || null,
        onHand,
        qty,
        price,
        qtyOk,
        priceOk,
        stockOk,
        lineTotal,
      };
    });
  }, [form.items, productsById]);

  const grandTotal = useMemo(
    () => enrichedItems.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0),
    [enrichedItems]
  );

  const formOk = useMemo(() => {
    if (!form.clientId || !form.saleDate) return false;
    if (!enrichedItems.length) return false;

    // all lines must be valid and have product
    for (const it of enrichedItems) {
      if (!it.productId) return false;
      if (!it.qtyOk) return false;
      if (!it.priceOk) return false;
      if (!it.stockOk) return false;
    }
    return true;
  }, [form.clientId, form.saleDate, enrichedItems]);

  async function load() {
    setLoading(true);

    const [saleRes, clientRes, prodRes] = await Promise.all([
      apiFetch("/api/sales"),
      apiFetch("/api/clients"),
      apiFetch("/api/products?includeArchived=1"),
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

    // Optional: load salespersons if API exists
    try {
      const spRes = await apiFetch("/api/salespersons");
      const spData = await spRes?.json().catch(() => ({}));
      if (spRes?.ok && spData?.ok) setSalespersons(spData.salespersons || []);
    } catch {
      // ignore if endpoint not ready
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateItem(idx, patch) {
    setForm((s) => {
      const items = s.items.slice();
      items[idx] = { ...items[idx], ...patch };
      return { ...s, items };
    });
  }

  function addLine() {
    setForm((s) => ({ ...s, items: [...s.items, emptyLine()] }));
  }

  function removeLine(idx) {
    setForm((s) => {
      const items = s.items.slice();
      items.splice(idx, 1);
      return { ...s, items: items.length ? items : [emptyLine()] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formOk) {
      alert("Please fix the sale form (missing fields / invalid qty/price / insufficient stock).");
      return;
    }

    const payload = {
      clientId: Number(form.clientId),
      saleDate: form.saleDate,
      salespersonId: form.salespersonId ? Number(form.salespersonId) : null,
      notes: form.notes?.trim() || null,
      items: enrichedItems.map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        unitPriceJod: Number(it.price),
      })),
    };

    const res = await apiFetch("/api/sales", { method: "POST", body: payload });
    const data = await res?.json().catch(() => ({}));

    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to record sale");
      return;
    }

    setForm({ clientId: "", saleDate: "", salespersonId: "", notes: "", items: [emptyLine()] });
    load();
  }

  async function handleDelete(orderId) {
    if (!window.confirm("Void this sale transaction? (This will restore stock)")) return;
    const res = await apiFetch(`/api/sales?id=${orderId}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to void sale");
      return;
    }
    load();
  }

  return (
    <div className="container">
      <h2>Sales</h2>

      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>Record Sale (Transaction)</h3>

          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={form.saleDate}
            onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
          />

          <select
            value={form.salespersonId}
            onChange={(e) => setForm({ ...form, salespersonId: e.target.value })}
          >
            <option value="">Default salesperson</option>
            {salespersons.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.firstName} {sp.lastName}{sp.employeeId ? ` (${sp.employeeId})` : ""}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Items</div>

            {enrichedItems.map((it, idx) => (
              <div key={idx} className="crm-card" style={{ marginBottom: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "center" }}>
                  <select
                    value={form.items[idx].productId}
                    onChange={(e) => updateItem(idx, { productId: e.target.value })}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.officialName}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={form.items[idx].qty}
                    onChange={(e) => updateItem(idx, { qty: e.target.value })}
                  />

                  <input
                    type="number"
                    placeholder="Unit Price (JOD)"
                    min="0"
                    step="0.001"
                    value={form.items[idx].unitPriceJod}
                    onChange={(e) => updateItem(idx, { unitPriceJod: e.target.value })}
                  />

                  <button type="button" onClick={() => removeLine(idx)}>
                    Remove
                  </button>
                </div>

                {it.productId ? (
                  <div className="muted" style={{ marginTop: 8 }}>
                    Available: <b>{it.onHand}</b>{" "}
                    {!it.stockOk ? (
                      <span style={{ marginLeft: 10, color: "#b91c1c", fontWeight: 800 }}>
                        Not enough stock
                      </span>
                    ) : null}
                    <span style={{ marginLeft: 12 }}>
                      Line Total: <b>{it.lineTotal.toFixed(3)}</b> JOD
                    </span>
                  </div>
                ) : null}
              </div>
            ))}

            <button type="button" onClick={addLine}>
              + Add another product
            </button>

            <div style={{ marginTop: 12, fontSize: 16, fontWeight: 900 }}>
              Total: {grandTotal.toFixed(3)} JOD
            </div>

            <button type="submit" disabled={!formOk} style={{ marginTop: 12 }}>
              Save Transaction
            </button>

            {!formOk ? (
              <div className="muted" style={{ marginTop: 6 }}>
                Complete all fields, ensure qty/price are positive, and stock is sufficient.
              </div>
            ) : null}
          </div>
        </form>
      )}

      {loading ? <div className="muted">Loading…</div> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Salesperson</th>
            <th>Items</th>
            <th>Total (JOD)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((o) => (
            <tr key={o.id}>
              <td>{o.saleDate}</td>
              <td>{o.clientName}</td>
              <td>
                {o.salesperson?.firstName} {o.salesperson?.lastName}
                {o.salesperson?.employeeId ? ` (${o.salesperson.employeeId})` : ""}
              </td>
              <td>
                {(o.items || []).map((it) => (
                  <div key={it.id}>
                    {it.officialName} — {it.qty} × {Number(it.unitPriceJod).toFixed(3)}
                  </div>
                ))}
              </td>
              <td>{Number(o.totalJod || 0).toFixed(3)}</td>
              <td>
                {hasRole("main") && <button onClick={() => handleDelete(o.id)}>Void</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
