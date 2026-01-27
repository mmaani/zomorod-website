import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../api.js";
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

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(form.productId)),
    [products, form.productId]
  );

  const onHand = Number(selectedProduct?.onHandQty || 0);
  const qtyNum = Number(form.qty || 0);
  const stockOk = !form.productId || !qtyNum || qtyNum <= onHand;

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

    const qtyN = Number(qty);
    if (!Number.isFinite(qtyN) || qtyN <= 0) {
      alert("Quantity must be a positive number");
      return;
    }

    if (selectedProduct && qtyN > onHand) {
      alert(`Not enough stock. Available = ${onHand}`);
      return;
    }

    const res = await apiFetch("/api/sales", {
      method: "POST",
      body: {
        clientId: Number(clientId),
        productId: Number(productId),
        qty: qtyN,
        unitPriceJod: Number(unitPriceJod),
        saleDate,
      },
    });

    const data = await res?.json().catch(() => ({}));
    if (!res?.ok || !data?.ok) {
      alert(data?.error || "Failed to record sale");
      return;
    }

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

          <select
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
          >
            <option value="">Select client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.officialName}
              </option>
            ))}
          </select>

          {form.productId ? (
            <div className="muted" style={{ marginTop: 6 }}>
              Available: <b>{onHand}</b>
              {!stockOk ? (
                <span style={{ marginLeft: 10, color: "#b91c1c", fontWeight: 700 }}>
                  Not enough stock
                </span>
              ) : null}
            </div>
          ) : null}

          <input
            type="number"
            placeholder="Quantity"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
            min="1"
          />

          <input
            type="number"
            placeholder="Unit Price (JOD)"
            value={form.unitPriceJod}
            onChange={(e) => setForm({ ...form, unitPriceJod: e.target.value })}
            min="0"
            step="0.001"
          />

          <input
            type="date"
            value={form.saleDate}
            onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
          />

          <button type="submit" disabled={!stockOk}>
            Add Sale
          </button>
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
              <td>{hasRole("main") && <button onClick={() => handleDelete(s.id)}>Delete</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
