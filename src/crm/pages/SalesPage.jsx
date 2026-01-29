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

  function formatSaleItems(sale) {
    const arr = Array.isArray(sale?.items) ? sale.items : [];
    if (!arr.length) return "—";

    return arr
      .map((it) => {
        const name =
          it.product_name ||
          it.official_name ||
          it.officialName ||
          `#${it.product_id || it.productId}`;
        const qty = Number(it.qty || 0);
        const up = Number(it.unit_price_jod ?? it.unitPriceJod ?? 0);
        return `${name} ×${qty} @ ${up.toFixed(3)}`;
      })
      .join(" | ");
  }

  function getOnHandQty(p) {
    return Number(
      p?.on_hand_qty ??
        p?.onHandQty ??
        p?.onHand ??
        p?.qty_on_hand ??
        p?.qtyOnHand ??
        0
    );
  }

  function getProductName(p) {
    return (
      p?.officialName ||
      p?.official_name ||
      p?.name ||
      p?.product_name ||
      `Product #${p?.id ?? ""}`
    );
  }

  function getDefaultSellPrice(p) {
    const v =
      p?.default_sell_price_jod ??
      p?.defaultSellPriceJod ??
      p?.default_sell_price ??
      p?.defaultSellPrice ??
      p?.sell_price_jod ??
      p?.sellPriceJod ??
      p?.price_jod ??
      p?.priceJod ??
      "";
    return v;
  }

  function getSalespersonName(sp) {
    const n =
      sp?.display_name ||
      sp?.displayName ||
      `${sp?.first_name || sp?.firstName || ""} ${
        sp?.last_name || sp?.lastName || ""
      }`.trim();
    return n || `Salesperson #${sp?.id}`;
  }

  async function load() {
    const [saleRes, clientRes, prodRes, spRes] = await Promise.all([
      apiFetch("/sales"),
      apiFetch("/clients"),
      apiFetch("/products?includeArchived=1"),
      apiFetch("/salespersons"),
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

        // ✅ Avoid stale closure: choose default salesperson only if not already selected
        setForm((s) => {
          if (s.salespersonId) return s;
          const def = list.find((x) => x.is_default || x.isDefault);
          return def ? { ...s, salespersonId: String(def.id) } : s;
        });
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
      return {
        ...s,
        items: items.length
          ? items
          : [{ productId: "", qty: 1, unitPriceJod: "" }],
      };
    });
  }

  function validateStockClientSide() {
    // basic client-side guard; real enforcement is server-side
    for (const it of form.items) {
      const p = productsById.get(String(it.productId));
      if (!p) continue;

      const onHand = getOnHandQty(p);
      const qty = Number(it.qty || 0);

      if (qty > onHand) {
        return `Not enough stock for ${getProductName(
          p
        )}. Requested=${qty}, Available=${onHand}`;
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

    // ✅ Allow backend to default unitPriceJod if missing (0)
    const cleanItems = (form.items || [])
      .map((it) => ({
        productId: Number(it.productId),
        qty: Math.floor(Number(it.qty)),
        unitPriceJod: Number(it.unitPriceJod || 0),
      }))
      .filter((it) => it.productId && it.qty > 0);

    if (!cleanItems.length) {
      alert("Add at least one valid item (product + qty)");
      return;
    }

    const stockErr = validateStockClientSide();
    if (stockErr) {
      alert(stockErr);
      return;
    }

    const res = await apiFetch("/sales", {
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
    setForm((s) => ({
      clientId: "",
      saleDate: "",
      // keep salesperson if already selected/default
      salespersonId: s.salespersonId || "",
      items: [{ productId: "", qty: 1, unitPriceJod: "" }],
    }));

    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Void this transaction?")) return;

    const res = await apiFetch(`/sales?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));

    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to void sale");
      return;
    }

    load();
  };

  // ✅ Limit to 5 visible without losing the scroll list
  const visibleSales = sales || [];

  return (
    <div className="container">
      <h2>Sales</h2>

      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>Record Sale (Transaction)</h3>

          <select
            value={form.clientId}
            onChange={(e) => setForm((s) => ({ ...s, clientId: e.target.value }))}
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.saleDate}
            onChange={(e) => setForm((s) => ({ ...s, saleDate: e.target.value }))}
          />

          <select
            value={form.salespersonId}
            onChange={(e) =>
              setForm((s) => ({ ...s, salespersonId: e.target.value }))
            }
          >
            <option value="">Select salesperson...</option>
            {salespersons.map((sp) => {
              const name = getSalespersonName(sp);
              const isDef = !!(sp.is_default ?? sp.isDefault);
              return (
                <option key={sp.id} value={sp.id}>
                  {name}
                  {isDef ? " (default)" : ""}
                </option>
              );
            })}
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
            const onHand = getOnHandQty(p);
            const qty = Number(it.qty || 0);
            const up = Number(it.unitPriceJod || 0);
            const lineTotal = qty > 0 && up > 0 ? qty * up : 0;
            const tooMuch = it.productId && qty > onHand;

            return (
              <div key={idx} className="crm-card" style={{ marginTop: 10 }}>
                <select
                  value={it.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const p2 = productsById.get(String(productId));

                    // ✅ Auto-fill default sell price (but user can edit)
                    const defaultPrice = getDefaultSellPrice(p2);

                    setItem(idx, {
                      productId,
                      unitPriceJod: defaultPrice !== "" ? String(defaultPrice) : "",
                    });
                  }}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProductName(p)}
                    </option>
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
                  {tooMuch ? (
                    <span style={{ color: "#b91c1c", fontWeight: 800 }}>
                      Not enough stock
                    </span>
                  ) : null}
                  {" "}• Line Total: <b>{lineTotal.toFixed(3)} JOD</b>
                </div>

                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={() => removeItem(idx)}>
                    Remove
                  </button>
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

      {/* ✅ Table with sticky header + scroll + shows purchased items */}
      <div style={{ marginTop: 16 }}>
        <div
          style={{
            maxHeight: 420, // “slider” / scrollbar area
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
          }}
        >
          <table className="table" style={{ margin: 0 }}>
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "white",
                zIndex: 1,
              }}
            >
              <tr>
                <th style={{ width: 120 }}>Date</th>
                <th style={{ width: 220 }}>Client</th>
                <th style={{ width: 180 }}>Salesperson</th>
                <th style={{ width: 90 }}>Items</th>
                <th style={{ minWidth: 360 }}>Purchased Items</th>
                <th style={{ width: 120 }}>Total (JOD)</th>
                <th style={{ width: 110 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {visibleSales.map((s, idx) => {
                const inTop5 = idx < 5;
                const purchased = formatSaleItems(s);

                return (
                  <tr key={s.id} style={!inTop5 ? { opacity: 0.95 } : undefined}>
                    <td>{s.sale_date}</td>
                    <td>{s.client_name}</td>
                    <td>{s.salesperson_name || "-"}</td>
                    <td>{s.items_count}</td>

                    <td
                      title={purchased}
                      style={{
                        whiteSpace: "nowrap",
                        maxWidth: 520,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {purchased}
                    </td>

                    <td>{Number(s.total_jod || 0).toFixed(3)}</td>

                    <td>
                      {hasRole("main") ? (
                        <button onClick={() => handleDelete(s.id)}>Void</button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}

              {!sales.length ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No transactions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {sales.length > 5 ? (
          <div className="muted" style={{ marginTop: 8 }}>
            Latest 5 transactions are at the top — scroll down for older ones.
          </div>
        ) : null}
      </div>
    </div>
  );
}
