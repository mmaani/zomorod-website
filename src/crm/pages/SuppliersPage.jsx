import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

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

function hostOnly(url) {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return url;
  }
}

/** Small pill/tag */
function Tag({ children, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "rgba(255,255,255,.05)",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        maxWidth: "100%",
      }}
      title={typeof children === "string" ? children : undefined}
    >
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {children}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="btn btn-ghost"
          style={{
            padding: 0,
            width: 18,
            height: 18,
            borderRadius: 999,
            lineHeight: "18px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Remove"
          title="Remove"
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

/**
 * Category multi-select:
 * - search box
 * - scroll list
 * - chips for selected
 */
function CategoryMultiSelect({
  label = "Product Categories (supplier can provide)",
  categories,
  valueIds,
  onChangeIds,
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const rootRef = useRef(null);

  const categoriesById = useMemo(() => {
    const m = new Map();
    for (const c of categories || []) m.set(c.id, c);
    return m;
  }, [categories]);

  const selected = useMemo(() => {
    return (valueIds || [])
      .map((id) => categoriesById.get(id))
      .filter(Boolean);
  }, [valueIds, categoriesById]);

  const filtered = useMemo(() => {
    const t = term.toLowerCase().trim();
    if (!t) return categories || [];
    return (categories || []).filter((c) => String(c.name || "").toLowerCase().includes(t));
  }, [term, categories]);

  // close on outside click + ESC
  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      const el = rootRef.current;
      if (el && !el.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id) {
    const has = (valueIds || []).includes(id);
    const next = has ? valueIds.filter((x) => x !== id) : [...valueIds, id];
    onChangeIds(next);
  }

  function clear() {
    onChangeIds([]);
  }

  function selectAllFiltered() {
    const ids = new Set(valueIds || []);
    for (const c of filtered) ids.add(c.id);
    onChangeIds(Array.from(ids));
  }

  function removeSelected(id) {
    onChangeIds((valueIds || []).filter((x) => x !== id));
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
        {label}
      </label>

      {/* Selected chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {selected.length ? (
          selected.map((c) => (
            <Tag key={c.id} onRemove={() => removeSelected(c.id)}>
              {c.name}
            </Tag>
          ))
        ) : (
          <span className="muted">None selected</span>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Select categories"}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={clear}
          disabled={!valueIds?.length}
        >
          Clear
        </button>

        <span className="muted">{(valueIds || []).length} selected</span>
      </div>

      {/* Dropdown */}
      {open ? (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            left: 0,
            right: 0,
            marginTop: 10,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--card-bg, rgba(20,20,20,.96))",
            boxShadow: "0 20px 50px rgba(0,0,0,.45)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Search categories…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              style={{ flex: "1 1 240px" }}
              autoFocus
            />
            <button type="button" className="btn btn-ghost" onClick={selectAllFiltered}>
              Select filtered
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              maxHeight: 260,
              overflowY: "auto",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "rgba(255,255,255,.03)",
            }}
          >
            {(filtered || []).length ? (
              filtered.map((c) => {
                const checked = (valueIds || []).includes(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(255,255,255,.06)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(c.id)}
                    />
                    <span style={{ fontWeight: 800 }}>{c.name}</span>
                  </label>
                );
              })
            ) : (
              <div className="muted" style={{ padding: 12 }}>
                No categories match.
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
              Done
            </button>
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

  // Search/filter
  const [q, setQ] = useState("");
  const [categoryFilterId, setCategoryFilterId] = useState(0);

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
    for (const name of all) (PINNED.includes(name) ? pinned : rest).push(name);
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
    for (const c of categories || []) m.set(c.id, c);
    return m;
  }, [categories]);

  async function load(opts = {}) {
    const q0 = normalize(opts.q ?? q);
    const catId = Number(opts.categoryId ?? categoryFilterId) || 0;

    setLoading(true);
    setErr("");

    const qs = new URLSearchParams();
    if (q0) qs.set("q", q0);
    if (catId > 0) qs.set("categoryId", String(catId));

    const url = `/api/suppliers${qs.toString() ? `?${qs.toString()}` : ""}`;

    const res = await apiFetch(url).catch((e) => {
      setErr(e?.message || "Network error");
      return null;
    });

    const data = await res?.json().catch(() => ({}));

    if (!res?.ok || !data?.ok) {
      setErr(data?.error || data?.detail || `HTTP ${res?.status || ""}`);
      setLoading(false);
      return;
    }

    setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
    setCategories(Array.isArray(data.categories) ? data.categories : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reload for search/filter
  useEffect(() => {
    const t = setTimeout(() => load({ q, categoryId: categoryFilterId }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryFilterId]);

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

    // scroll to form (nice UX)
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    const res = await apiFetch(`/api/suppliers?id=${id}`, { method: "DELETE" }).catch((e) => {
      alert(e?.message || "Network error");
      return null;
    });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || data?.detail || "Failed to delete supplier");
      return;
    }
    load();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

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

    const res = await apiFetch("/api/suppliers", { method, body: payload }).catch((e) => {
      setErr(e?.message || "Network error");
      return null;
    });

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setErr(data?.error || data?.detail || "Failed to save supplier");
      return;
    }

    setForm(emptyForm);
    load();
  };

  // Layout styles that do NOT depend on your CSS helpers
  const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  };
  const grid3 = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  };

  return (
    <div className="container">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Suppliers</h2>
        <div className="muted" style={{ fontWeight: 700 }}>
          {loading ? "Loading…" : `${suppliers.length} suppliers`}
        </div>
      </div>

      {err ? (
        <div className="banner" style={{ marginTop: 10 }}>
          {err}
        </div>
      ) : null}

      {/* Search + Filter */}
      <div className="card" style={{ padding: 14, marginTop: 12, marginBottom: 12 }}>
        <div style={{ ...grid3 }}>
          <div style={{ minWidth: 240 }}>
            <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Search</label>
            <input
              className="input"
              placeholder="Name, business, email, phone, country..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="small muted" style={{ marginTop: 6 }}>
              Searches across name/business/contact/email/phone/website/country/city.
            </div>
          </div>

          <div style={{ minWidth: 220 }}>
            <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Category filter</label>
            <select
              value={categoryFilterId}
              onChange={(e) => setCategoryFilterId(Number(e.target.value) || 0)}
            >
              <option value={0}>All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setQ("");
                setCategoryFilterId(0);
              }}
            >
              Clear
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => load()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {hasRole("main") && (
        <form onSubmit={onSubmit} className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{form.id ? "Edit Supplier" : "Add Supplier"}</h3>
            {form.id ? (
              <button className="btn btn-ghost" type="button" onClick={() => setForm(emptyForm)}>
                Cancel edit
              </button>
            ) : null}
          </div>

          {/* Business + Contact */}
          <div style={{ ...grid2, marginTop: 12 }}>
            <div>
              <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Business Name</label>
              <input
                className="input"
                placeholder="Company / Business name"
                value={form.businessName}
                onChange={(e) => setForm((s) => ({ ...s, businessName: e.target.value }))}
              />
              <div className="small muted" style={{ marginTop: 6 }}>
                If empty, Business Name will be set to Contact Name automatically.
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Contact Name</label>
              <input
                className="input"
                placeholder="Person name"
                value={form.contactName}
                onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))}
              />
            </div>
          </div>

          {/* Phone / Email / Website */}
          <div style={{ ...grid3, marginTop: 12 }}>
            <div>
              <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Phone</label>
              <input
                className="input"
                placeholder="+962..."
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Email</label>
              <input
                className="input"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Website (optional)</label>
              <input
                className="input"
                placeholder="https://... or example.com"
                value={form.website}
                onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              />
            </div>
          </div>

          {/* Country / City */}
          <div style={{ ...grid2, marginTop: 12 }}>
            <div>
              <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>Country</label>
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

            <div>
              <label style={{ fontWeight: 800, display: "block", marginBottom: 6 }}>City</label>
              <input
                className="input"
                placeholder={effectiveCountry ? "City (free text)" : "Select country first…"}
                value={form.supplierCity}
                onChange={(e) => setForm((s) => ({ ...s, supplierCity: e.target.value }))}
                disabled={!effectiveCountry}
              />
            </div>
          </div>

          {/* Categories (searchable multi select) */}
          <div style={{ marginTop: 12 }}>
            {categories.length === 0 ? (
              <div className="muted">No categories found. Add categories via Products first.</div>
            ) : (
              <CategoryMultiSelect
                categories={categories}
                valueIds={form.categoryIds}
                onChangeIds={(ids) => setForm((s) => ({ ...s, categoryIds: ids }))}
              />
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button className="btn btn-primary" type="submit">
              {form.id ? "Update Supplier" : "Add Supplier"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="table-wrap">
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
                <td colSpan={9} className="muted">Loading…</td>
              </tr>
            ) : null}

            {!loading && suppliers.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">No suppliers yet.</td>
              </tr>
            ) : null}

            {suppliers.map((s) => {
              const catObjs = (s.categoryIds || [])
                .map((id) => categoriesById.get(id))
                .filter(Boolean);

              const displayBusiness = s.businessName || s.contactName || s.name;

              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 800 }}>{displayBusiness}</td>
                  <td>{s.contactName || <span className="muted">—</span>}</td>
                  <td>{s.supplierCountry || <span className="muted">—</span>}</td>
                  <td>{s.supplierCity || <span className="muted">—</span>}</td>
                  <td>
                    {s.phone ? (
                      <a href={`tel:${s.phone}`} rel="noreferrer">{s.phone}</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {s.email ? (
                      <a href={`mailto:${s.email}`} rel="noreferrer">{s.email}</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noreferrer">
                        {hostOnly(s.website)}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td style={{ maxWidth: 360 }}>
                    {catObjs.length ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {catObjs.slice(0, 6).map((c) => (
                          <Tag key={c.id}>{c.name}</Tag>
                        ))}
                        {catObjs.length > 6 ? (
                          <span className="muted" style={{ fontWeight: 800 }}>
                            +{catObjs.length - 6} more
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

      {/* Simple responsive fallback for narrow screens */}
      <style>{`
        @media (max-width: 900px) {
          table { font-size: 13px; }
          th:nth-child(7), td:nth-child(7) { display: none; } /* hide Website column on small screens */
        }
        @media (max-width: 700px) {
          th:nth-child(5), td:nth-child(5) { display: none; } /* hide Phone */
          th:nth-child(6), td:nth-child(6) { display: none; } /* hide Email */
        }
      `}</style>
    </div>
  );
}
