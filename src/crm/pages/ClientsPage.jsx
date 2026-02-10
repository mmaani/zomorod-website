// src/crm/pages/ClientsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

/*
  Enhancements (safe, no DB changes):
  - Fix edit bug (interestProductIds now loads from client interests)
  - Better layout (grid + aligned helper text)
  - Scalable product-interest picker (search + chips + scroll)
  - Filters (debounced): search + type + product-interest filter (calls /api/clients?q=&clientType=&productId=)

  IMPORTANT robustness:
  - Never render/select products with invalid ids (id <= 0) to avoid “first item not selectable” issues.
*/

function normalize(v) {
  return String(v ?? "").trim();
}
function toInt(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function uniqInts(arr) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(arr) ? arr : []) {
    const x = toInt(v);
    if (x > 0 && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}
function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function productLabel(p) {
  const code = normalize(p?.productCode);
  const name = normalize(p?.officialName);
  if (code && name) return `${code} — ${name}`;
  return name || code || "Product";
}

function Chip({ label, onRemove, title }) {
  return (
    <span
      title={title || label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid var(--z-border)",
        background: "rgba(255,255,255,.06)",
        fontSize: 13,
        fontWeight: 800,
        lineHeight: "14px",
        maxWidth: 360,
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 300,
          display: "inline-block",
        }}
      >
        {label}
      </span>

      {onRemove ? (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onRemove}
          style={{ padding: "2px 8px", borderRadius: 999 }}
          aria-label={`Remove ${label}`}
          title="Remove"
        >
          ✕
        </button>
      ) : null}
    </span>
  );
}

/** Multi-select products (search + chips + scroll). Value is always number[] */
function ProductPicker({ products, valueIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  const searchRef = useRef(null);

  const ids = useMemo(() => uniqInts(valueIds), [valueIds]);

  const byId = useMemo(() => {
    const m = new Map();
    for (const p of products || []) m.set(toInt(p.id), p);
    return m;
  }, [products]);

  const selected = useMemo(() => ids.map((id) => byId.get(id)).filter(Boolean), [ids, byId]);

  const filtered = useMemo(() => {
    const term = normalize(q).toLowerCase();
    const list = products || [];
    if (!term) return list;
    return list.filter((p) => productLabel(p).toLowerCase().includes(term));
  }, [products, q]);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  function toggle(idRaw) {
    const pid = toInt(idRaw);
    if (!pid) return;
    const has = ids.includes(pid);
    const next = has ? ids.filter((x) => x !== pid) : [...ids, pid];
    onChange(next);
  }

  return (
    <div
      ref={boxRef}
      style={{
        position: "relative",
        zIndex: open ? 200 : 1, // ✅ helps if table/cards below overlap
      }}
    >
      {/* Selected chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {selected.length ? (
          selected.map((p) => {
            const pid = toInt(p.id);
            const label = productLabel(p);
            return (
              <Chip
                key={pid}
                label={label}
                title={label}
                onRemove={() => onChange(ids.filter((x) => x !== pid))}
              />
            );
          })
        ) : (
          <span className="muted" style={{ fontSize: 13 }}>
            No products selected.
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((s) => !s)} aria-expanded={open}>
          {open ? "Close products" : "Choose products"}
        </button>

        {ids.length ? (
          <button type="button" className="btn btn-ghost" onClick={() => onChange([])}>
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose products"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            right: 0,
            zIndex: 9999, // ✅ always above siblings
            borderRadius: 14,
            border: "1px solid var(--z-border)",
            background: "rgba(10, 20, 18, 0.92)",
            backdropFilter: "blur(10px)",
            padding: 12,
            boxShadow: "0 18px 50px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input
              ref={searchRef}
              className="input"
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-ghost" onClick={() => setQ("")}>
              Reset
            </button>
          </div>

          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            {filtered.length === 0 ? (
              <div className="muted" style={{ padding: 12 }}>
                No matches.
              </div>
            ) : (
              filtered.map((p) => {
                const pid = toInt(p.id);
                const checked = ids.includes(pid);
                const code = normalize(p.productCode);
                const name = normalize(p.officialName);
                return (
                  <label
                    key={pid}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(255,255,255,.06)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(pid)} style={{ marginTop: 3 }} />
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 900, lineHeight: "16px" }}>{name || code || "Product"}</div>
                      {code && name ? (
                        <div className="muted" style={{ fontSize: 12, lineHeight: "14px" }}>
                          {code}
                        </div>
                      ) : null}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Tip: search + check, then close. (Esc closes)
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Single-select product filter (searchable) */
function ProductFilterPicker({ products, valueId, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  const searchRef = useRef(null);

  const vid = toInt(valueId);

  const byId = useMemo(() => {
    const m = new Map();
    for (const p of products || []) m.set(toInt(p.id), p);
    return m;
  }, [products]);

  const selected = vid ? byId.get(vid) : null;

  const filtered = useMemo(() => {
    const term = normalize(q).toLowerCase();
    const list = products || [];
    if (!term) return list;
    return list.filter((p) => productLabel(p).toLowerCase().includes(term));
  }, [products, q]);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const label = selected ? productLabel(selected) : "All products";

  return (
    <div
      ref={boxRef}
      style={{
        position: "relative",
        zIndex: open ? 200 : 1, // ✅ critical: make this stack above the next card
      }}
    >
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        style={{ width: "100%", textAlign: "left" }}
      >
        {label}
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            right: 0,
            zIndex: 9999, // ✅ ensure above Add Client card
            borderRadius: 14,
            border: "1px solid var(--z-border)",
            background: "rgba(10, 20, 18, 0.92)",
            backdropFilter: "blur(10px)",
            padding: 12,
            boxShadow: "0 18px 50px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input
              ref={searchRef}
              className="input"
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setQ("");
                onChange("");
                setOpen(false);
              }}
              title="Clear filter"
            >
              Clear
            </button>
          </div>

          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                borderBottom: "1px solid rgba(255,255,255,.06)",
                borderRadius: 0,
              }}
            >
              All products
            </button>

            {filtered.map((p) => {
              const pid = toInt(p.id);
              const isActive = pid === vid;
              const pl = productLabel(p);
              return (
                <button
                  key={pid}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    onChange(String(pid));
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(255,255,255,.06)",
                    borderRadius: 0,
                    background: isActive ? "rgba(14,142,50,0.16)" : "transparent",
                    borderLeft: isActive ? "3px solid rgba(14,142,50,0.65)" : "3px solid transparent",
                  }}
                  title={pl}
                >
                  {pl}
                </button>
              );
            })}
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Tip: pick one product to filter clients by interest. (Esc closes)
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    id: null,
    clientType: "pharmacy",
    name: "",
    website: "",
    contactPerson: "",
    phone: "",
    email: "",
    interestProductIds: [],
  });

  // Filters (server-side)
  const [searchQ, setSearchQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [productFilterId, setProductFilterId] = useState("");

  const dSearchQ = useDebounced(searchQ, 250);
  const dTypeFilter = useDebounced(typeFilter, 250);
  const dProductFilterId = useDebounced(productFilterId, 250);

  const hintStyle = {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.75,
    lineHeight: "16px",
    minHeight: 32,
    maxHeight: 32,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  };

  // ✅ VERY IMPORTANT: remove products with invalid ids so nothing appears “unselectable”
  const productsSafe = useMemo(() => {
    return (Array.isArray(products) ? products : [])
      .map((p) => ({ ...p, id: toInt(p?.id) }))
      .filter((p) => toInt(p.id) > 0);
  }, [products]);

  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of productsSafe) m.set(toInt(p.id), p);
    return m;
  }, [productsSafe]);

  async function loadProducts() {
    const res = await apiFetch("/api/products");
    const data = await res?.json().catch(() => ({}));
    if (res?.ok && data?.ok) setProducts(Array.isArray(data.products) ? data.products : []);
  }

  async function loadClients(q = dSearchQ, ct = dTypeFilter, pid = dProductFilterId) {
    setLoading(true);
    setErr("");

    const qs = new URLSearchParams();
    const qq = normalize(q);
    const tt = normalize(ct);
    const pp = normalize(pid);

    if (qq) qs.set("q", qq);
    if (tt) qs.set("clientType", tt);
    if (pp) qs.set("productId", pp);

    const url = `/api/clients${qs.toString() ? `?${qs.toString()}` : ""}`;

    const res = await apiFetch(url);
    const data = await res?.json().catch(() => ({}));

    if (!res?.ok || !data?.ok) {
      setErr(data?.error || data?.detail || `Failed to load clients (${res?.status || "?"})`);
      setClients([]);
      setLoading(false);
      return;
    }

    setClients(Array.isArray(data.clients) ? data.clients : []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadClients(dSearchQ, dTypeFilter, dProductFilterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSearchQ, dTypeFilter, dProductFilterId]);

  const resetForm = () =>
    setForm({
      id: null,
      clientType: "pharmacy",
      name: "",
      website: "",
      contactPerson: "",
      phone: "",
      email: "",
      interestProductIds: [],
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!normalize(form.name)) return alert("Name required");

    const method = form.id ? "PATCH" : "POST";
    const payload = {
      id: form.id,
      clientType: normalize(form.clientType) || "pharmacy",
      name: normalize(form.name),
      website: normalize(form.website),
      contactPerson: normalize(form.contactPerson),
      phone: normalize(form.phone),
      email: normalize(form.email),
      interestProductIds: uniqInts(form.interestProductIds),
    };

    const res = await apiFetch("/api/clients", { method, body: payload });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || data?.detail || `HTTP ${res?.status || "?"}`);
      return;
    }

    resetForm();
    loadClients();
  };

  const handleEdit = (c) => {
    const interestIds = Array.isArray(c?.interests)
      ? c.interests.map((i) => toInt(i?.id)).filter((x) => x > 0)
      : [];

    setForm({
      id: c.id,
      clientType: c.client_type || "pharmacy",
      name: c.name || "",
      website: c.website || "",
      contactPerson: c.contact_person || "",
      phone: c.phone || "",
      email: c.email || "",
      interestProductIds: uniqInts(interestIds),
    });

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    const res = await apiFetch(`/api/clients?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || data?.detail || `HTTP ${res?.status || "?"}`);
      return;
    }
    loadClients();
  };

  return (
    <div className="container">
      <h2>Clients</h2>

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 16,
          position: "relative",
          zIndex: 50, // ✅ makes this card paint above the Add Client card
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div className="field">
            <label>Search</label>
            <input
              className="input"
              placeholder="Name, contact, email, phone, website…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <div className="muted" style={hintStyle}>
              Searches across name/contact/email/phone/website.
            </div>
          </div>

          <div className="field">
            <label>Type filter</label>
            <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="customer">Customer</option>
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
              <option value="distributor">Distributor</option>
              <option value="other">Other</option>
            </select>
            <div className="muted" style={hintStyle}>
              Filters by client type.
            </div>
          </div>

          <div className="field">
            <label>Product interest filter</label>
            <ProductFilterPicker products={productsSafe} valueId={productFilterId} onChange={setProductFilterId} />
            <div className="muted" style={hintStyle}>
              Filters clients who are interested in a specific product.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSearchQ("");
                setTypeFilter("");
                setProductFilterId("");
              }}
            >
              Clear
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => loadClients()}>
              Refresh
            </button>
          </div>
        </div>

        {err ? (
          <div className="banner" style={{ marginTop: 12 }}>
            {err}
          </div>
        ) : null}
      </div>

      {/* Form */}
      {hasRole("main") && (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            padding: 16,
            marginBottom: 16,
            position: "relative",
            zIndex: 1, // ✅ keep below filters popover
          }}
        >
          <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Client" : "Add Client"}</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginBottom: 12,
              alignItems: "start",
            }}
          >
            <div className="field">
              <label>Client Type</label>
              <select
                className="input"
                value={form.clientType}
                onChange={(e) => setForm((s) => ({ ...s, clientType: e.target.value }))}
              >
                <option value="pharmacy">Pharmacy</option>
                <option value="customer">Customer</option>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="distributor">Distributor</option>
                <option value="other">Other</option>
              </select>
              <div className="muted" style={hintStyle} />
            </div>

            <div className="field">
              <label>Name</label>
              <input
                className="input"
                placeholder="Client name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
              <div className="muted" style={hintStyle}>
                Required.
              </div>
            </div>

            <div className="field">
              <label>Website</label>
              <input
                className="input"
                placeholder="example.com"
                value={form.website}
                onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              />
              <div className="muted" style={hintStyle}>
                Optional.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div className="field">
              <label>Contact Person</label>
              <input
                className="input"
                placeholder="Full name"
                value={form.contactPerson}
                onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Phone</label>
              <input
                className="input"
                placeholder="+962..."
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                className="input"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Client Interests (products)</label>
            {productsSafe.length === 0 ? (
              <div className="muted" style={{ marginTop: 8 }}>
                No products found. Add products first.
              </div>
            ) : (
              <ProductPicker
                products={productsSafe}
                valueIds={form.interestProductIds}
                onChange={(ids) => setForm((s) => ({ ...s, interestProductIds: uniqInts(ids) }))}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit">
              {form.id ? "Update" : "Add"}
            </button>
            {form.id ? (
              <button className="btn btn-ghost" type="button" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Interests</th>
                <th>Website</th>
                <th>Phone</th>
                <th>Email</th>
                {hasRole("main") ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={hasRole("main") ? 8 : 7} className="muted">
                    Loading…
                  </td>
                </tr>
              ) : null}

              {!loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={hasRole("main") ? 8 : 7} className="muted">
                    No clients yet.
                  </td>
                </tr>
              ) : null}

              {clients.map((c) => {
                const interests = Array.isArray(c.interests) ? c.interests : [];
                const interestLabels = interests
                  .map((i) => {
                    const pid = toInt(i?.id);
                    const p = productsById.get(pid);
                    return p ? productLabel(p) : normalize(i?.name) || "";
                  })
                  .filter(Boolean);

                const website = normalize(c.website);
                const websiteHref =
                  website && (website.startsWith("http://") || website.startsWith("https://"))
                    ? website
                    : website
                    ? `https://${website}`
                    : "";

                return (
                  <tr key={c.id}>
                    <td>{c.client_type || "—"}</td>
                    <td style={{ fontWeight: 900 }}>{c.name || "—"}</td>
                    <td>{c.contact_person || <span className="muted">—</span>}</td>

                    <td>
                      {interestLabels.length ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {interestLabels.slice(0, 6).map((lbl) => (
                            <Chip key={lbl} label={lbl} title={lbl} />
                          ))}
                          {interestLabels.length > 6 ? (
                            <span className="muted" style={{ fontSize: 12 }}>
                              +{interestLabels.length - 6} more
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td>
                      {website ? (
                        <a href={websiteHref} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td>{c.phone || <span className="muted">—</span>}</td>
                    <td>{c.email || <span className="muted">—</span>}</td>

                    {hasRole("main") ? (
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" className="btn btn-ghost" onClick={() => handleEdit(c)}>
                          Edit
                        </button>{" "}
                        <button type="button" className="btn btn-danger" onClick={() => handleDelete(c.id)}>
                          Delete
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
