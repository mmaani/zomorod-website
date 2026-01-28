import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);

  const [notes, setNotes] = useState("");
  const [form, setForm] = useState({
    clientId: "",
    saleDate: "",
    salespersonId: "",
    items: [{ productId: "", qty: 1, unitPriceJod: "" }],
  });

  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(String(p.id), p);
    return m;
  }, [products]);

  const total = useMemo(() => {
    return (form.items || []).reduce((sum, it) => {
      const q = Number(it.qty || 0);
      const up = Number(it.unitPriceJod || 0);
      return sum + (q > 0 && up > 0 ? q * up : 0);
    }, 0);
  }, [form.items]);

  async function load() {
    const [saleRes, clientRes, prodRes, spRes] = await Promise.all([
      apiFetch("/api/sales"),
      apiFetch("/api/clients"),
      apiFetch("/api/products?includeArchived=1"),
      apiFetch("/api/salespersons"),
    ]);

    if (saleRes) {
      const d = await saleRes.json().catch(() => ({}));
      if (saleRes.ok && d.ok) setSales(d.sales || []);
    }
    if (clientRes) {
      const d = await clientRes.json().catch(() => ({}));
      if (clientRes.ok && d.ok) setClients(d.clients || []);
    }
    if (prodRes) {
      const d = await prodRes.json().catch(() => ({}));
      if (prodRes.ok && d.ok) setProducts(d.products || []);
    }
    if (spRes) {
      const d = await spRes.json().catch(() => ({}));
      if (spRes.ok && d.ok) {
        const list = d.salespersons || [];
        setSalespersons(list);

        // auto-select default salesperson if none selected
        if (!form.salespersonId) {
          const def = list.find((x) => x.isDefault);
          if (def) setForm((s) => ({ ...s, salespersonId: String(def.id) }));
        }
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setItem(idx, patch) {
    setForm((s) => {
      const items = [...(s.items || [])];
      items[idx] = { ...items[idx], ...patch };
      return { ...s, items };
    });
  }

  function addItem() {
    setForm((s) => ({
      ...s,
      items: [...(s.items || []), { productId: "", qty: 1, unitPriceJod: "" }],
    }));
  }

  function removeItem(idx) {
    setForm((s) => {
      const items = [...(s.items || [])];
      items.splice(idx, 1);
      return { ...s, items: items.length ? items : [{ productId: "", qty: 1, unitPriceJod: "" }] };
    });
  }

  function validateStockClientSide() {
    // basic client-side guard; real enforcement is server-side
    for (const it of form.items) {
      const p = productsById.get(String(it.productId));
      if (!p) continue;
      const onHand = Number(p.onHandQty || 0);
      const qty = Number(it.qty || 0);
      if (qty > onHand) {
        return `Not enough stock for ${p.officialName}. Requested=${qty}, Available=${onHand}`;
      }
    }
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.clientId || !form.saleDate) {
      alert("Client and date are required");
      return;
    }

    const cleanItems = (form.items || [])
      .map((it) => ({
        productId: Number(it.productId),
        qty: Math.floor(Number(it.qty)),
        unitPriceJod: Number(it.unitPriceJod),
      }))
      .filter((it) => it.productId && it.qty > 0 && it.unitPriceJod > 0);

    if (!cleanItems.length) {
      alert("Add at least one valid item (product, qty, price)");
      return;
    }

    const stockErr = validateStockClientSide();
    if (stockErr) {
      alert(stockErr);
      return;
    }

    const res = await apiFetch("/api/sales", {
      method: "POST",
      body: {
        clientId: Number(form.clientId),
        saleDate: form.saleDate,
        salespersonId: form.salespersonId ? Number(form.salespersonId) : null,
        notes: notes || null,
        items: cleanItems,
      },
    });

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || data?.detail || "Failed to save transaction");
      return;
    }

    setNotes("");
    setForm({
      clientId: "",
      saleDate: "",
      salespersonId: form.salespersonId || "",
      items: [{ productId: "", qty: 1, unitPriceJod: "" }],
    });

    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Void this transaction?")) return;
    const res = await apiFetch(`/api/sales?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to void sale");
      return;
    }
    load();
  };

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

          <input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />

          <select value={form.salespersonId} onChange={(e) => setForm({ ...form, salespersonId: e.target.value })}>
            <option value="">Select salesperson...</option>
            {salespersons.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.displayName}{sp.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div style={{ marginTop: 10, fontWeight: 800 }}>Items</div>

          {(form.items || []).map((it, idx) => {
            const p = productsById.get(String(it.productId));
            const onHand = Number(p?.onHandQty || 0);
            const qty = Number(it.qty || 0);
            const up = Number(it.unitPriceJod || 0);
            const lineTotal = qty > 0 && up > 0 ? qty * up : 0;
            const tooMuch = it.productId && qty > onHand;

            return (
              <div key={idx} className="crm-card" style={{ marginTop: 10 }}>
                <select
                  value={it.productId}
                  onChange={(e) => setItem(idx, { productId: e.target.value })}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.officialName}</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={it.qty}
                  onChange={(e) => setItem(idx, { qty: e.target.value })}
                  placeholder="Qty"
                />

                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={it.unitPriceJod}
                  onChange={(e) => setItem(idx, { unitPriceJod: e.target.value })}
                  placeholder="Unit Price (JOD)"
                />

                <div className="muted" style={{ marginTop: 6 }}>
                  Available: <b>{onHand}</b>{" "}
                  {tooMuch ? <span style={{ color: "#b91c1c", fontWeight: 800 }}>Not enough stock</span> : null}
                  {" "}• Line Total: <b>{lineTotal.toFixed(3)} JOD</b>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => removeItem(idx)}>Remove</button>
                </div>
              </div>
            );
          })}

          <button type="button" onClick={addItem} style={{ marginTop: 10 }}>
            + Add another product
          </button>

          <div style={{ marginTop: 12, fontWeight: 900 }}>
            Total: {total.toFixed(3)} JOD
          </div>

          <button type="submit" style={{ marginTop: 10 }}>
            Save Transaction
          </button>
        </form>
      )}

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
          {sales.map((s) => (
            <tr key={s.id}>
              <td>{s.sale_date}</td>
              <td>{s.client_name}</td>
              <td>{s.salesperson_name || "-"}</td>
              <td>{s.items_count}</td>
              <td>{Number(s.total_jod || 0).toFixed(3)}</td>
              <td>{hasRole("main") && <button onClick={() => handleDelete(s.id)}>Void</button>}</td>
            </tr>
          ))}
          {!sales.length ? (
            <tr>
              <td colSpan={6} className="muted">No transactions yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
