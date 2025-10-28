
let __allOrders = [];

async function fetchOrders() {
  const status = document.getElementById('status');
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Failed to fetch orders');
    const orders = await res.json();
    status.textContent = `${orders.length} orders`;
    __allOrders = orders;
    window.__orders = orders.reduce((m,o)=>{m[o.orderId]=o;return m},{});
    renderTabs();
  } catch (err) {
    status.textContent = 'Unable to load orders.';
    document.querySelectorAll('.admin-tab').forEach(tab=>tab.innerHTML = `<pre>${escapeHtml(err.message)}</pre>`);
    console.error(err);
  }
}

function renderTabs() {
  // Filter orders by status
  const orders = __allOrders || [];
  // Pending: not accepted yet
  const pending = orders.filter(o => (o.status === 'pending' || !o.status));
  // Accepted: accepted but not delivered
  const accepted = orders.filter(o => o.status === 'accepted');
  // Billing: accepted but not delivered (same as accepted, but with print)
  const billing = accepted;
  // Delivered
  const delivered = orders.filter(o => o.status === 'delivered');

  // Render each tab
  document.getElementById('tab-pending').innerHTML = renderOrderTable(pending, 'pending');
  document.getElementById('tab-accepted').innerHTML = renderOrderTable(accepted, 'accepted');
  document.getElementById('tab-billing').innerHTML = renderOrderTable(billing, 'billing');
  document.getElementById('tab-delivered').innerHTML = renderOrderTable(delivered, 'delivered');
}

function renderOrderTable(orders, tab) {
  if (!orders.length) return '<p>No orders found.</p>';
  const rows = orders.map(o => {
    const statusLabel = escapeHtml(o.status || 'pending');
    let actions = `<button class="detail-btn" onclick="showDetails('${o.orderId}')"><i class="fa-solid fa-file"></i> Details</button>`;
    if (tab === 'pending') {
      actions += ` <button class="accept-btn" onclick="updateOrderStatus('${o.orderId}','accepted')">Accept</button>`;
    }
    if (tab === 'accepted') {
      actions += ` <button class="pending-btn" onclick="updateOrderStatus('${o.orderId}','pending')"><i class="fa-solid fa-clock-rotate-left"></i> Mark Pending</button> <button class="delivered-btn" onclick="updateOrderStatus('${o.orderId}','delivered')"><i class="fa-solid fa-truck-fast"></i> Deliver</button>`;
    }
    if (tab === 'billing') {
      actions += ` <button class="print-btn" onclick="printBill('${o.orderId}')"><i class="fa-solid fa-print"></i>Print Bill</button>`;
    }
    if (tab === 'delivered') {
      actions += ` <button class="print-btn" onclick="printBill('${o.orderId}')"><i class="fa-solid fa-print"></i>Print Bill</button>`;
    }
    return `
      <tr>
        <td>${o.orderId}</td>
        <td>${escapeHtml(o.name)}<div class="muted">${escapeHtml(o.email)}</div></td>
        <td>रु ${o.total}</td>
        <td>${new Date(o.createdAt).toLocaleString()}</td>
        <td>${(o.items || []).length}</td>
        <td><span class="status ${escapeHtml(o.status || 'pending')}">${statusLabel}</span></td>
        <td><div class="actions">${actions}</div></td>
      </tr>
    `;
  }).join('');
  return `
    <table>
      <thead>
        <tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Placed</th><th>Items</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// fetch sales (delivered records) and compute aggregates for today/week/month/year
async function fetchSales() {
  const details = document.getElementById('sales-details');
  try {
    const res = await fetch('/api/sales');
    if (!res.ok) throw new Error('Failed to fetch sales');
    const sales = await res.json();
    // store for detail view
    window.__sales = sales || [];

    const now = new Date();
    const start7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let totals = { day: 0, week: 0, month: 0, year: 0 };
    let counts = { day: 0, week: 0, month: 0, year: 0 };

    (sales || []).forEach(s => {
      const d = new Date(s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt || s.deliveredAt);
      const amt = Number(s.total) || 0;
      if (d.toDateString() === now.toDateString()) { totals.day += amt; counts.day += 1; }
      if (d >= start7days) { totals.week += amt; counts.week += 1; }
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) { totals.month += amt; counts.month += 1; }
      if (d.getFullYear() === now.getFullYear()) { totals.year += amt; counts.year += 1; }
    });

    document.getElementById('sales-today').textContent = `रु ${Number(totals.day).toLocaleString()}`;
    document.getElementById('sales-today-count').textContent = `${counts.day} sales`;

    document.getElementById('sales-week').textContent = `रु ${Number(totals.week).toLocaleString()}`;
    document.getElementById('sales-week-count').textContent = `${counts.week} sales`;

    document.getElementById('sales-month').textContent = `रु ${Number(totals.month).toLocaleString()}`;
    document.getElementById('sales-month-count').textContent = `${counts.month} sales`;

    document.getElementById('sales-year').textContent = `रु ${Number(totals.year).toLocaleString()}`;
    document.getElementById('sales-year-count').textContent = `${counts.year} sales`;

    // clear details area
    if (details) details.innerHTML = '';
    // render charts (if Chart.js is loaded)
    try{ renderSalesCharts(sales || []); }catch(e){ console.warn('Chart render failed', e); }
  } catch (err) {
    console.error('Sales fetch failed', err);
    if (details) details.innerHTML = `<pre>${escapeHtml(err.message)}</pre>`;
  }
}

function showSalesDetails(){
  const details = document.getElementById('sales-details');
  const sales = window.__sales || [];
  if (!details) return;
  if (!sales.length) {
    details.innerHTML = '<p class="muted">No sales recorded yet.</p>';
    return;
  }
  const rows = sales.map(s=>{
    const items = (s.items||[]).map(i=>`${escapeHtml(i.name)} (x${i.quantity||1})`).join(', ');
    return `
      <tr>
        <td>${escapeHtml(s.orderId || '')}</td>
        <td>रु ${Number(s.total).toLocaleString()}</td>
        <td>${escapeHtml(items)}</td>
        <td>${new Date(s.deliveredAt).toLocaleString()}</td>
        <td><button class="detail-btn" onclick="showDetails('${escapeHtml(s.orderId || '')}')">Details</button></td>
      </tr>
    `;
  }).join('');
  details.innerHTML = `
    <table>
      <thead><tr><th>Order</th><th>Total</th><th>Items</th><th>Delivered</th><th>Actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSalesCharts(sales){
  if (!window.Chart) return; // Chart.js not loaded

  // Helper to format date key YYYY-MM-DD
  const fmt = d=>{ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` };

  // Last 30 days totals
  const now = new Date();
  const last30 = [];
  for(let i=29;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth(), now.getDate()-i); last30.push(d); }
  const labels30 = last30.map(d=>`${d.getMonth()+1}/${d.getDate()}`);
  const totals30 = last30.map(d=>{
    const key = fmt(d);
    return (sales || []).filter(s=>{ try { return fmt(new Date(s.deliveredAt)) === key } catch(e){ return false } }).reduce((s2,x)=>s2 + (Number(x.total)||0), 0);
  });

  // Last 7 days counts
  const last7 = [];
  for(let i=6;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth(), now.getDate()-i); last7.push(d); }
  const labels7 = last7.map(d=>`${d.getMonth()+1}/${d.getDate()}`);
  const counts7 = last7.map(d=>{
    const key = fmt(d);
    return (sales || []).filter(s=>{ try { return fmt(new Date(s.deliveredAt)) === key } catch(e){ return false } }).length;
  });

  // Destroy previous charts if present
  try{ if (window.__salesChart) window.__salesChart.destroy(); }catch(e){}
  try{ if (window.__salesWeekChart) window.__salesWeekChart.destroy(); }catch(e){}

  const ctx30 = document.getElementById('sales-chart');
  if (ctx30){
    window.__salesChart = new Chart(ctx30.getContext('2d'),{
      type: 'line',
      data: { labels: labels30, datasets: [{ label: 'Sales (रु)', data: totals30, borderColor: 'rgba(37,99,235,0.9)', backgroundColor: 'rgba(37,99,235,0.12)', fill: true, tension: 0.2 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  const ctx7 = document.getElementById('sales-week-chart');
  if (ctx7){
    window.__salesWeekChart = new Chart(ctx7.getContext('2d'),{
      type: 'bar',
      data: { labels: labels7, datasets: [{ label: 'Orders', data: counts7, backgroundColor: 'rgba(249,115,115,0.9)' }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, precision:0 } } }
    });
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      let errMsg = 'Failed to update status';
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    await fetchOrders();
    await fetchSales();
  } catch (err) {
    alert('Error: ' + (err.message || err));
    console.error(err);
  }
}

function printBill(orderId) {
  const order = window.__orders && window.__orders[orderId];
  if (!order) return alert('Order not found');
  const win = window.open('', '_blank');
  const itemsHtml = (order.items || []).map(i=>`
    <tr>
      <td>${escapeHtml(i.name)}</td>
      <td>${i.quantity}</td>
      <td>रु ${i.price}</td>
      <td>रु ${Number(String(i.price).replace(/[^0-9.-]+/g, '')) * (i.quantity || 1)}</td>
    </tr>
  `).join('');

  const html = `
    <html>
    <head>
      <title>Bill - ${escapeHtml(order.orderId)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=Dancing+Script:wght@400;600&display=swap" rel="stylesheet">
      <style>
        body{
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family:Arial;
            margin:1rem
        }

        .bill{
            display: flex;
            flex-direction: column;
            width: 90%;
            border:1px solid #ccc;
            padding:1rem;
            border-radius:8px;
            box-shadow:0 2px 6px rgba(0,0,0,.1)
        }

        .bill h1{
            font-family: 'Playfair Display', serif;
            font-size: 2.5rem;
            text-align:center;
            margin-bottom:0;
        }

        .bill h2{
            text-align:center;
            margin-bottom:1rem
        }

        .bill .address{
            text-align:center;
            font-size: 0.9rem;
            margin-top: 0;
            margin-bottom: 1.5rem;
        }

        .bill h4{
            text-align:right;
            margin-top:1rem
        }


        .detail{
            display: flex;
            flex-direction: column;
            text-align:left;
        }

        table{
            width:100%;
            border-collapse:collapse
        }

        th,td{
            border:1px solid #ccc;
            padding:.5rem;
            text-align:left
        }
      </style>
    </head>
    <body>
    <div class="bill">
        <h1>Mithila ChitraKala Store</h1>
        <p class="address">Janakpur-13, Nepal</p>
        <div class="detail">
      <h2>Bill — ${escapeHtml(order.orderId)}</h2>
      <p><strong>Name:</strong> ${escapeHtml(order.name)}<br>
      <strong>Email:</strong> ${escapeHtml(order.email)}<br>
      <strong>Phone:</strong> ${escapeHtml(order.phone)}<br>
      <strong>Address:</strong> ${escapeHtml(order.address)}</p>
      </div>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Sub-Total</th></tr></thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="detail">
      <h4>Total: रु ${order.total}</h4>
      <p>Placed: ${new Date(order.createdAt).toLocaleString()}</p>
      </div>
</div>
    </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
  // give the new window a moment to render before printing
  setTimeout(()=>{ win.print(); }, 500);
}

function escapeHtml(s){
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]);
}

function showDetails(orderId) {
    const details = document.getElementById('details');
    const order = window.__orders && window.__orders[orderId];
    
    // If no order or empty orderId, reset the details section
    if (!orderId || !order) {
        details.innerHTML = ''; // Clear the details
        return;
    }

    const itemsHtml = order.items.map(i => `
        <li>
            ${i.image ? `<img src="${escapeHtml(i.image)}" alt="${escapeHtml(i.name)}" style="width:50px;height:50px;object-fit:cover;">` : ''}
            ${i.image ? `<a href="${escapeHtml(i.image)}" target="_blank">${escapeHtml(i.name)}</a>` : escapeHtml(i.name)}
            — qty: ${i.quantity} — रु ${i.price}
        </li>
    `).join('');
    
    details.innerHTML = `
        <h3>Order ${order.orderId}</h3>
        <p><strong>Name:</strong> ${escapeHtml(order.name)}</p>
        <p><strong>Email</strong>: ${escapeHtml(order.email)}</p>
        <p><strong>Contact:</strong> ${escapeHtml(order.phone)}</p>
        <p><strong>Address: </strong>${escapeHtml(order.address)}</p>
        <p><strong>Total:</strong> रु ${order.total}</p>
        <ul style="list-style:none;padding:0;">${itemsHtml}</ul>
    `;
}

// Add event listener to tab buttons
const tabBtns = document.querySelectorAll('#nav-btn'); // Assuming each tab button has the class `tab-btn`

tabBtns.forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
        // When any tab is clicked, reset the details section
        showDetails('');
    });
});


function showTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(el=>el.style.display='none');
  const el = document.getElementById('tab-' + tab);
  if (el) el.style.display = '';
}

let __currentActiveBtn = null;
document.querySelectorAll('#nav-btn').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    if (__currentActiveBtn) __currentActiveBtn.classList.remove('active');
    btn.classList.add('active');
    __currentActiveBtn = btn;
  });
});



// init
document.addEventListener('DOMContentLoaded', ()=>{
  fetchOrders();
  fetchSales();
  showTab('sales');
});
