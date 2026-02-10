import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

/*
 * Enhancements:
 * - Search (q)
 * - Filter by categoryId
 * - CSV export
 * - Click-to-copy phone/email
 * - mailto/tel links
 * - Shows API errors in banner
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

function safeHostname(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return url;
  }
}

async function copyText(text) {
  const t = normalize(text);
  if (!t) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    // fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function toCsv(rows) {
  // Very simple CSV escaping (quotes + commas)
  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // list controls
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState(""); // string for <select>
  const [limit, setLimit] = useState(500);

  const topRef = useRef(null);

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
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  async function load(opts = {}) {
    const q2 = opts.q ?? q;
    const categoryId2 = opts.categoryId ?? categoryId;
    const limit2 = opts.limit ?? limit;

    setLoading(true);
    setErr("");

    const params = new URLSearchParams();
    if (normalize(q2)) params.set("q", normalize(q2));
    if (n(categoryId2) > 0) params.set("categoryId", String(n(categoryId2)));
    if (n(limit2) > 0) params.set("limit", String(n(limit2)));

    const url = `/api/suppliers${params.toString() ? `?${params.toString()}` : ""}`;

    let res;
    try {
      res = await apiFetch(url);
    } catch (e) {
      setErr(e?.message || "Failed to load suppliers");
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setErr(data?.error || data?.detail || `HTTP ${res.status}`);
      setLoading(false);
      return;
    }

    setSuppliers(data.suppliers || []);
    setCategories(data.categories || []);
    setLoading(false);
  }

  // initial load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced reload on q/category/limit
  useEffect(() => {
    const t = setTimeout(() => {
      load({ q, categoryId, limit });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId, limit]);

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

    // scroll to top so edit form is visible
    try {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    setErr("");
    const res = await apiFetch(`/api/suppliers?id=${id}`, { method: "DELETE" }).catch((e) => {
      setErr(e?.message || "Delete failed");
      return null;
    });

    if (res) {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setErr(data?.error || data?.detail || "Delete failed");
        return;
      }
    }

    load();
  };

  const toggleCategory = (categoryId) => {
    setForm((prev) => {
      const has = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: has
          ? prev.categoryIds.filter((x) => x !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
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
      setErr(e?.message || "Save failed");
      return null;
    });

    if (!res) return;

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      setErr(data?.error || data?.detail || "Save failed");
      return;
    }

    setForm(emptyForm);
    load();
  };

  function exportCsv() {
    const header = [
      "Business Name",
      "Contact Name",
      "Country",
      "City",
      "Phone",
      "Email",
      "Website",
      "Categories",
    ];

    const rows = suppliers.map((s) => {
      const cats = (s.categoryIds || [])
        .map((id) => categoriesById.get(id))
        .filter(Boolean)
        .join("; ");
      return [
        s.businessName || s.contactName || s.name || "",
        s.contactName || "",
        s.supplierCountry || "",
        s.supplierCity || "",
        s.phone || "",
        s.email || "",
        s.website || "",
        cats || "",
      ];
    });

    const csv = toCsv([header, ...rows]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `suppliers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="container" ref={topRef}>
      <h2>Suppliers</h2>

      {err ? <div className="banner">{err}</div> : null}

      {/* List Controls */}
      <div className="card" style={{ padding: 14, marginBottom: 14 }}>
        <div className="grid grid-3" style={{ alignItems: "end", gap: 10 }}>
          <div className="field">
            <label>Search</label>
            <input
              className="input"
              placeholder="Search name / phone / email / country / city..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Filter by Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Limit</label>
            <select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="2000">2000</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" type="button" onClick={() => { setQ(""); setCategoryId(""); }}>
            Clear filters
          </button>
          <button className="btn btn-ghost" type="button" onClick={exportCsv}>
            Export CSV
          </button>
          {loading ? <span className="muted">Loading…</span> : <span className="muted">{suppliers.length} suppliers</span>}
        </div>
      </div>

      {hasRole("main") && (
        <form onSubmit={onSubmit} className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Supplier" : "Add Supplier"}</h3>

          <div className="grid grid-2" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Business Name</label>
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

            <div className="field">
              <label>Contact Name</label>
              <input
                className="input"
                placeholder="Person name"
                value={form.contactName}
                onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 12 }}>
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
                placeholder="example.com"
                value={form.website}
                onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-2" style={{ marginBottom: 12 }}>
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
              <div className="muted">No categories found. Add categories via Products first.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                {categories.map((c) => {
                  const checked = form.categoryIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "rgba(255,255,255,.04)",
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleCategory(c.id)} />
                      <span style={{ fontWeight: 700 }}>{c.name}</span>
                    </label>
                  );
                })}
              </div>
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
                .map((id) => categoriesById.get(id))
                .filter(Boolean);

              const business = s.businessName || s.contactName || s.name || "—";
              const phone = normalize(s.phone);
              const email = normalize(s.email);

              return (
                <tr key={s.id}>
                  <td>{business}</td>
                  <td>{s.contactName || <span className="muted">—</span>}</td>
                  <td>{s.supplierCountry || <span className="muted">—</span>}</td>
                  <td>{s.supplierCity || <span className="muted">—</span>}</td>

                  <td style={{ whiteSpace: "nowrap" }}>
                    {phone ? (
                      <>
                        <a href={`tel:${phone}`}>{phone}</a>{" "}
                        <button className="btn btn-ghost" type="button" onClick={() => copyText(phone)}>
                          Copy
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td style={{ whiteSpace: "nowrap" }}>
                    {email ? (
                      <>
                        <a href={`mailto:${email}`}>{email}</a>{" "}
                        <button className="btn btn-ghost" type="button" onClick={() => copyText(email)}>
                          Copy
                        </button>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td>
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noreferrer">
                        {safeHostname(s.website)}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td>
                    {catNames.length ? (
                      <span>{catNames.join(", ")}</span>
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

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
