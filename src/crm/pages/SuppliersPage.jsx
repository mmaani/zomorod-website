import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";
import { Country, City } from "country-state-city";

/*
 * Suppliers page (updated):
 * - Business Name + Contact Name + Website
 * - Country dropdown (all countries; Jordan/China/Malaysia/Turkey/Syria pinned on top)
 * - City dropdown (depends on selected country)
 * - Supplier Categories multi-select saved to supplier_categories
 */

const PINNED = ["Jordan", "China", "Malaysia", "Turkey", "Syria"];

function normalize(v) {
  return String(v ?? "").trim();
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // country-state-city lists
  const allCountries = useMemo(() => Country.getAllCountries() || [], []);
  const countriesSorted = useMemo(() => {
    const pinned = [];
    const rest = [];
    for (const c of allCountries) {
      if (PINNED.includes(c.name)) pinned.push(c);
      else rest.push(c);
    }
    pinned.sort((a, b) => PINNED.indexOf(a.name) - PINNED.indexOf(b.name));
    rest.sort((a, b) => a.name.localeCompare(b.name));
    return [...pinned, ...rest];
  }, [allCountries]);

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
  };

  const [form, setForm] = useState(emptyForm);

  const selectedCountryObj = useMemo(() => {
    const name = normalize(form.supplierCountry);
    if (!name) return null;
    return countriesSorted.find((c) => c.name === name) || null;
  }, [form.supplierCountry, countriesSorted]);

  const cityOptions = useMemo(() => {
    if (!selectedCountryObj?.isoCode) return [];
    const cities = City.getCitiesOfCountry(selectedCountryObj.isoCode) || [];
    // Deduplicate by name (some datasets can repeat)
    const seen = new Set();
    const uniq = [];
    for (const c of cities) {
      const nm = c?.name?.trim();
      if (!nm || seen.has(nm)) continue;
      seen.add(nm);
      uniq.push({ name: nm });
    }
    uniq.sort((a, b) => a.name.localeCompare(b.name));
    return uniq;
  }, [selectedCountryObj]);

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
    setForm({
      id: s.id,
      businessName: s.businessName || "",
      contactName: s.contactName || "",
      phone: s.phone || "",
      email: s.email || "",
      website: s.website || "",
      supplierCountry: s.supplierCountry || "",
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

    const payload = {
      id: form.id,
      // name is optional; API will derive it from business/contact
      businessName: normalize(form.businessName),
      contactName: normalize(form.contactName),
      phone: normalize(form.phone),
      email: normalize(form.email),
      website: normalize(form.website),
      supplierCountry: normalize(form.supplierCountry),
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
                  const countryName = e.target.value;
                  // reset city when changing country
                  setForm((s) => ({ ...s, supplierCountry: countryName, supplierCity: "" }));
                }}
              >
                <option value="">Select country…</option>
                {countriesSorted.map((c) => (
                  <option key={c.isoCode} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>City</label>
              <select
                value={form.supplierCity}
                onChange={(e) => setForm((s) => ({ ...s, supplierCity: e.target.value }))}
                disabled={!form.supplierCountry}
              >
                <option value="">
                  {form.supplierCountry ? "Select city…" : "Select a country first…"}
                </option>
                {cityOptions.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
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
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setForm(emptyForm)}
              >
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
              <tr><td colSpan={9} className="muted">Loading…</td></tr>
            ) : null}

            {!loading && suppliers.length === 0 ? (
              <tr><td colSpan={9} className="muted">No suppliers yet.</td></tr>
            ) : null}

            {suppliers.map((s) => {
              const catNames =
                (s.categoryIds || [])
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
