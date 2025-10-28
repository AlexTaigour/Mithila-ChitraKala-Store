const path = require('path');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// Serve static files from the `pages` folder so the existing frontend works
const staticRoot = path.resolve(__dirname, 'pages');
app.use(express.static(staticRoot));

// Data files (current project layout keeps data under server/)
const productsFile = path.join(__dirname, 'server/products.json');
const partnersFile = path.join(__dirname, 'server/partner-store.json');
const ordersFile = path.join(__dirname, 'server/orders.json');
const salesFile = path.join(__dirname, 'server/sales.json');

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading', filePath, err.message);
    return [];
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing', filePath, err.message);
    return false;
  }
}

// API: GET /api/products
app.get('/api/products', (req, res) => {
  const products = readJson(productsFile);
  res.json(products);
});

// API: GET /api/products/:slug
app.get('/api/products/:slug', (req, res) => {
  const slug = req.params.slug;
  const products = readJson(productsFile);
  const product = products.find(p => p.slug === slug || p.id === slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// API: GET /api/partners
app.get('/api/partners', (req, res) => {
  const partners = readJson(partnersFile);
  res.json(partners);
});

// API: GET /api/orders (admin)
app.get('/api/orders', (req, res) => {
  const orders = readJson(ordersFile);
  res.json(orders);
});

// API: POST /api/orders  (store in server/orders.json)
app.post('/api/orders', (req, res) => {
  const orders = readJson(ordersFile);
  const order = req.body;
  if (!order || !order.items || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  const orderId = 'ORD-' + Date.now();
  // default status for new orders
  const record = Object.assign({}, order, { orderId, createdAt: new Date().toISOString(), status: order.status || 'pending' });
  orders.push(record);

  if (!writeJson(ordersFile, orders)) {
    return res.status(500).json({ error: 'Failed to persist order' });
  }

  res.json({ orderId });
});

// API: PATCH /api/orders/:orderId  -- update order status
app.patch('/api/orders/:orderId', (req, res) => {
  const id = req.params.orderId;
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Missing status' });

  const orders = readJson(ordersFile);
  const idx = orders.findIndex(o => o.orderId === id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  orders[idx].status = status;
  // persist updated orders
  if (!writeJson(ordersFile, orders)) return res.status(500).json({ error: 'Failed to persist order status' });

  // If order was marked delivered, record a sale entry
  if (status === 'delivered') {
    const sales = readJson(salesFile);
    const order = orders[idx];
    const saleRecord = {
      orderId: order.orderId,
      total: order.total,
      items: order.items || [],
      deliveredAt: new Date().toISOString()
    };
    sales.push(saleRecord);
    writeJson(salesFile, sales);
  }

  res.json({ ok: true });
});

// API: GET /api/sales  -- returns recorded delivered sales
app.get('/api/sales', (req, res) => {
  const sales = readJson(salesFile);
  res.json(sales);
});

// Fallback: serve index.html for unknown routes (so client-side routes work)
app.get('*', (req, res, next) => {
  const url = req.url || '';
  // If request looks like an API route, return 404
  if (url.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
