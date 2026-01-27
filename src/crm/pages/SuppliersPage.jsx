import React, { useState, useEffect } from "react";
import apiFetch from "../api";
import { hasRole } from "../auth";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", contactName: "", phone: "", email: "" });

  async function load() {
    const data = await apiFetch("/api/suppliers");
    if (data.ok) setSuppliers(data.suppliers);
  }

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert("Name required");
    const method = form.id ? "PATCH" : "POST";
    await apiFetch("/api/suppliers", { method, body: form });
    setForm({ id: null, name: "", contactName: "", phone: "", email: "" });
    load();
  };

  const handleEdit = (s) => setForm({ ...s });

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await apiFetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="container">
      <h2>Suppliers</h2>
      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>{form.id ? "Edit Supplier" : "Add Supplier"}</h3>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <button type="submit">{form.id ? "Update" : "Add"}</button>
          {form.id && <button type="button" onClick={() => setForm({ id: null, name: "", contactName: "", phone: "", email: "" })}>Cancel</button>}
        </form>
      )}
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.contact_name}</td>
              <td>{s.phone}</td>
              <td>{s.email}</td>
              <td>
                {hasRole("main") && (
                  <>
                    <button onClick={() => handleEdit(s)}>Edit</button>
                    <button onClick={() => handleDelete(s.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
