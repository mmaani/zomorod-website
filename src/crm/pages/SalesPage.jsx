import React, { useState, useEffect } from "react";
import { apiFetch } from "../api.js";
import { hasRole } from "../auth";

/*
 * Sales management page.  Lists sales and allows recording and voiding
 * of sales for users with the 'main' role.  This version fixes
 * loading of clients, products and sales by awaiting `.json()` on
 * responses returned by `apiFetch`.  It also serializes the POST
 * payload automatically via `apiFetch`.
 */

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    clientId: "",
    productId: "",
    qty: "",
    unitPriceJod: "",
    saleDate: "",
  });

  async function load() {
    const saleRes = await apiFetch("/api/sales");
    const clientRes = await apiFetch("/api/clients");
    const prodRes = await apiFetch("/api/products?includeArchived=1");
    if (saleRes) {
      const saleData = await saleRes.json().catch(() => ({}));
      if (saleRes.ok && saleData.ok) setSales(saleData.sales || []);
    }
    if (clientRes) {
      const clientData = await clientRes.json().catch(() => ({}));
      if (clientRes.ok && clientData.ok) setClients(clientData.clients || []);
    }
    if (prodRes) {
      const prodData = await prodRes.json().catch(() => ({}));
      if (prodRes.ok && prodData.ok) setProducts(prodData.products || []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { clientId, productId, qty, unitPriceJod, saleDate } = form;
    if (!clientId || !productId || !qty || !unitPriceJod || !saleDate) {
      alert("Please fill all fields");
      return;
    }
    await apiFetch("/api/sales", {
      method: "POST",
      body: {
        clientId: Number(clientId),
        productId: Number(productId),
        qty: Number(qty),
        unitPriceJod: Number(unitPriceJod),
        saleDate,
      },
    });
    setForm({ clientId: "", productId: "", qty: "", unitPriceJod: "", saleDate: "" });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await apiFetch(`/api/sales?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="container">
      <h2>Sales</h2>
      {hasRole("main") && (
        <form onSubmit={handleSubmit} className="card">
          <h3>Record Sale</h3>
          <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.officialName}
              </option>
            ))}
          </select>
          <input type="number" placeholder="Quantity" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input type="number" placeholder="Unit Price (JOD)" value={form.unitPriceJod} onChange={(e) => setForm({ ...form, unitPriceJod: e.target.value })} />
          <input type="date" placeholder="Sale Date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
          <button type="submit">Add Sale</button>
        </form>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Client</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total (JOD)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>{s.sale_date}</td>
              <td>{s.client_name}</td>
              <td>{s.official_name}</td>
              <td>{s.qty}</td>
              <td>{s.unit_price_jod}</td>
              <td>{(s.qty * s.unit_price_jod).toFixed(2)}</td>
              <td>
                {hasRole("main") && <button onClick={() => handleDelete(s.id)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}