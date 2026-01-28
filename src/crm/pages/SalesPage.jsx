// SalesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

const emptyLine = () => ({ productId: "", qty: 1, unitPriceJod: 0 });

export default function SalesPage() {
  const isMain = hasRole("main");

  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);

  const [form, setForm] = useState({
    clientId: "",
    saleDate: "",
    salespersonId: "",
    notes: "",
    items: [emptyLine()],
  });

  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(String(p.id), p);
    return m;
  }, [products]);

  const enrichedItems = useMemo(() => {
    return (form.items || []).map((it) => {
      const p = productsById.get(String(it.productId));
      const onHand = Number(p?.onHandQty || 0);
      const qty = Number(it.qty || 0);
      const unit = Number(it.unitPriceJod || 0);
      const lineTotal = Number((qty * unit).toFixed(3));
      const stockOk = !it.productId || qty <= onHand;
      return { ...it, product: p, onHand, qty, unit, lineTotal, stockOk };
    });
  }, [form.items, productsById]);

  const totalJod = useMemo(() => {
    return Number(enrichedItems.reduce((s, it) => s + (it.lineTotal || 0), 0).toFixed(3));
  }, [enrichedItems]);

  const allStockOk = enrichedItems.every((it) => it.stockOk);

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
      // if default exists and form not set, auto set it
      const def = (spData?.salespersons || []).find((x) => x.is_default);
      setForm((s) => (s.salespersonId ? s : { ...s, salespersonId: def ? String(def.id) : "" }));
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setLine(idx, patch) {
    setForm((s) => {
      const items = [...(s.items || [])];
      items[idx] = { ...items[idx], ...patch };
      return { ...s, items };
    });
  }

  function addLine() {
    setForm((s) => ({ ...s, items: [...(s.items || []), emptyLine()] }));
  }

  function removeLine(idx) {
    setForm((s) => {
      const items = [...(s.items || [])];
      items.splice(idx, 1);
      return { ...s, items: items.length ? items : [emptyLine()] };
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isMain) return;

    if (!form.clientId || !form.saleDate) {
      alert("Please select client and date");
      return;
    }
    if (!form.items?.length) {
      alert("Add at least one product");
      return;
    }
    if (!allStockOk) {
      alert("One or more items exceed available stock");
      return;
    }

    const itemsPayload = enrichedItems
      .filter((it) => it.productId)
      .map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        unitPriceJod: Number(it.unit),
      }));

    if (!itemsPayload.length) {
      alert("Please select at least one product line");
      return;
    }

    const res = await apiFetch("/api/sales", {
      method: "POST",
      body: {
        clientId: Number(form.clientId),
        saleDate: form.saleDate,
        salespersonId: form.salespersonId ? Number(form.salespersonId) : null,
        notes: form.notes || "",
        items: itemsPayload,
      },
    });

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Server error");
      return;
    }

    setForm({
      clientId: "",
      saleDate: "",
      salespersonId: form.salespersonId || "",
      notes: "",
      items: [emptyLine()],
    });

    await load();
  };

  const handleDelete = async (id) => {
    if (!isMain) return;
    if (!window.confirm("Void this transaction?")) return;
    const res = await apiFetch(`/api/sales?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to delete");
      return;
    }
    load();
  };

  return (
    <div className="container">
      <h2>Sales</h2>

      {isMain && (
        <form onSubmit={handleSubmit} className="card">
          <h3>Record Sale (Transaction)</h3>

          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />

          <select value={form.salespersonId} onChange={(e) => setForm({ ...form, salespersonId: e.target.value })}>
            <option value="">Select salesperson...</option>
            {salespersons.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.displayName}
                {sp.is_default ? " (Default)" : ""}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />

          <div style={{ marginTop: 10, fontWeight: 800 }}>Items</div>

          {enrichedItems.map((it, idx) => (
            <div key={idx} className="crm-card" style={{ marginTop: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <select
                  value={it.productId}
                  onChange={(e) => {
                    const p = productsById.get(String(e.target.value));
                    setLine(idx, {
                      productId: e.target.value,
                      unitPriceJod: p ? Number(p.defaultSellPriceJod || 0) : 0,
                    });
                  }}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.officialName}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={(e) => setLine(idx, { qty: e.target.value })}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Unit Price (JOD)"
                    value={it.unitPriceJod}
                    onChange={(e) => setLine(idx, { unitPriceJod: e.target.value })}
                    style={{ flex: 1, minWidth: 180 }}
                  />
                  <button type="button" className="button button--ghost" onClick={() => removeLine(idx)}>
                    Remove
                  </button>
                </div>

                {it.productId ? (
                  <div className="muted" style={{ marginTop: 2 }}>
                    Available: <b>{it.onHand}</b>{" "}
                    {!it.stockOk ? (
                      <span style={{ marginLeft: 10, color: "#b91c1c", fontWeight: 800 }}>
                        Not enough stock
                      </span>
                    ) : null}
                    <span style={{ marginLeft: 10 }}>
                      Line Total: <b>{it.lineTotal.toFixed(3)} JOD</b>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          <button type="button" className="button button--ghost" onClick={addLine} style={{ marginTop: 10 }}>
            + Add another product
          </button>

          <div style={{ marginTop: 12, fontWeight: 900 }}>
            Total: {totalJod.toFixed(3)} JOD
          </div>

          <button type="submit" disabled={!allStockOk} style={{ marginTop: 10 }}>
            Save Transaction
          </button>
        </form>
      )}

      <table className="table" style={{ marginTop: 16 }}>
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
          {!sales.length ? (
            <tr>
              <td colSpan={6} className="muted">
                No transactions yet.
              </td>
            </tr>
          ) : null}
          {sales.map((s) => (
            <tr key={s.id}>
              <td>{s.saleDate}</td>
              <td>{s.clientName}</td>
              <td>{s.salespersonName || "—"}</td>
              <td>
                {(s.items || [])
                  .map((it) => `${it.productName} x ${it.qty}`)
                  .join(", ")}
              </td>
              <td>{Number(s.totalJod || 0).toFixed(3)}</td>
              <td>{isMain ? <button onClick={() => handleDelete(s.id)}>Delete</button> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
