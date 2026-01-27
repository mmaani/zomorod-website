import React, { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    id: null,
    clientType: "customer",
    name: "",
    website: "",
    contactPerson: "",
    phone: "",
    email: "",
  });

  async function load() {
    const res = await apiFetch("/api/clients");
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) setClients(data.clients || []);
  }

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Name required");

    const method = form.id ? "PATCH" : "POST";
    const payload = {
      id: form.id,
      clientType: form.clientType,
      name: form.name,
      website: form.website,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
    };

    const res = await apiFetch("/api/clients", { method, body: payload });
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      alert(data?.error || `HTTP ${res.status}`);
      return;
    }

    setForm({
      id: null,
      clientType: "customer",
      name: "",
      website: "",
      contactPerson: "",
      phone: "",
      email: "",
    });
    load();
  };

  const handleEdit = (c) =>
    setForm({
      id: c.id,
      clientType: c.client_type || "customer",
      name: c.name || "",
      website: c.website || "",
      contactPerson: c.contact_person || "",
      phone: c.phone || "",
      email: c.email || "",
    });

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    const res = await apiFetch(`/api/clients?id=${id}`, { method: "DELETE" });
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      alert(data?.error || `HTTP ${res.status}`);
      return;
    }
    load();
  };

  return (
    <div className="container">
      <h2>Clients</h2>

      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>{form.id ? "Edit Client" : "Add Client"}</h3>

          <select value={form.clientType} onChange={(e) => setForm({ ...form, clientType: e.target.value })}>
            <option value="customer">Customer</option>
            <option value="hospital">Hospital</option>
            <option value="clinic">Clinic</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="distributor">Distributor</option>
            <option value="other">Other</option>
          </select>

          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <input
            placeholder="Contact Person"
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
          />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <button type="submit">{form.id ? "Update" : "Add"}</button>

          {form.id && (
            <button
              type="button"
              onClick={() =>
                setForm({
                  id: null,
                  clientType: "customer",
                  name: "",
                  website: "",
                  contactPerson: "",
                  phone: "",
                  email: "",
                })
              }
            >
              Cancel
            </button>
          )}
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Contact</th>
            <th>Website</th>
            <th>Phone</th>
            <th>Email</th>
            {hasRole("main") ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.client_type}</td>
              <td>{c.name}</td>
              <td>{c.contact_person}</td>
              <td>{c.website}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              {hasRole("main") ? (
                <td>
                  <button onClick={() => handleEdit(c)}>Edit</button>
                  <button onClick={() => handleDelete(c.id)}>Delete</button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
