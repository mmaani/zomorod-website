// src/crm/pages/SuppliersPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

/*
  Fixes + Improvements (safe, no DB changes):
  ✅ Fix dropdown list issue for "Product Categories" picker:
     - Render the dropdown in a portal (document.body) + position: fixed
     - This prevents clipping/covering by parent cards/tables (overflow/z-index/stacking contexts)
  ✅ Robust ID handling: never use invalid ids (id <= 0)
  ✅ Website link normalization (adds https:// when missing)
  ✅ Business Name fallback: if empty, uses Contact Name in payload (matches helper text)
  ✅ Cleaner buttons (use btn classes like ClientsPage)
  ✅ Server-side search + category filter (/api/suppliers?q=&categoryId=)
*/

const PINNED = ["Jordan", "China", "Malaysia", "Turkey", "Syria"];

const COUNTRY_LIST = [
  ...PINNED,
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Egypt",
  "Lebanon",
  "Iraq",
  "Yemen",
  "Palestine",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "United Kingdom",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "United States",
  "Canada",
  "Mexico",
  "Brazil",
  "India",
  "Pakistan",
  "Bangladesh",
  "Indonesia",
  "Singapore",
  "Thailand",
  "Vietnam",
  "South Korea",
  "Japan",
  "Australia",
  "South Africa",
];

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
        maxWidth: 260,
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 210,
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

/**
 * Scalable multi-select category picker.
 * ✅ Uses Portal + position: fixed to avoid being covered/clipped by parent containers.
 */
function CategoryPicker({ categories, valueIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const ids = useMemo(() => uniqInts(valueIds), [valueIds]);

  const byId = useMemo(() => {
    const m = new Map();
    for (const c of categories || []) m.set(toInt(c.id), c);
    return m;
  }, [categories]);

  const selected = useMemo(() => {
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }, [ids, byId]);

  const filtered = useMemo(() => {
    const term = normalize(q).toLowerCase();
    const list = Array.isArray(categories) ? categories : [];
    if (!term) return list;
    return list.filter((c) => normalize(c?.name).toLowerCase().includes(term));
  }, [categories, q]);

  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  function updatePos() {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: Math.round(r.bottom + 10),
      left: Math.round(r.left),
      width: Math.round(r.width),
    });
  }

  // Open/close handlers
  useEffect(() => {
    if (!open) return;

    updatePos();

    const onScroll = () => requestAnimationFrame(updatePos);
    const onResize = () => requestAnimationFrame(updatePos);

    // capture scroll from any scroll container
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Close on outside click (works with portal)
  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      const t = e.target;
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (anchor && anchor.contains(t)) return;
      if (panel && panel.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  function toggle(idRaw) {
    const cid = toInt(idRaw);
    if (!cid) return;
    const has = ids.includes(cid);
    const next = has ? ids.filter((x) => x !== cid) : [...ids, cid];
    onChange(next);
  }

  function clearAll() {
    onChange([]);
  }

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose categories"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999, // ✅ ensure on top of cards/tables
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
                placeholder="Search categories…"
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
                maxHeight: 260,
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
                filtered.map((c) => {
                  const cid = toInt(c.id);
                  const checked = ids.includes(cid);
                  return (
                    <label
                      key={cid}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        borderBottom: "1px solid rgba(255,255,255,.06)",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggle(cid)} />
                      <span style={{ fontWeight: 800 }}>{c.name}</span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Tip: search + check, then close. (Esc closes)
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} style={{ position: "relative" }}>
      {/* Selected chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {selected.length ? (
          selected.map((c) => {
            const cid = toInt(c.id);
            const label = normalize(c.name) || `Category #${cid}`;
            return <Chip key={cid} label={label} title={label} onRemove={() => onChange(ids.filter((x) => x !== cid))} />;
          })
        ) : (
          <span className="muted" style={{ fontSize: 13 }}>
            No categories selected.
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen((s) => !s)}
          aria-expanded={open}
        >
          {open ? "Close categories" : "Choose categories"}
        </button>

        {ids.length ? (
          <button type="button" className="btn btn-ghost" onClick={clearAll}>
            Clear
          </button>
        ) : null}
      </div>

      {panel}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filters
  const [searchQ, setSearchQ] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState("");

  const dSearchQ = useDebounced(searchQ, 250);
  const dCategoryFilterId = useDebounced(categoryFilterId, 250);

  const emptyForm = {
    id: null,
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    website: "",
    supplierCountry: "",
    supplierCity: "",
    categoryIds: [],
    supplierCountryOther: "",
  };

  const [form, setForm] = useState(emptyForm);

  const countriesSorted = useMemo(() => {
    const set = new Set(COUNTRY_LIST.map((x) => normalize(x)).filter(Boolean));
    const all = Array.from(set);

    const pinned = [];
    const rest = [];
    for (const name of all) {
      if (PINNED.includes(name)) pinned.push(name);
      else rest.push(name);
    }
    pinned.sort((a, b) => PINNED.indexOf(a) - PINNED.indexOf(b));
    rest.sort((a, b) => a.localeCompare(b));
    return [...pinned, ...rest];
  }, []);

  const effectiveCountry = useMemo(() => {
    const raw = normalize(form.supplierCountry);
    if (raw === "Other") return normalize(form.supplierCountryOther);
    return raw;
  }, [form.supplierCountry, form.supplierCountryOther]);

  // ✅ Safety: remove invalid category ids (prevents weird selection behavior)
  const categoriesSafe = useMemo(() => {
    return (Array.isArray(categories) ? categories : [])
      .map((c) => ({ ...c, id: toInt(c?.id), name: normalize(c?.name) }))
      .filter((c) => c.id > 0 && c.name);
  }, [categories]);

  const categoriesById = useMemo(() => {
    const m = new Map();
    for (const c of categoriesSafe) m.set(toInt(c.id), c);
    return m;
  }, [categoriesSafe]);

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

  async function load(q = dSearchQ, categoryId = dCategoryFilterId) {
    setLoading(true);
    setErr("");

    const qs = new URLSearchParams();
    const qq = normalize(q);
    const cc = normalize(categoryId);

    if (qq) qs.set("q", qq);
    if (cc) qs.set("categoryId", cc);

    const url = `/api/suppliers${qs.toString() ? "?" + qs.toString() : ""}`;

    const res = await apiFetch(url);
    const data = await res?.json().catch(() => ({}));

    if (!res?.ok || !data?.ok) {
      setErr(data?.error || data?.detail || `Failed to load suppliers (${res?.status || "?"})`);
      setSuppliers([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
    setCategories(Array.isArray(data.categories) ? data.categories : []);
    setLoading(false);
  }

  useEffect(() => {
    load(dSearchQ, dCategoryFilterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dSearchQ, dCategoryFilterId]);

  const handleEdit = (s) => {
    const storedCountry = normalize(s.supplierCountry);
    const inList = countriesSorted.includes(storedCountry);

    setForm({
      id: s.id,
      businessName: s.businessName || "",
      contactName: s.contactName || "",
      phone: s.phone || "",
      email: s.email || "",
      website: s.website || "",
      supplierCountry: inList ? storedCountry : storedCountry ? "Other" : "",
      supplierCountryOther: inList ? "" : storedCountry,
      supplierCity: s.supplierCity || "",
      categoryIds: uniqInts(s.categoryIds),
    });

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    const res = await apiFetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to delete supplier");
      return;
    }
    load();
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const businessName = normalize(form.businessName);
    const contactName = normalize(form.contactName);

    if (!businessName && !contactName) {
      alert("Business Name or Contact Name is required");
      return;
    }

    if (normalize(form.supplierCountry) === "Other" && !normalize(form.supplierCountryOther)) {
      alert("Please type the country name (Other).");
      return;
    }

    const payload = {
      id: form.id,
      // ✅ enforce the helper-text promise
      businessName: businessName || contactName,
      contactName,
      phone: normalize(form.phone),
      email: normalize(form.email),
      website: normalize(form.website),
      supplierCountry: effectiveCountry,
      supplierCity: normalize(form.supplierCity),
      categoryIds: uniqInts(form.categoryIds),
    };

    const method = form.id ? "PATCH" : "POST";
    const res = await apiFetch("/api/suppliers", { method, body: payload });
    const data = await res?.json().catch(() => ({}));

    if (!res?.ok || !data?.ok) {
      alert(data?.error || data?.detail || "Failed to save supplier");
      return;
    }

    setForm(emptyForm);
    load();
  };

  return (
    <div className="container">
      <h2>Suppliers</h2>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
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
              placeholder="Name, business, email, phone, country..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <div className="muted" style={hintStyle}>
              Searches across name/business/contact/email/phone/website/country/city.
            </div>
          </div>

          <div className="field">
            <label>Category filter</label>
            <select
              value={categoryFilterId}
              onChange={(e) => setCategoryFilterId(e.target.value)}
              className="input"
            >
              <option value="">All categories</option>
              {categoriesSafe.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="muted" style={hintStyle}>
              Filters suppliers who can provide this category.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSearchQ("");
                setCategoryFilterId("");
              }}
            >
              Clear
            </button>

            <button type="button" className="btn btn-ghost" onClick={() => load()}>
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
        <form onSubmit={onSubmit} className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Supplier" : "Add Supplier"}</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
              marginBottom: 12,
              alignItems: "start",
            }}
          >
            <div className="field">
              <label>Business Name</label>
              <input
                className="input"
                placeholder="Company / Business name"
                value={form.businessName}
                onChange={(e) => setForm((s) => ({ ...s, businessName: e.target.value }))}
              />
              <div className="muted" style={hintStyle}>
                If empty, Business Name will be set to Contact Name automatically.
              </div>
            </div>

            <div className="field">
              <label>Contact Name</label>
              <input
                className="input"
                placeholder="Person name"
                value={form.contactName}
                onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))}
              />
              <div className="muted" style={hintStyle} />
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

            <div className="field">
              <label>Website (optional)</label>
              <input
                className="input"
                placeholder="https://... or example.com"
                value={form.website}
                onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div className="field">
              <label>Country</label>
              <select
                value={form.supplierCountry}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((s) => ({
                    ...s,
                    supplierCountry: v,
                    supplierCountryOther: v === "Other" ? s.supplierCountryOther : "",
                  }));
                }}
                className="input"
              >
                <option value="">Select country…</option>
                {countriesSorted.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="Other">Other…</option>
              </select>

              {form.supplierCountry === "Other" ? (
                <input
                  className="input"
                  style={{ marginTop: 8 }}
                  placeholder="Type country name"
                  value={form.supplierCountryOther}
                  onChange={(e) => setForm((s) => ({ ...s, supplierCountryOther: e.target.value }))}
                />
              ) : null}
            </div>

            <div className="field">
              <label>City</label>
              <input
                className="input"
                placeholder={effectiveCountry ? "City (free text)" : "Select country first…"}
                value={form.supplierCity}
                onChange={(e) => setForm((s) => ({ ...s, supplierCity: e.target.value }))}
                disabled={!effectiveCountry}
              />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Product Categories (supplier can provide)</label>
            {categoriesSafe.length === 0 ? (
              <div className="muted" style={{ marginTop: 8 }}>
                No categories found. Add categories via Products first.
              </div>
            ) : (
              <CategoryPicker
                categories={categoriesSafe}
                valueIds={form.categoryIds}
                onChange={(ids) => setForm((s) => ({ ...s, categoryIds: uniqInts(ids) }))}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit">
              {form.id ? "Update Supplier" : "Add Supplier"}
            </button>
            {form.id ? (
              <button className="btn btn-ghost" type="button" onClick={() => setForm(emptyForm)}>
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
                <th>Business Name</th>
                <th>Contact</th>
                <th>Country</th>
                <th>City</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Website</th>
                <th>Categories</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="muted">
                    Loading…
                  </td>
                </tr>
              ) : null}

              {!loading && suppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="muted">
                    No suppliers yet.
                  </td>
                </tr>
              ) : null}

              {suppliers.map((s) => {
                const catNames = uniqInts(s.categoryIds)
                  .map((id) => categoriesById.get(id)?.name)
                  .filter(Boolean);

                const business = normalize(s.businessName) || normalize(s.contactName) || normalize(s.name) || "—";

                const website = normalize(s.website);
                const websiteHref =
                  website && (website.startsWith("http://") || website.startsWith("https://"))
                    ? website
                    : website
                    ? `https://${website}`
                    : "";

                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 900 }}>{business}</td>
                    <td>{s.contactName || <span className="muted">—</span>}</td>
                    <td>{s.supplierCountry || <span className="muted">—</span>}</td>
                    <td>{s.supplierCity || <span className="muted">—</span>}</td>
                    <td>{s.phone || <span className="muted">—</span>}</td>
                    <td>{s.email || <span className="muted">—</span>}</td>

                    <td>
                      {websiteHref ? (
                        <a href={websiteHref} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td>
                      {catNames.length ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {catNames.slice(0, 6).map((name) => (
                            <Chip key={name} label={name} title={name} />
                          ))}
                          {catNames.length > 6 ? (
                            <span className="muted" style={{ fontSize: 12 }}>
                              +{catNames.length - 6} more
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      {hasRole("main") ? (
                        <>
                          <button type="button" className="btn btn-ghost" onClick={() => handleEdit(s)}>
                            Edit
                          </button>{" "}
                          <button type="button" className="btn btn-danger" onClick={() => handleDelete(s.id)}>
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
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
