// SalespersonsPage.jsx
import React, { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

const empty = {
  id: null,
  salespersonType: "external",
  employeeId: "",
  firstName: "",
  lastName: "",
  displayName: "",
  phone: "",
  email: "",
  isDefault: false,
};

export default function SalespersonsPage() {
  const [salespersons, setSalespersons] = useState([]);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");

  const isMain = hasRole("main");

  async function load() {
    setErr("");
    const res = await apiFetch("/api/salespersons");
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setErr(data?.error || "Failed to load salespersons");
      return;
    }
    setSalespersons(data.salespersons || []);
  }

  useEffect(() => {
    load();
  }, []);

  if (!isMain) {
    return (
      <div className="container">
        <h2>Salespersons</h2>
        <div className="banner">Access denied (main only).</div>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.displayName.trim()) {
      setErr("Display Name is required");
      return;
    }

    const method = form.id ? "PATCH" : "POST";
    const res = await apiFetch("/api/salespersons", {
      method,
      body: {
        id: form.id,
        salespersonType: form.salespersonType,
        employeeId: form.employeeId || null,
        firstName: form.firstName || null,
        lastName: form.lastName || null,
        displayName: form.displayName,
        phone: form.phone || null,
        email: form.email || null,
        isDefault: !!form.isDefault,
      },
    });

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      setErr(data?.error || "Save failed");
      return;
    }

    setForm(empty);
    load();
  };

  const edit = (sp) => {
    setForm({
      id: sp.id,
      salespersonType: sp.salespersonType || "external",
      employeeId: sp.employeeId || "",
      firstName: sp.firstName || "",
      lastName: sp.lastName || "",
      displayName: sp.displayName || "",
      phone: sp.phone || "",
      email: sp.email || "",
      isDefault: !!sp.isDefault,
    });
  };

  const remove = async (id) => {
    if (!window.confirm("Delete salesperson?")) return;
    const res = await apiFetch(`/api/salespersons?id=${id}`, { method: "DELETE" });
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Delete failed");
      return;
    }
    load();
  };

  return (
    <div className="container">
      <h2>Salespersons</h2>

      {err ? <div className="banner">{err}</div> : null}

      <form onSubmit={onSubmit} className="card">
        <h3>{form.id ? "Edit Salesperson" : "Add Salesperson"}</h3>

        <select value={form.salespersonType} onChange={(e) => setForm({ ...form, salespersonType: e.target.value })}>
          <option value="employee">Employee</option>
          <option value="external">External</option>
        </select>

        <input
          placeholder="Employee ID (optional)"
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            placeholder="First name (optional)"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <input
            placeholder="Last name (optional)"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>

        <input
          placeholder="Display name (required)"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
          Set as default salesperson
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button type="submit">{form.id ? "Update" : "Add"}</button>
          {form.id ? (
            <button type="button" onClick={() => setForm(empty)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <table className="table" style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Display Name</th>
            <th>Type</th>
            <th>Employee ID</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Default</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {salespersons.map((sp) => (
            <tr key={sp.id} style={sp.isDefault ? { fontWeight: 800 } : undefined}>
              <td>{sp.displayName}</td>
              <td>{sp.salespersonType}</td>
              <td>{sp.employeeId || "-"}</td>
              <td>{sp.phone || "-"}</td>
              <td>{sp.email || "-"}</td>
              <td>{sp.isDefault ? "YES" : ""}</td>
              <td>
                <button onClick={() => edit(sp)}>Edit</button>{" "}
                {!sp.isDefault ? <button onClick={() => remove(sp.id)}>Delete</button> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
