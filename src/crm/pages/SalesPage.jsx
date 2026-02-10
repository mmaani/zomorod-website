import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

const MAX_VISIBLE = 5; // show latest 5, scroll for older
const MAX_QTY_OPTIONS = 25; // show up to 25 options then add "Max"

const UOM_OPTIONS = [
  { value: "piece", label: "Piece" },
  { value: "dozen", label: "Dozen (12 pcs)" },
  { value: "pack10", label: "Pack 10" },
  { value: "pack20", label: "Pack 20" },
  { value: "pack24", label: "Pack 24" },
  { value: "custom", label: "Custom pack" },
];

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
  const uom = normalizeUom(uomRaw);

  if (uom === "piece") return 1;
  if (uom === "dozen") return 12;

  const m = uom.match(/^pack(\d+)$/);
  if (m) {
    const k = Math.floor(Number(m[1]));
    return Number.isFinite(k) && k > 0 ? k : 0;
  }

  if (uom === "custom") {
    const k = Math.floor(Number(customPackSizeRaw));
    return Number.isFinite(k) && k > 0 ? k : 0;
  }

  return 0;
}

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salespersons, setSalespersons] = useState([]);

  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // items now store qty as "qtyInput" + UOM
  const [form, setForm] = useState({
    clientId: "",
    saleDate: "",
    salespersonId: "",
    items: [
      {
        productId: "",
        qtyUom: "piece",
        customPackSize: "",
        qtyInput: "1",
        unitPriceJod: "",
        _autoPrice: true,
      },
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

  // default sell price is per PIECE
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
    const name =
      sp?.display_name ||
      sp?.displayName ||
      `${sp?.first_name || sp?.firstName || ""} ${sp?.last_name || sp?.lastName || ""}`.trim();
    return name || `Salesperson #${sp?.id}`;
  }

  function formatDate(d) {
    if (!d) return "-";
    const s0 = String(d);
    return s0.includes("T") ? s0.split("T")[0] : s0;
  }

  function formatUom(uom, mult) {
    const u = normalizeUom(uom);
    if (u === "piece") return "pcs";
    if (u === "dozen") return "dozen";
    const m = u.match(/^pack(\d+)$/);
    if (m) return `pack(${m[1]})`;
    if (u === "custom") return mult > 0 ? `custom(${mult})` : "custom";
    return u || "pcs";
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

        // Prefer input fields (units), fallback to base pcs
        const qtyInput = Number(it.qty_input ?? it.qtyInput ?? it.qty ?? 0);
        const qtyUom = it.qty_uom ?? it.qtyUom ?? "piece";
        const mult = Number(it.qty_uom_multiplier ?? it.qtyUomMultiplier ?? 1);

        const upInput = Number(it.unit_price_input_jod ?? it.unitPriceInputJod ?? it.unit_price_jod ?? it.unitPriceJod ?? 0);
        const uomLabel = formatUom(qtyUom, mult);

        return `${name} ×${qtyInput} ${uomLabel} @ ${upInput.toFixed(3)}`;
      })
      .join(" | ");
  }

  const total = useMemo(() => {
    return (form.items || []).reduce((sum, it) => {
      const qtyInput = Number(it.qtyInput || 0);
      const mult = uomMultiplier(it.qtyUom, it.customPackSize);
      const upInput = Number(it.unitPriceJod || 0);

      if (!(qtyInput > 0) || !(upInput >= 0) || !(mult > 0)) return sum;
      return sum + qtyInput * upInput;
    }, 0);
  }, [form.items]);

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
      if (r.status !== "fulfilled")
        return { ok: false, error: `${label}: ${r.reason?.message || "failed"}` };
      const res = r.value;
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok)
        return { ok: false, error: `${label}: ${data?.error || data?.detail || `HTTP ${res.status}`}` };
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
      items: [
        ...(s.items || []),
        { productId: "", qtyUom: "piece", customPackSize: "", qtyInput: "1", unitPriceJod: "", _autoPrice: true },
      ],
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
          : [{ productId: "", qtyUom: "piece", customPackSize: "", qtyInput: "1", unitPriceJod: "", _autoPrice: true }],
      };
    });
  }

  function computeMaxUnits(p, uom, customPackSize) {
    const onHandPcs = getOnHandQty(p);
    const mult = uomMultiplier(uom, customPackSize);
    if (!(mult > 0)) return 0;
    return Math.floor(onHandPcs / mult);
  }

  function validateStockClientSide() {
    for (const it of form.items) {
      const p = productsById.get(String(it.productId));
      if (!p) continue;

      const onHandPcs = getOnHandQty(p);
      const mult = uomMultiplier(it.qtyUom, it.customPackSize);
      const qtyInput = Number(it.qtyInput || 0);
      const qtyBase = qtyInput * mult;

      if (qtyBase > onHandPcs) {
        return `Not enough stock for ${getProductName(p)}. Requested=${qtyBase} pcs, Available=${onHandPcs} pcs`;
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
      .map((it) => {
        const productId = Number(it.productId);
        const qtyUom = normalizeUom(it.qtyUom || "piece");
        const customPackSize = it.customPackSize;
        const mult = uomMultiplier(qtyUom, customPackSize);

        const qtyInput = Math.floor(Number(it.qtyInput || 0));
        const unitPriceJod = Number(it.unitPriceJod || 0); // per selected unit

        return { productId, qty: qtyInput, qtyUom, customPackSize, unitPriceJod, mult };
      })
      .filter((it) => it.productId && it.qty > 0 && it.mult > 0 && it.unitPriceJod > 0);

    if (!cleanItems.length) {
      alert("Add at least one valid item (product + qty + unit + price)");
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
        items: cleanItems.map(({ mult, ...x }) => x),
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
      items: [{ productId: "", qtyUom: "piece", customPackSize: "", qtyInput: "1", unitPriceJod: "", _autoPrice: true }],
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

            const qtyUom = normalizeUom(it.qtyUom);
            const mult = uomMultiplier(qtyUom, it.customPackSize);

            const maxUnits = p ? computeMaxUnits(p, qtyUom, it.customPackSize) : 0;

            // qtyInput stored as string, but may be "__max__"
            let qtyInput = it.qtyInput === "__max__" ? maxUnits : Number(it.qtyInput || 0);
            if (!Number.isFinite(qtyInput) || qtyInput < 0) qtyInput = 0;

            const unitPriceInput = Number(it.unitPriceJod || 0);
            const lineTotal = qtyInput > 0 && unitPriceInput >= 0 ? qtyInput * unitPriceInput : 0;

            const qtyBase = qtyInput * (mult || 0); // pcs
            const tooMuch = !!it.productId && qtyBase > onHandPcs;

            const uomLabel = formatUom(qtyUom, mult);

            // build qty dropdown options up to MAX_QTY_OPTIONS, then add Max
            const qtyOptions = [];
            const cap = Math.min(maxUnits, MAX_QTY_OPTIONS);
            for (let k = 1; k <= cap; k++) qtyOptions.push(k);
            const showMax = maxUnits > MAX_QTY_OPTIONS;

            return (
              <div key={idx} className="crm-card" style={{ marginTop: 10 }}>
                <select
                  value={it.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const p2 = productsById.get(String(productId));

                    // default price is per piece; convert to selected unit
                    const perPiece = Number(getDefaultSellPricePerPiece(p2));
                    const mult2 = uomMultiplier(it.qtyUom || "piece", it.customPackSize);
                    const autoPrice = Number.isFinite(perPiece) && perPiece !== 0
                      ? String((perPiece * (mult2 || 1)).toFixed(3))
                      : "";

                    setItem(idx, {
                      productId,
                      // reset qty selection
                      qtyInput: "1",
                      // keep existing UOM selection
                      unitPriceJod: autoPrice,
                      _autoPrice: true,
                    });
                  }}
                >
                  <option value="">Select product...</option>
                  {products.map((p0) => (
                    <option key={p0.id} value={p0.id}>{getProductName(p0)}</option>
                  ))}
                </select>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                  <select
                    value={it.qtyUom}
                    onChange={(e) => {
                      const nextUom = e.target.value;
                      const p2 = productsById.get(String(it.productId));
                      const perPiece = Number(getDefaultSellPricePerPiece(p2));
                      const mult2 = uomMultiplier(nextUom, it.customPackSize);

                      // If auto-price, recompute from per-piece price
                      const nextPrice =
                        it._autoPrice && Number.isFinite(perPiece) && perPiece !== 0 && mult2 > 0
                          ? String((perPiece * mult2).toFixed(3))
                          : it.unitPriceJod;

                      // also clamp qty
                      const max2 = p2 ? computeMaxUnits(p2, nextUom, it.customPackSize) : 0;
                      const nextQty =
                        max2 >= 1 ? "1" : "0";

                      setItem(idx, { qtyUom: nextUom, unitPriceJod: nextPrice, qtyInput: nextQty });
                    }}
                  >
                    {UOM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {normalizeUom(it.qtyUom) === "custom" ? (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={it.customPackSize}
                      onChange={(e) => {
                        const nextSize = e.target.value;
                        const p2 = productsById.get(String(it.productId));
                        const perPiece = Number(getDefaultSellPricePerPiece(p2));
                        const mult2 = uomMultiplier("custom", nextSize);

                        const nextPrice =
                          it._autoPrice && Number.isFinite(perPiece) && perPiece !== 0 && mult2 > 0
                            ? String((perPiece * mult2).toFixed(3))
                            : it.unitPriceJod;

                        const max2 = p2 ? computeMaxUnits(p2, "custom", nextSize) : 0;
                        const nextQty = max2 >= 1 ? "1" : "0";

                        setItem(idx, { customPackSize: nextSize, unitPriceJod: nextPrice, qtyInput: nextQty });
                      }}
                      placeholder="Custom pack size (pcs)"
                    />
                  ) : (
                    <div className="muted" style={{ alignSelf: "center" }}>
                      Unit: <b>{uomLabel}</b>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                  <select
                    value={it.qtyInput}
                    onChange={(e) => setItem(idx, { qtyInput: e.target.value })}
                    disabled={!it.productId || !(maxUnits >= 1)}
                  >
                    {!it.productId ? (
                      <option value="0">Select product first</option>
                    ) : maxUnits < 1 ? (
                      <option value="0">Out of stock for this unit</option>
                    ) : (
                      <>
                        {qtyOptions.map((k) => (
                          <option key={k} value={String(k)}>{k}</option>
                        ))}
                        {showMax ? (
                          <option value="__max__">Max ({maxUnits})</option>
                        ) : null}
                      </>
                    )}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={it.unitPriceJod}
                    onChange={(e) => setItem(idx, { unitPriceJod: e.target.value, _autoPrice: false })}
                    placeholder="Unit Price (JOD per selected unit)"
                  />
                </div>

                <div className="muted" style={{ marginTop: 6 }}>
                  Available: <b>{onHandPcs}</b> pcs
                  {" "}• In unit: <b>{maxUnits}</b> {uomLabel}
                  {" "}• Requested: <b>{qtyBase}</b> pcs
                  {tooMuch ? <span style={{ color: "#b91c1c", fontWeight: 800 }}> — Not enough stock</span> : null}
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

      {/* Latest 5 */}
      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Salesperson</th>
            <th>Items (pcs)</th>
            <th>Purchased Items (unit-based)</th>
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
              <td>{Number(s.items_count || 0)}</td>
              <td>{formatSaleItems(s)}</td>
              <td>{Number(s.total_jod || 0).toFixed(3)}</td>
              <td>{hasRole("main") ? <button onClick={() => handleDelete(s.id)}>Void</button> : "-"}</td>
            </tr>
          ))}

          {!latest.length ? (
            <tr>
              <td colSpan={7} className="muted">No transactions yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Older ones */}
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
                  <th>Items (pcs)</th>
                  <th>Purchased Items (unit-based)</th>
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
                    <td>{Number(s.items_count || 0)}</td>
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
