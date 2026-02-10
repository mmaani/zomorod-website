import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

/*
  Improvements (safe, no DB changes):
  - Better layout alignment (helper text is clamped + fixed height)
  - Category picker scales to many categories (search + chips + scroll)
  - Server-side search + category filter (calls /api/suppliers?q=&categoryId=)
*/

const PINNED = ["Jordan", "China", "Malaysia", "Turkey", "Syria"];

// Small safe list (you can expand anytime)
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
        border: "1px solid var(--border)",
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

/** Scalable multi-select category picker */
function CategoryPicker({ categories, valueIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);

  const byId = useMemo(() => {
    const m = new Map();
    for (const c of categories || []) m.set(Number(c.id), c);
    return m;
  }, [categories]);

  const selected = useMemo(() => {
    return (valueIds || []).map((id) => byId.get(Number(id))).filter(Boolean);
  }, [valueIds, byId]);

  const filtered = useMemo(() => {
    const term = normalize(q).toLowerCase();
    const list = categories || [];
    if (!term) return list;
    return list.filter((c) => String(c.name || "").toLowerCase().includes(term));
  }, [categories, q]);

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(id) {
    const cid = Number(id);
    const has = (valueIds || []).includes(cid);
    const next = has ? (valueIds || []).filter((x) => x !== cid) : [...(valueIds || []), cid];
    onChange(next);
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      {/* Selected chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {selected.length ? (
          selected.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              onRemove={() => onChange((valueIds || []).filter((x) => x !== Number(c.id)))}
            />
          ))
        ) : (
          <span className="muted" style={{ fontSize: 13 }}>
            No categories selected.
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((s) => !s)}>
          {open ? "Close categories" : "Choose categories"}
        </button>

        {selected.length ? (
          <button type="button" className="btn btn-ghost" onClick={() => onChange([])}>
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            right: 0,
            zIndex: 30,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "rgba(10, 20, 18, 0.92)",
            backdropFilter: "blur(10px)",
            padding: 12,
            boxShadow: "0 18px 50px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <input
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
                const checked = (valueIds || []).includes(Number(c.id));
                return (
                  <label
                    key={c.id}
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
                    <input type="checkbox" checked={checked} onChange={() => toggle(c.id)} />
                    <span style={{ fontWeight: 800 }}>{c.name}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Tip: search + check, then close.
          </div>
        </div>
      ) : null}
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

  const categoriesById = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(Number(c.id), c);
    return m;
  }, [categories]);

  const hintStyle = {
    marginTop: 6,
    fontSize: 12,
    opacity: 0.75,

    // IMPORTANT: keep alignment + prevent box growth
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
      setLoading(false);
      return;
    }

    setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
    setCategories(Array.isArray(data.categories) ? data.categories : []);
    setLoading(false);
  }

  // Single effect => no double load
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
      categoryIds: Array.isArray(s.categoryIds) ? s.categoryIds : [],
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

    if (!normalize(form.businessName) && !normalize(form.contactName)) {
      alert("Business Name or Contact Name is required");
      return;
    }

    if (normalize(form.supplierCountry) === "Other" && !normalize(form.supplierCountryOther)) {
      alert("Please type the country name (Other).");
      return;
    }

    const payload = {
      id: form.id,
      businessName: normalize(form.businessName),
      contactName: normalize(form.contactName),
      phone: normalize(form.phone),
      email: normalize(form.email),
      website: normalize(form.website),
      supplierCountry: effectiveCountry,
      supplierCity: normalize(form.supplierCity),
      categoryIds: form.categoryIds,
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
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
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
              <div className="muted" style={hintStyle}>
                {/* keep height aligned */}
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
            {categories.length === 0 ? (
              <div className="muted" style={{ marginTop: 8 }}>
                No categories found. Add categories via Products first.
              </div>
            ) : (
              <CategoryPicker
                categories={categories}
                valueIds={form.categoryIds}
                onChange={(ids) => setForm((s) => ({ ...s, categoryIds: ids }))}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit">
              {form.id ? "Update Supplier" : "Add Supplier"}
            </button>
            {form.id && (
              <button className="btn btn-ghost" type="button" onClick={() => setForm(emptyForm)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Table */}
      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="table">
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
              const catNames = (s.categoryIds || [])
                .map((id) => categoriesById.get(Number(id))?.name)
                .filter(Boolean);

              const business = s.businessName || s.contactName || s.name;

              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 900 }}>{business}</td>
                  <td>{s.contactName || <span className="muted">—</span>}</td>
                  <td>{s.supplierCountry || <span className="muted">—</span>}</td>
                  <td>{s.supplierCity || <span className="muted">—</span>}</td>
                  <td>{s.phone || <span className="muted">—</span>}</td>
                  <td>{s.email || <span className="muted">—</span>}</td>

                  <td>
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noreferrer">
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
                        <button className="btn btn-ghost" type="button" onClick={() => handleEdit(s)}>
                          Edit
                        </button>{" "}
                        <button className="btn btn-danger" type="button" onClick={() => handleDelete(s.id)}>
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
  );
}
