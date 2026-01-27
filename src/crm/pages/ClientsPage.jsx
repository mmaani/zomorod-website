import React, { useState, useEffect } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

/*
 * Client management page.  Lists clients and allows creation,
 * modification and deletion for users with the 'main' role.  The
 * previous implementation assumed that `apiFetch` returned parsed
 * JSON.  However, `apiFetch` returns a Fetch Response, so this page
 * now calls `.json()` on the response before accessing the payload.
 */

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ id: null, name: "", contactName: "", phone: "", email: "" });

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
    if (!form.name) return alert("Name required");
    const method = form.id ? "PATCH" : "POST";
    await apiFetch("/api/clients", { method, body: { ...form } });
    setForm({ id: null, name: "", contactName: "", phone: "", email: "" });
    load();
  };

  const handleEdit = (c) => setForm({ id: c.id, name: c.name, contactName: c.contact_name || "", phone: c.phone || "", email: c.email || "" });

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await apiFetch(`/api/clients?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="container">
      <h2>Clients</h2>
      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>{form.id ? "Edit Client" : "Add Client"}</h3>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <button type="submit">{form.id ? "Update" : "Add"}</button>
          {form.id && (
            <button type="button" onClick={() => setForm({ id: null, name: "", contactName: "", phone: "", email: "" })}>
              Cancel
            </button>
          )}
        </form>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.contact_name}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td>
                {hasRole("main") && (
                  <>
                    <button onClick={() => handleEdit(c)}>Edit</button>
                    <button onClick={() => handleDelete(c.id)}>Delete</button>
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