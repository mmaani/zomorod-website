import React, { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { getUser, hasRole } from "../auth.js";

const emptyForm = {
  id: null,
  fullName: "",
  email: "",
  password: "",
  role: "general",
  isActive: true,
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isMain = hasRole("main");
  const me = getUser();

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/me?scope=users", { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to load users");
        return;
      }
      setUsers(data.users || []);
    } catch (e) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isMain) loadUsers();
  }, [isMain]);

  if (!isMain) {
    return (
      <div className="container">
        <h2>User Management</h2>
        <div className="banner">Access denied (main only).</div>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim() || !form.email.trim() || !form.role) {
      setError("Full name, email, and role are required");
      return;
    }

    const isCreate = !form.id;
    if (isCreate && !form.password) {
      setError("Password is required when creating a user");
      return;
    }

    const body = {
      ...(form.id ? { id: form.id } : {}),
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      isActive: !!form.isActive,
    };

    if (form.password) body.password = form.password;

    try {
      const res = await apiFetch("/api/me?scope=users", {
        method: isCreate ? "POST" : "PATCH",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to save user");
        return;
      }
      setForm(emptyForm);
      loadUsers();
    } catch (e) {
      setError(e?.message || "Failed to save user");
    }
  }

  function editUser(u) {
    setForm({
      id: u.id,
      fullName: u.fullName || "",
      email: u.email || "",
      password: "",
      role: (u.roles && u.roles[0]) || "general",
      isActive: u.isActive !== false,
    });
  }

  async function removeUser(id) {
    if (!window.confirm("Delete this user?")) return;

    try {
      const res = await apiFetch(`/api/me?scope=users&id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to delete user");
        return;
      }
      loadUsers();
    } catch (e) {
      setError(e?.message || "Failed to delete user");
    }
  }

  return (
    <div className="container">
      <h2>User Management</h2>
      <p className="muted" style={{ marginTop: -6 }}>Create, edit, and delete CRM users (main role only).</p>

      {error ? <div className="banner">{error}</div> : null}

      <form onSubmit={onSubmit} className="card" style={{ marginTop: 12 }}>
        <h3>{form.id ? "Edit User" : "Create User"}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="main">main</option>
            <option value="doctor">doctor</option>
            <option value="general">general</option>
          </select>

          <input
            placeholder={form.id ? "New password (leave empty to keep)" : "Password"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Active account
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button type="submit">{form.id ? "Update User" : "Create User"}</button>
          {form.id ? (
            <button type="button" onClick={() => setForm(emptyForm)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <table className="table" style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const role = (u.roles && u.roles[0]) || "general";
            const isSelf = String(u.email || "").toLowerCase() === String(me?.email || "").toLowerCase();
            return (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{role}</td>
                <td>{u.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <button onClick={() => editUser(u)}>Edit</button>{" "}
                  {!isSelf ? <button onClick={() => removeUser(u.id)}>Delete</button> : null}
                </td>
              </tr>
            );
          })}
          {!loading && users.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">No users found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
