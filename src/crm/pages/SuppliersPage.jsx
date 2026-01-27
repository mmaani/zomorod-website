import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";
import { Country, City } from "country-state-city";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]); // used to extract categories
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: null,
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    website: "",
    supplierCountry: "", // ISO2 e.g. "JO"
    supplierCity: "",
    categoryNames: [], // string[]
  });

  const PINNED = useMemo(() => ["JO", "CN", "MY", "TR", "SY"], []);

  const allCountries = useMemo(() => {
    const list = Country.getAllCountries().map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
    }));

    const pinned = [];
    const rest = [];
    for (const c of list) {
      if (PINNED.includes(c.isoCode)) pinned.push(c);
      else rest.push(c);
    }

    pinned.sort((a, b) => a.name.localeCompare(b.name));
    rest.sort((a, b) => a.name.localeCompare(b.name));
    return [...pinned, ...rest];
  }, [PINNED]);

  const citiesForCountry = useMemo(() => {
    if (!form.supplierCountry) return [];
    try {
      const cities = City.getCitiesOfCountry(form.supplierCountry) || [];
      return cities
        .map((x) => x.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  }, [form.supplierCountry]);

  const categoryOptions = useMemo(() => {
    // Best effort: derive from your existing products list
    // (because you already have product_categories table, but no dedicated endpoint shown)
    const set = new Set();
    for (const p of products) {
      if (p?.category) set.add(String(p.category).trim());
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [products]);

  async function load() {
    setLoading(true);
    try {
      const [supRes, prodRes] = await Promise.all([
        apiFetch("/api/suppliers"),
        apiFetch("/api/products?includeArchived=1"),
      ]);

      if (supRes) {
        const supData = await supRes.json().catch(() => ({}));
        if (supRes.ok && supData.ok) setSuppliers(supData.suppliers || []);
      }

      if (prodRes) {
        const prodData = await prodRes.json().catch(() => ({}));
        if (prodRes.ok && prodData.ok) setProducts(prodData.products || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm({
      id: null,
      businessName: "",
      contactName: "",
      phone: "",
      email: "",
      website: "",
      supplierCountry: "",
      supplierCity: "",
      categoryNames: [],
    });
  }

  function onToggleCategory(name) {
    setForm((s) => {
      const exists = s.categoryNames.includes(name);
      return {
        ...s,
        categoryNames: exists
          ? s.categoryNames.filter((x) => x !== name)
          : [...s.categoryNames, name],
      };
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const businessName = String(form.businessName || "").trim();
    const contactName = String(form.contactName || "").trim();
    const finalBusinessName = businessName || contactName;

    if (!finalBusinessName) return alert("Business Name or Contact Name is required");

    const payload = {
      id: form.id,
      businessName: businessName, // server will fallback if empty
      contactName,
      phone: String(form.phone || "").trim(),
      email: String(form.email || "").trim(),
      website: String(form.website || "").trim(),
      supplierCountry: form.supplierCountry || "",
      supplierCity: form.supplierCity || "",
      categoryNames: Array.isArray(form.categoryNames) ? form.categoryNames : [],
    };

    const method = form.id ? "PATCH" : "POST";
    const res = await apiFetch("/api/suppliers", { method, body: payload });
    const data = await res?.json().catch(() => ({}));

    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Save failed");
      return;
    }

    resetForm();
    load();
  };

  const handleEdit = (s) => {
    setForm({
      id: s.id,
      businessName: s.business_name || s.name || "",
      contactName: s.contact_name || "",
      phone: s.phone || "",
      email: s.email || "",
      website: s.website || "",
      supplierCountry: s.supplier_country || "",
      supplierCity: s.supplier_city || "",
      categoryNames: Array.isArray(s.categories)
        ? s.categories.map((c) => c?.name).filter(Boolean)
        : [],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    const res = await apiFetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    load();
  };

  return (
    <div className="crm-content">
      <div className="crm-card">
        <div className="dash-hero">
          <div>
            <h2 className="dash-title">Suppliers</h2>
            <div className="dash-sub">Manage supplier profiles, location, website, and supply categories.</div>
          </div>
        </div>

        {hasRole("main") && (
          <form onSubmit={handleSubmit} style={{ marginTop: 14 }} className="crm-card">
            <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Supplier" : "Add Supplier"}</h3>

            <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div className="field">
                <label>Business Name</label>
                <input
                  className="crm-input"
                  placeholder="Business Name (optional if Contact Name is set)"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                />
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  If Business Name is empty, it will be saved as Contact Name.
                </div>
              </div>

              <div className="field">
                <label>Contact Name</label>
                <input
                  className="crm-input"
                  placeholder="Contact person"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Phone</label>
                <input
                  className="crm-input"
                  placeholder="+962..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  className="crm-input"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Website</label>
                <input
                  className="crm-input"
                  placeholder="https://..."
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Country</label>
                <select
                  className="crm-input"
                  value={form.supplierCountry}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    setForm((s) => ({
                      ...s,
                      supplierCountry: nextCountry,
                      supplierCity: "", // reset city when country changes
                    }));
                  }}
                >
                  <option value="">Select country...</option>
                  {allCountries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>City</label>
                <select
                  className="crm-input"
                  value={form.supplierCity}
                  onChange={(e) => setForm({ ...form, supplierCity: e.target.value })}
                  disabled={!form.supplierCountry}
                >
                  <option value="">{form.supplierCountry ? "Select city..." : "Select a country first"}</option>
                  {citiesForCountry.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Supply Categories (multi-select)</label>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categoryOptions.length ? (
                    categoryOptions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className={`crm-btn ${form.categoryNames.includes(name) ? "crm-btn-primary" : "crm-btn-outline"}`}
                        onClick={() => onToggleCategory(name)}
                        style={{ padding: "8px 10px" }}
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <div className="muted">No categories found yet. Add products with categories first.</div>
                  )}
                </div>

                {/* Optional: add custom category */}
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input
                    className="crm-input"
                    placeholder="Type a new category and press Add"
                    value={form._newCat || ""}
                    onChange={(e) => setForm((s) => ({ ...s, _newCat: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="crm-btn crm-btn-outline"
                    onClick={() => {
                      const name = String(form._newCat || "").trim();
                      if (!name) return;
                      setForm((s) => ({
                        ...s,
                        categoryNames: s.categoryNames.includes(name) ? s.categoryNames : [...s.categoryNames, name],
                        _newCat: "",
                      }));
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="crm-btn crm-btn-primary" type="submit">
                {form.id ? "Update Supplier" : "Add Supplier"}
              </button>

              {form.id && (
                <button className="crm-btn crm-btn-outline" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <div style={{ marginTop: 16 }}>
          {loading ? <div className="muted">Loading…</div> : null}

          <div className="table-wrap" style={{ marginTop: 10 }}>
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
                {!loading && suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="muted">
                      No suppliers yet.
                    </td>
                  </tr>
                ) : null}

                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.business_name || s.name}</td>
                    <td>{s.contact_name || "—"}</td>
                    <td>{s.supplier_country || "—"}</td>
                    <td>{s.supplier_city || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td>{s.email || "—"}</td>
                    <td>
                      {s.website ? (
                        <a href={s.website} target="_blank" rel="noreferrer">
                          {s.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {Array.isArray(s.categories) && s.categories.length ? (
                        s.categories.map((c) => c.name).join(", ")
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {hasRole("main") ? (
                        <>
                          <button className="crm-btn crm-btn-outline" type="button" onClick={() => handleEdit(s)}>
                            Edit
                          </button>{" "}
                          <button className="crm-btn crm-btn-outline" type="button" onClick={() => handleDelete(s.id)}>
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


        </div>
      </div>
    </div>
  );
}
