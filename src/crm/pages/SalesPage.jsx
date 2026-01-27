import React, { useState, useEffect } from "react";
import apiFetch from "../api";
import { hasRole } from "../auth";

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
    const saleData = await apiFetch("/api/sales");
    const clientData = await apiFetch("/api/clients");
    const prodData = await apiFetch("/api/products?includeArchived=1");
    if (saleData.ok) setSales(saleData.sales);
    if (clientData.ok) setClients(clientData.clients);
    if (prodData.ok) setProducts(prodData.products);
  }

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { clientId, productId, qty, unitPriceJod, saleDate } = form;
    if (!clientId || !productId || !qty || !unitPriceJod || !saleDate) {
      alert("Please fill all fields");
      return;
    }
    await apiFetch("/api/sales", { method: "POST", body: {
      clientId: Number(clientId),
      productId: Number(productId),
      qty: Number(qty),
      unitPriceJod: Number(unitPriceJod),
      saleDate,
    }});
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
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">Select product...</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.officialName}</option>)}
          </select>
          <input type="number" placeholder="Quantity" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input type="number" placeholder="Unit Price (JOD)" value={form.unitPriceJod} onChange={(e) => setForm({ ...form, unitPriceJod: e.target.value })} />
          <input type="date" placeholder="Sale Date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
          <button type="submit">Add Sale</button>
        </form>
      )}
      <table className="table">
        <thead>
          <tr><th>Date</th><th>Client</th><th>Product</th><th>Qty</th><th>Price</th><th>Total (JOD)</th><th>Actions</th></tr>
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
