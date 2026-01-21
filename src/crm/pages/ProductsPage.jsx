import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { getUser, hasRole } from "../auth.js";

function fmtJod(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(3);
}

function fmtDate(d) {
  if (!d) return "";
  // Neon/Postgres DATE often arrives like "2026-01-21"
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString();
}

export default function ProductsPage() {
  const user = useMemo(() => getUser(), []);
  const canSeePurchase = hasRole("main") || hasRole("doctor");
  const canAdd = hasRole("main");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [products, setProducts] = useState([]);

  // Add form state
  const [productCode, setProductCode] = useState("");
  const [category, setCategory] = useState("");
  const [officialName, setOfficialName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [defaultSellPriceJod, setDefaultSellPriceJod] = useState("");

  const [tierMinQty, setTierMinQty] = useState("");
  const [tierUnitPrice, setTierUnitPrice] = useState("");
  const [priceTiers, setPriceTiers] = useState([]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch("/api/products");
      if (!res) return; // apiFetch redirects on 401
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      setErr(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addTier() {
    const minQty = Number(tierMinQty);
    const unitPriceJod = Number(tierUnitPrice);
    if (!Number.isFinite(minQty) || minQty <= 0) return;
    if (!Number.isFinite(unitPriceJod) || unitPriceJod <= 0) return;

    setPriceTiers((prev) => {
      const next = [...prev, { minQty, unitPriceJod }];
      next.sort((a, b) => a.minQty - b.minQty);
      return next;
    });
    setTierMinQty("");
    setTierUnitPrice("");
  }

  function removeTier(minQty) {
    setPriceTiers((prev) => prev.filter((t) => t.minQty !== minQty));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    const payload = {
      productCode: productCode.trim(),
      category: category.trim(),
      officialName: officialName.trim(),
      marketName: marketName.trim(),
      defaultSellPriceJod: defaultSellPriceJod === "" ? 0 : Number(defaultSellPriceJod),
      priceTiers,
    };

    if (!payload.productCode || !payload.officialName) {
      setErr("Product Code and Official Name are required.");
      return;
    }

    try {
      const res = await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);

      // reset form
      setProductCode("");
      setCategory("");
      setOfficialName("");
      setMarketName("");
      setDefaultSellPriceJod("");
      setPriceTiers([]);

      await load();
    } catch (e2) {
      setErr(e2?.message || "Failed to add product");
    }
  }

  return (
    <div className="crm-page">
      <div className="crm-toolbar">
        <h2 className="crm-h2">Products</h2>
        <div className="crm-toolbar__right">
          <button className="button button--ghost" type="button" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {err ? <div className="crm-alert">{err}</div> : null}

      {canAdd ? (
        <form className="crm-card" onSubmit={submit}>
          <div className="crm-card__title">Add Product (Main only)</div>

          <div className="crm-grid">
            <label className="crm-field">
              <span>Product Code *</span>
              <input value={productCode} onChange={(e) => setProductCode(e.target.value)} />
            </label>

            <label className="crm-field">
              <span>Category</span>
              <input value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>

            <label className="crm-field">
              <span>Official Name *</span>
              <input value={officialName} onChange={(e) => setOfficialName(e.target.value)} />
            </label>

            <label className="crm-field">
              <span>Market Name</span>
              <input value={marketName} onChange={(e) => setMarketName(e.target.value)} />
            </label>

            <label className="crm-field">
              <span>Default Sell Price (JOD)</span>
              <input
                inputMode="decimal"
                value={defaultSellPriceJod}
                onChange={(e) => setDefaultSellPriceJod(e.target.value)}
                placeholder="e.g. 0.500"
              />
            </label>
          </div>

          <div className="crm-divider" />

          <div className="crm-row">
            <div className="crm-row__title">Optional price tiers</div>
            <div className="crm-row__inputs">
              <input
                inputMode="numeric"
                placeholder="Min Qty"
                value={tierMinQty}
                onChange={(e) => setTierMinQty(e.target.value)}
              />
              <input
                inputMode="decimal"
                placeholder="Unit Price (JOD)"
                value={tierUnitPrice}
                onChange={(e) => setTierUnitPrice(e.target.value)}
              />
              <button className="button button--primary" type="button" onClick={addTier}>
                Add Tier
              </button>
            </div>
          </div>

          {priceTiers.length ? (
            <div className="crm-tiers">
              {priceTiers.map((t) => (
                <div className="crm-tier" key={t.minQty}>
                  <span>
                    {t.minQty}+ → {fmtJod(t.unitPriceJod)} JOD
                  </span>
                  <button
                    className="button button--ghost"
                    type="button"
                    onClick={() => removeTier(t.minQty)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ height: 10 }} />
          <button className="button button--primary" type="submit">
            Save Product
          </button>
        </form>
      ) : (
        <div className="crm-card">
          <div className="crm-card__title">Add Product</div>
          <div className="crm-muted">
            You are logged in as <strong>{user?.email || "user"}</strong>. Only <strong>The Admin </strong> can add
            products.
          </div>
        </div>
      )}

      <div className="crm-card">
        <div className="crm-card__title">Product List</div>

        {loading ? (
          <div className="crm-muted">Loading…</div>
        ) : (
          <div className="crm-tableWrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Official</th>
                  <th>Market</th>
                  <th style={{ textAlign: "right" }}>On Hand</th>
                  <th style={{ textAlign: "right" }}>Sell (JOD)</th>
                  {canSeePurchase ? (
                    <>
                      <th style={{ textAlign: "right" }}>Last Buy (JOD)</th>
                      <th>Last Buy Date</th>
                    </>
                  ) : null}
                  <th>Price Tiers</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.productCode}</td>
                    <td>{p.category}</td>
                    <td>{p.officialName}</td>
                    <td>{p.marketName}</td>
                    <td style={{ textAlign: "right" }}>{Number(p.onHandQty || 0)}</td>
                    <td style={{ textAlign: "right" }}>{fmtJod(p.defaultSellPriceJod)}</td>

                    {canSeePurchase ? (
                      <>
                        <td style={{ textAlign: "right" }}>{fmtJod(p.lastPurchasePriceJod)}</td>
                        <td>{fmtDate(p.lastPurchaseDate)}</td>
                      </>
                    ) : null}

                    <td>
                      {Array.isArray(p.priceTiers) && p.priceTiers.length
                        ? p.priceTiers
                            .map((t) => `${t.minQty}+ → ${fmtJod(t.unitPriceJod)}`)
                            .join(" | ")
                        : "—"}
                    </td>
                  </tr>
                ))}
                {!products.length ? (
                  <tr>
                    <td colSpan={canSeePurchase ? 9 : 7} className="crm-muted">
                      No products yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
