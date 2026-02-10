import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

/*
 * Suppliers page (production-safe):
 * - No external dataset dependency (removes country-state-city)
 * - Country dropdown uses a small built-in list + optional free text "Other"
 * - City is free text input
 * - Categories multi-select saved to supplier_categories
 */

const PINNED = ["Jordan", "China", "Malaysia", "Turkey", "Syria"];

// Small, safe list (you can expand anytime without affecting bundle much)
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    // optional: when country is "Other"
    supplierCountryOther: "",
  };

  const [form, setForm] = useState(emptyForm);

  const countriesSorted = useMemo(() => {
    // De-duplicate and keep pinned on top
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

  // Effective country that goes to API
  const effectiveCountry = useMemo(() => {
    const raw = normalize(form.supplierCountry);
    if (raw === "Other") return normalize(form.supplierCountryOther);
    return raw;
  }, [form.supplierCountry, form.supplierCountryOther]);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/api/suppliers");
    if (!res) {
      setLoading(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setSuppliers(data.suppliers || []);
      setCategories(data.categories || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (s) => {
    // If stored country is not in our list, set dropdown to Other + store actual value
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
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    await apiFetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
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

    // Business Name preferred; if empty, backend will copy Contact Name.
    if (!normalize(form.businessName) && !normalize(form.contactName)) {
      alert("Business Name or Contact Name is required");
      return;
    }

    // If user picked Other, enforce providing text
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
    await apiFetch("/api/suppliers", { method, body: payload });

    setForm(emptyForm);
    load();
  };

  return (
    <div className="container">
      <h2>Suppliers</h2>

      {hasRole("main") && (
        <form onSubmit={onSubmit} className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Supplier" : "Add Supplier"}</h3>

          {/* Business name + contact */}
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
                placeholder="https://..."
                value={form.website}
                onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
              />
            </div>
          </div>

          {/* Country + City */}
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

          {/* Categories multi-select */}
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
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(c.id)}
                      />
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
                .map((id) => categories.find((c) => c.id === id)?.name)
                .filter(Boolean);

              return (
                <tr key={s.id}>
                  <td>{s.businessName || s.contactName || s.name}</td>
                  <td>{s.contactName}</td>
                  <td>{s.supplierCountry}</td>
                  <td>{s.supplierCity}</td>
                  <td>{s.phone}</td>
                  <td>{s.email}</td>
                  <td>
                    {s.website ? (
                      <a href={s.website} target="_blank" rel="noreferrer">
                        {s.website}
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{catNames.length ? <span>{catNames.join(", ")}</span> : <span className="muted">—</span>}</td>
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
