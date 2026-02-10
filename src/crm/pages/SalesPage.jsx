import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

const MAX_VISIBLE = 5;

function uomLabel(u) {
  const s = String(u || "piece");
  if (s === "piece") return "Piece";
  if (s === "dozen") return "Dozen (12)";
  const m = s.match(/^pack(\d+)$/);
  if (m) return `Box/Pack of ${m[1]}`;
  if (s === "custom") return "Custom pack";
  return s;
}

function normalizeUom(raw) {
  const u = String(raw ?? "").trim().toLowerCase();
  if (!u || u === "piece" || u === "pcs" || u === "pc" || u === "unit") return "piece";
  if (u === "dozen" || u === "dz") return "dozen";
  const m = u.match(/^(pack|box|carton|case)[-_ ]?(\d+)$/);
  if (m) return `pack${m[2]}`;
  const m2 = u.match(/^pack(\d+)$/);
  if (m2) return `pack${m2[1]}`;
  if (u === "custom") return "custom";
  return u;
}

function uomMultiplier(uomRaw, customPackSizeRaw) {
  const u = normalizeUom(uomRaw);
  if (u === "piece") return 1;
  if (u === "dozen") return 12;
  const m = u.match(/^pack(\d+)$/);
  if (m) {
    const k = Math.floor(Number(m[1]));
    return k > 0 ? k : 0;
  }
  if (u === "custom") {
    const k = Math.floor(Number(customPackSizeRaw || 0));
    return k > 0 ? k : 0;
  }
  return 0;
}

function clampUnits(desired, maxUnits) {
  const d = Math.floor(Number(desired || 0));
  if (!maxUnits || maxUnits <= 0) return d > 0 ? d : 1;
  if (d <= 1) return 1;
  if (d >= maxUnits) return maxUnits;
  return d;
}

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);

  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    saleDate: "",
    salespersonId: "",
    items: [
      { productId: "", qtyUom: "piece", customPackSize: "", qty: 1, unitPriceJod: "" },
    ],
  });

  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(String(p.id), p);
    return m;
  }, [products]);

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

  function getDefaultSellPricePerPiece(p) {
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
      `${sp?.first_name || sp?.firstName || ""} ${sp?.last_name || sp?.lastName || ""}`.trim();
    return n || `Salesperson #${sp?.id}`;
  }

  const total = useMemo(() => {
    return (form.items || []).reduce((sum, it) => {
      const qtyUnits = Math.floor(Number(it.qty || 0));
      const unitPricePerUnit = Number(it.unitPriceJod || 0);
      return sum + (qtyUnits > 0 && unitPricePerUnit > 0 ? qtyUnits * unitPricePerUnit : 0);
    }, 0);
  }, [form.items]);

  function formatDate(d) {
    if (!d) return "-";
    const s = String(d);
    return s.includes("T") ? s.split("T")[0] : s;
  }

  function formatSaleItems(sale) {
    const arr = Array.isArray(sale?.items) ? sale.items : [];
    if (!arr.length) return "—";

    return arr
      .map((it) => {
        const name =
          it.product_name ||
          it.official_name ||
          it.officialName ||
          it.name ||
          `#${it.product_id || it.productId}`;

        const qtyInput = Number(it.qty_input ?? it.qtyInput ?? 0) || 0;
        const qtyPcs = Number(it.qty ?? 0) || 0;

        const qtyUom = it.qty_uom || it.qtyUom || "piece";
        const mult = Number(it.qty_uom_multiplier ?? it.qtyUomMultiplier ?? 1) || 1;

        const unitPriceInput = Number(it.unit_price_input_jod ?? it.unitPriceInputJod ?? 0) || 0;

        return `${name} ×${qtyInput} ${uomLabel(qtyUom)} @ ${unitPriceInput.toFixed(
          3
        )} (= ${qtyPcs} pcs, ×${mult})`;
      })
      .join(" | ");
  }

  async function load() {
    setLoading(true);
    setErr("");

    const results = await Promise.allSettled([
      apiFetch("/sales"),
      apiFetch("/clients"),
      apiFetch("/products?includeArchived=1"),
      apiFetch("/salespersons"),
    ]);

    const [saleR, clientR, prodR, spR] = results;

    const parseOk = async (r, label) => {
      if (r.status !== "fulfilled") return { ok: false, error: `${label}: ${r.reason?.message || "failed"}` };
      const res = r.value;
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) return { ok: false, error: `${label}: ${data?.error || data?.detail || `HTTP ${res.status}`}` };
      return { ok: true, data };
    };

    const saleP = await parseOk(saleR, "Sales");
    const clientP = await parseOk(clientR, "Clients");
    const prodP = await parseOk(prodR, "Products");
    const spP = await parseOk(spR, "Salespersons");

    if (saleP.ok) setSales(Array.isArray(saleP.data.sales) ? saleP.data.sales : []);
    if (clientP.ok) setClients(Array.isArray(clientP.data.clients) ? clientP.data.clients : []);
    if (prodP.ok) setProducts(Array.isArray(prodP.data.products) ? prodP.data.products : []);
    if (spP.ok) {
      const list = Array.isArray(spP.data.salespersons) ? spP.data.salespersons : [];
      setSalespersons(list);

      setForm((s) => {
        if (s.salespersonId) return s;
        const def = list.find((x) => x.is_default || x.isDefault);
        return def ? { ...s, salespersonId: String(def.id) } : s;
      });
    }

    const errors = [saleP, clientP, prodP, spP].filter((x) => !x.ok).map((x) => x.error);
    if (errors.length) setErr(errors.join(" • "));

    setLoading(false);
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
      items: [...(s.items || []), { productId: "", qtyUom: "piece", customPackSize: "", qty: 1, unitPriceJod: "" }],
    }));
  }

  function removeItem(idx) {
    setForm((s) => {
      const items = [...(s.items || [])];
      items.splice(idx, 1);
      return {
        ...s,
        items: items.length ? items : [{ productId: "", qtyUom: "piece", customPackSize: "", qty: 1, unitPriceJod: "" }],
      };
    });
  }

  function itemQtyPieces(it) {
    const qtyUnits = Math.floor(Number(it.qty || 0));
    const mult = uomMultiplier(it.qtyUom, it.customPackSize);
    return qtyUnits > 0 && mult > 0 ? qtyUnits * mult : 0;
  }

  function validateStockClientSide() {
    const byProduct = new Map();

    for (const it of form.items || []) {
      const productId = String(it.productId || "");
      if (!productId) continue;

      const pcs = itemQtyPieces(it);
      if (pcs <= 0) continue;

      byProduct.set(productId, (byProduct.get(productId) || 0) + pcs);
    }

    for (const [pid, requestedPcs] of byProduct.entries()) {
      const p = productsById.get(String(pid));
      if (!p) continue;
      const onHand = getOnHandQty(p);
      if (requestedPcs > onHand) {
        return `Not enough stock for ${getProductName(p)}. Requested=${requestedPcs} pcs, Available=${onHand} pcs`;
      }
    }

    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.clientId || !form.saleDate) {
      alert("Client and date are required");
      return;
    }

    const cleanItems = (form.items || [])
      .map((it) => ({
        productId: Number(it.productId),
        qtyUom: normalizeUom(it.qtyUom || "piece"),
        customPackSize: it.qtyUom === "custom" ? Math.floor(Number(it.customPackSize || 0)) : null,
        qty: Math.floor(Number(it.qty)),
        unitPriceJod: Number(it.unitPriceJod || 0), // per selected unit
      }))
      .filter((it) => it.productId && it.qty > 0 && it.unitPriceJod > 0);

    if (!cleanItems.length) {
      alert("Add at least one valid item (product + qty + price)");
      return;
    }

    for (const it of cleanItems) {
      const mult = uomMultiplier(it.qtyUom, it.customPackSize);
      if (!mult || mult <= 0) {
        alert(`Invalid unit / pack size for productId=${it.productId}`);
        return;
      }
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
      setErr(data?.error || data?.detail || "Failed to save transaction");
      return;
    }

    setNotes("");
    setForm((s) => ({
      clientId: "",
      saleDate: "",
      salespersonId: s.salespersonId || "",
      items: [{ productId: "", qtyUom: "piece", customPackSize: "", qty: 1, unitPriceJod: "" }],
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

  const latest = sales.slice(0, MAX_VISIBLE);
  const older = sales.slice(MAX_VISIBLE);

  return (
    <div className="container">
      <h2>Sales</h2>

      {err ? <div className="banner">{err}</div> : null}
      {loading ? <div className="muted" style={{ marginTop: 8 }}>Loading…</div> : null}

      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>Record Sale (Transaction)</h3>

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

          <select
            value={form.salespersonId}
            onChange={(e) => setForm((s) => ({ ...s, salespersonId: e.target.value }))}
          >
            <option value="">Select salesperson...</option>
            {salespersons.map((sp) => {
              const name = getSalespersonName(sp);
              const isDef = !!(sp.is_default ?? sp.isDefault);
              return (
                <option key={sp.id} value={sp.id}>
                  {name}{isDef ? " (default)" : ""}
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
            const onHandPcs = getOnHandQty(p);

            const mult = uomMultiplier(it.qtyUom, it.customPackSize);
            const maxUnits = mult > 0 ? Math.floor(onHandPcs / mult) : 0;

            const qtyUnits = Math.floor(Number(it.qty || 0));
            const qtyPcs = qtyUnits > 0 && mult > 0 ? qtyUnits * mult : 0;

            const unitPricePerUnit = Number(it.unitPriceJod || 0);
            const unitPricePerPc = mult > 0 && unitPricePerUnit > 0 ? unitPricePerUnit / mult : 0;

            const lineTotal = qtyUnits > 0 && unitPricePerUnit > 0 ? qtyUnits * unitPricePerUnit : 0;

            const tooMuch = it.productId && qtyPcs > onHandPcs;
            const canDropdown = !!it.productId && mult > 0 && maxUnits > 0;
            const dropdownLimit = 50;
            const showMaxOption = canDropdown && maxUnits > dropdownLimit;

            return (
              <div key={idx} className="crm-card" style={{ marginTop: 10 }}>
                <select
                  value={it.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const p2 = productsById.get(String(productId));
                    const base = Number(getDefaultSellPricePerPiece(p2) || 0);

                    const mult2 = uomMultiplier(it.qtyUom, it.customPackSize);
                    const suggested = base > 0 && mult2 > 0 ? (base * mult2) : "";

                    // clamp qty to new max
                    const onHand2 = getOnHandQty(p2);
                    const maxUnits2 = mult2 > 0 ? Math.floor(onHand2 / mult2) : 0;
                    const clampedQty = maxUnits2 > 0 ? clampUnits(it.qty, maxUnits2) : it.qty;

                    setItem(idx, {
                      productId,
                      unitPriceJod: suggested !== "" ? String(suggested) : "",
                      qty: clampedQty,
                    });
                  }}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{getProductName(p)}</option>
                  ))}
                </select>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <select
                    value={it.qtyUom}
                    onChange={(e) => {
                      const qtyUom = e.target.value;

                      const p2 = productsById.get(String(it.productId));
                      const base = Number(getDefaultSellPricePerPiece(p2) || 0);

                      const mult2 = uomMultiplier(qtyUom, it.customPackSize);
                      const suggested = (it.unitPriceJod === "" && base > 0 && mult2 > 0) ? String(base * mult2) : it.unitPriceJod;

                      const onHand2 = getOnHandQty(p2);
                      const maxUnits2 = mult2 > 0 ? Math.floor(onHand2 / mult2) : 0;
                      const clampedQty = it.productId && maxUnits2 > 0 ? clampUnits(it.qty, maxUnits2) : it.qty;

                      setItem(idx, { qtyUom, unitPriceJod: suggested, qty: clampedQty });
                    }}
                  >
                    <option value="piece">Piece</option>
                    <option value="dozen">Dozen (12)</option>
                    <option value="pack10">Box/Pack of 10</option>
                    <option value="pack20">Box/Pack of 20</option>
                    <option value="pack25">Box/Pack of 25</option>
                    <option value="pack50">Box/Pack of 50</option>
                    <option value="pack100">Box/Pack of 100</option>
                    <option value="custom">Custom…</option>
                  </select>

                  {it.qtyUom === "custom" ? (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={it.customPackSize}
                      onChange={(e) => {
                        const customPackSize = e.target.value;

                        const mult2 = uomMultiplier("custom", customPackSize);
                        const p2 = productsById.get(String(it.productId));
                        const onHand2 = getOnHandQty(p2);
                        const maxUnits2 = mult2 > 0 ? Math.floor(onHand2 / mult2) : 0;
                        const clampedQty = it.productId && maxUnits2 > 0 ? clampUnits(it.qty, maxUnits2) : it.qty;

                        setItem(idx, { customPackSize, qty: clampedQty });
                      }}
                      placeholder="Custom pack size"
                    />
                  ) : (
                    <div className="muted" style={{ alignSelf: "center" }}>
                      Unit: <b>{uomLabel(it.qtyUom)}</b>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  {/* ✅ Qty dropdown auto-limited by available units */}
                  {canDropdown ? (
                    <select
                      value={String(clampUnits(it.qty, maxUnits))}
                      onChange={(e) => setItem(idx, { qty: clampUnits(e.target.value, maxUnits) })}
                      title={`Available: ${maxUnits} units`}
                    >
                      {Array.from({ length: Math.min(maxUnits, dropdownLimit) }, (_v, i) => i + 1).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                      {showMaxOption ? (
                        <option value={maxUnits}>Max ({maxUnits})</option>
                      ) : null}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) => setItem(idx, { qty: e.target.value })}
                      placeholder="Qty (units)"
                      disabled={!it.productId}
                    />
                  )}

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={it.unitPriceJod}
                    onChange={(e) => setItem(idx, { unitPriceJod: e.target.value })}
                    placeholder="Unit Price (JOD per unit)"
                  />
                </div>

                <div className="muted" style={{ marginTop: 6 }}>
                  Available: <b>{onHandPcs}</b> pcs{" "}
                  {mult > 0 ? <span>(= <b>{maxUnits}</b> {uomLabel(it.qtyUom)} units)</span> : null}
                  {tooMuch ? <span style={{ color: "#b91c1c", fontWeight: 800 }}> — Not enough stock</span> : null}
                  {" "}• This line uses: <b>{qtyPcs}</b> pcs
                  {" "}• Effective: <b>{unitPricePerPc.toFixed(4)}</b> JOD/pc
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

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Salesperson</th>
            <th>Units</th>
            <th>Pieces</th>
            <th>Purchased Items</th>
            <th>Total (JOD)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {latest.map((s) => (
            <tr key={s.id}>
              <td>{formatDate(s.sale_date)}</td>
              <td>{s.client_name}</td>
              <td>{s.salesperson_name || "-"}</td>
              <td>{Number(s.items_count_units || 0)}</td>
              <td>{Number(s.items_count_pcs || 0)}</td>
              <td>{formatSaleItems(s)}</td>
              <td>{Number(s.total_jod || 0).toFixed(3)}</td>
              <td>{hasRole("main") ? <button onClick={() => handleDelete(s.id)}>Void</button> : "-"}</td>
            </tr>
          ))}

          {!latest.length ? (
            <tr>
              <td colSpan={8} className="muted">No transactions yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {older.length ? (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            Latest {MAX_VISIBLE} transactions are at the top — scroll down for older ones.
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Salesperson</th>
                  <th>Units</th>
                  <th>Pieces</th>
                  <th>Purchased Items</th>
                  <th>Total (JOD)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {older.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDate(s.sale_date)}</td>
                    <td>{s.client_name}</td>
                    <td>{s.salesperson_name || "-"}</td>
                    <td>{Number(s.items_count_units || 0)}</td>
                    <td>{Number(s.items_count_pcs || 0)}</td>
                    <td>{formatSaleItems(s)}</td>
                    <td>{Number(s.total_jod || 0).toFixed(3)}</td>
                    <td>{hasRole("main") ? <button onClick={() => handleDelete(s.id)}>Void</button> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
