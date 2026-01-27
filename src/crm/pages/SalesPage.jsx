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

  const [form, setForm] = useState({
    clientId: "",
    saleDate: "",
    items: [emptyLine()],
  });

  async function load() {
    const saleRes = await apiFetch("/api/sales");
    const clientRes = await apiFetch("/api/clients");
    const prodRes = await apiFetch("/api/products?includeArchived=1");

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
  }

  useEffect(() => {
    load();
  }, []);

  const productById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(String(p.id), p);
    return m;
  }, [products]);

  const computed = useMemo(() => {
    const lines = form.items.map((it) => {
      const p = productById.get(String(it.productId));
      const onHand = Number(p?.onHandQty || 0);
      const qty = Number(it.qty || 0);
      const price = Number(it.unitPriceJod || 0);
      const lineTotal = qty > 0 && price > 0 ? qty * price : 0;

      const qtyOk = !it.productId || !qty || qty <= onHand;
      const priceOk = !it.unitPriceJod || price > 0;

      return {
        ...it,
        product: p,
        onHand,
        qty,
        price,
        lineTotal,
        qtyOk,
        priceOk,
        lineOk: Boolean(it.productId) && qty > 0 && price > 0 && qtyOk,
      };
    });

    const total = lines.reduce((s, l) => s + (l.lineTotal || 0), 0);

    const hasAtLeastOneValid = lines.some((l) => l.lineOk);
    const allNonEmptyLinesValid = lines.every((l) => {
      // allow fully empty line only if it's the only one; otherwise treat empty as invalid
      const isEmpty = !l.productId && !l.qty && !l.unitPriceJod;
      return isEmpty || l.lineOk;
    });

    return { lines, total, hasAtLeastOneValid, allNonEmptyLinesValid };
  }, [form.items, productById]);

  const canSubmit =
    form.clientId &&
    form.saleDate &&
    computed.hasAtLeastOneValid &&
    computed.allNonEmptyLinesValid;

  function updateLine(idx, patch) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      alert("Please complete client, date, and valid product lines (with enough stock).");
      return;
    }

    // Prepare payload (ignore empty lines)
    const items = form.items
      .map((it) => ({
        productId: Number(it.productId),
        qty: Number(it.qty),
        unitPriceJod: Number(it.unitPriceJod),
      }))
      .filter((it) => it.productId && it.qty > 0 && it.unitPriceJod > 0);

    const res = await apiFetch("/api/sales", {
      method: "POST",
      body: {
        clientId: Number(form.clientId),
        saleDate: form.saleDate,
        items,
      },
    });

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to record sale");
      return;
    }

    setForm({ clientId: "", saleDate: "", items: [emptyLine()] });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Void this sale? This will reverse stock.")) return;
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
          <h3>Record Sale (Multiple Products)</h3>

          <select
            value={form.clientId}
            onChange={(e) => setForm((s) => ({ ...s, clientId: e.target.value }))}
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={form.saleDate}
            onChange={(e) => setForm((s) => ({ ...s, saleDate: e.target.value }))}
          />

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Items</div>

            {computed.lines.map((line, idx) => (
              <div key={idx} className="crm-card" style={{ marginBottom: 10 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <select
                    value={form.items[idx].productId}
                    onChange={(e) => updateLine(idx, { productId: e.target.value })}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.officialName}
                      </option>
                    ))}
                  </select>

                  {form.items[idx].productId ? (
                    <div className="muted" style={{ marginTop: 2 }}>
                      Available: <b>{line.onHand}</b>
                      {!line.qtyOk ? (
                        <span style={{ marginLeft: 10, color: "#b91c1c", fontWeight: 800 }}>
                          Not enough stock
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <input
                    type="number"
                    min="1"
                    placeholder="Quantity"
                    value={form.items[idx].qty}
                    onChange={(e) => updateLine(idx, { qty: e.target.value })}
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Unit Price (JOD)"
                    value={form.items[idx].unitPriceJod}
                    onChange={(e) => updateLine(idx, { unitPriceJod: e.target.value })}
                  />

                  <div className="muted">
                    Line Total: <b>{(line.lineTotal || 0).toFixed(3)}</b> JOD
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={addLine}>
                      + Add another product
                    </button>
                    {form.items.length > 1 ? (
                      <button type="button" onClick={() => removeLine(idx)}>
                        Remove line
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ fontWeight: 900, marginTop: 10 }}>
              Transaction Total: {(computed.total || 0).toFixed(3)} JOD
            </div>
          </div>

          <button type="submit" disabled={!canSubmit} style={{ marginTop: 12 }}>
            Save Sale
          </button>
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => {
            const sp =
              [s.salesperson_first_name, s.salesperson_last_name].filter(Boolean).join(" ") ||
              (s.salesperson_user_id ? `User #${s.salesperson_user_id}` : "-");

            const items = Array.isArray(s.items) ? s.items : [];
            return (
              <tr key={s.id}>
                <td>{s.sale_date}</td>
                <td>{s.client_name}</td>
                <td>{sp}</td>
                <td>{Number(s.total_jod || 0).toFixed(3)}</td>
                <td>
                  {items.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {items.map((it) => (
                        <li key={it.id}>
                          {it.productName} — {it.qty} × {Number(it.unitPriceJod).toFixed(3)} ={" "}
                          {Number(it.lineTotalJod).toFixed(3)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {hasRole("main") && (
                    <button onClick={() => handleDelete(s.id)}>Void</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
