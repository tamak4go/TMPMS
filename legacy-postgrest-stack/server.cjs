const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const http = require('http');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://tmpms.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Origin is not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Connect to PostgreSQL via DATABASE_URL (Neon/Render) or local config
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: '127.0.0.1',
      port: 5432,
      database: 'tmpms',
      user: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });

const authSecret = process.env.AUTH_SECRET || (process.env.NODE_ENV !== 'production'
  ? crypto.randomBytes(32).toString('hex')
  : null);

if (!authSecret) throw new Error('AUTH_SECRET must be configured in production');

const sign = (value) => crypto.createHmac('sha256', authSecret).update(value).digest('base64url');

function createAccessToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    role: user.role_name || 'User',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readAccessToken(token) {
  const [payload, signature] = (token || '').split('.');
  if (!payload || !signature || signature.length !== sign(payload).length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(payload)))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claims.exp > Math.floor(Date.now() / 1000) ? claims : null;
  } catch { return null; }
}

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const claims = readAccessToken(token);
  if (!claims) return res.status(401).json({ error: 'Authentication is required' });
  req.user = { id: Number(claims.sub), role: claims.role };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ error: 'You do not have permission for this action' });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash?.startsWith('scrypt$')) return storedHash === password;
  const [, salt, hash] = storedHash.split('$');
  return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}

async function authResponse(user) {
  const cart = await pool.query('SELECT id FROM carts WHERE user_id = $1', [user.id]);
  const role = user.role_name === 'Admin' ? 'Admin'
    : ['Pharmacy', 'Doctor', 'Pharmacist'].includes(user.role_name) ? 'Pharmacy' : 'User';
  return { userId: user.id, userName: user.username, email: user.email, phone: user.phone,
    cartId: cart.rows[0]?.id || null, roles: [role], accessToken: createAccessToken(user), refreshToken: null };
}

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Helper to parse PostgREST query parameters (like eq.X or ilike.*X*)
function parseFilter(val) {
  if (!val) return null;
  if (val.startsWith('eq.')) {
    return { op: '=', val: val.substring(3) };
  }
  if (val.startsWith('ilike.')) {
    // Convert *search* to %search%
    let search = val.substring(6);
    if (search.startsWith('*')) search = '%' + search.substring(1);
    if (search.endsWith('*')) search = search.substring(0, search.length - 1) + '%';
    return { op: 'ILIKE', val: search };
  }
  return null;
}

// 1. GET /categories
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /medicines
app.get('/medicines', async (req, res) => {
  try {
    let query = 'SELECT * FROM medicines';
    const params = [];
    const conditions = [];

    // Parse filters
    if (req.query.category_id) {
      const filter = parseFilter(req.query.category_id);
      if (filter) {
        params.push(filter.val);
        conditions.push(`category_id ${filter.op} $${params.length}`);
      }
    }

    if (req.query.name) {
      const filter = parseFilter(req.query.name);
      if (filter) {
        params.push(filter.val);
        conditions.push(`name ${filter.op} $${params.length}`);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id ASC';

    // Pagination parameters
    const limit = parseInt(req.query.limit);
    const offset = parseInt(req.query.offset);
    if (!isNaN(limit)) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }
    if (!isNaN(offset)) {
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /carts
app.get('/carts', async (req, res) => {
  try {
    let query = 'SELECT * FROM carts';
    const params = [];
    if (req.query.user_id) {
      const filter = parseFilter(req.query.user_id);
      if (filter) {
        params.push(filter.val);
        query += ` WHERE user_id ${filter.op} $1`;
      }
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /cart_items
app.get('/cart_items', async (req, res) => {
  try {
    let query = `
      SELECT ci.*, row_to_json(m.*) as medicine 
      FROM cart_items ci
      JOIN medicines m ON ci.medicine_id = m.id
    `;
    const params = [];
    
    if (req.query.cart_id) {
      const filter = parseFilter(req.query.cart_id);
      if (filter) {
        params.push(filter.val);
        query += ` WHERE ci.cart_id ${filter.op} $1`;
      }
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 5. POST /cart_items
app.post('/cart_items', async (req, res) => {
  try {
    const { cart_id, medicine_id, quantity } = req.body;
    
    const result = await pool.query(
      `INSERT INTO cart_items (cart_id, medicine_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, medicine_id)
       DO UPDATE SET quantity = EXCLUDED.quantity
       RETURNING *`,
      [cart_id, medicine_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 6. PATCH /cart_items
app.patch('/cart_items', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing cart item ID filter' });
    }

    const { quantity } = req.body;
    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
      [quantity, idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 7. DELETE /cart_items
app.delete('/cart_items', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing cart item ID filter' });
    }

    const result = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 RETURNING *',
      [idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RPC: register_user
app.post('/rpc/register_user', async (req, res) => {
  try {
    const { p_username, p_email, p_password, p_phone, p_role_id } = req.body;
    const result = await pool.query(
      'SELECT * FROM register_user($1, $2, $3, $4, $5)',
      [p_username, p_email, p_password, p_phone, p_role_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

// RPC: login_user
app.post('/rpc/login_user', async (req, res) => {
  try {
    const { p_username, p_password } = req.body;
    const result = await pool.query(
      'SELECT * FROM login_user($1, $2)',
      [p_username, p_password]
    );
    
    if (result.rows.length === 0 || !result.rows[0].id) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

// RPC: sync_cart_items
app.post('/rpc/sync_cart_items', async (req, res) => {
  try {
    const { p_user_id, p_items } = req.body;
    await pool.query(
      'SELECT sync_cart_items($1, $2::jsonb)',
      [p_user_id, JSON.stringify(p_items)]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /orders (Checkout transaction)
app.post('/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { user_id, total_amount, shipping_address, payment_method, items } = req.body;
    
    // 1. Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_status)
       VALUES ($1, $2, 'Pending', $3, 'Unpaid')
       RETURNING *`,
      [user_id, total_amount, shipping_address]
    );
    const order = orderRes.rows[0];
    
    // 2. Insert order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, medicine_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.id, item.quantity, item.price]
      );
    }
    
    // 3. Insert payment
    await client.query(
      `INSERT INTO payments (order_id, method, transaction_code, amount, status)
       VALUES ($1, $2, $3, $4, 'Pending')`,
      [order.id, payment_method, 'TXN-' + Date.now(), total_amount]
    );
    
    // 4. Clear cart_items for this user
    const cartRes = await client.query('SELECT id FROM carts WHERE user_id = $1', [user_id]);
    if (cartRes.rows.length > 0) {
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartRes.rows[0].id]);
    }
    
    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET /user-orders/:userId (Purchase history)
app.get('/user-orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const ordersRes = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const orders = ordersRes.rows;
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT oi.*, m.name as medicine_name, m.image_url 
         FROM order_items oi
         JOIN medicines m ON oi.medicine_id = m.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/orders (Admin View - all orders)
app.get('/admin/orders', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.username, u.email 
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    const orders = result.rows;
    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT oi.*, m.name as medicine_name, m.image_url 
         FROM order_items oi
         JOIN medicines m ON oi.medicine_id = m.id
         WHERE oi.order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/orders/:id (Admin View - update order status)
app.patch('/admin/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    const result = await pool.query(
      `UPDATE orders SET status = COALESCE($1, status), payment_status = COALESCE($2, payment_status)
       WHERE id = $3 RETURNING *`,
      [status, payment_status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /medicines (Admin View - add medicine)
app.post('/medicines', async (req, res) => {
  try {
    const { category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging } = req.body;
    const result = await pool.query(
      `INSERT INTO medicines (category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /suppliers (Suppliers directory)
app.get('/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /warehouses-info (Warehouses directory with total stock quantity)
app.get('/warehouses-info', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, COALESCE(SUM(s.quantity), 0) as total_quantity
       FROM warehouses w
       LEFT JOIN inventory_stocks s ON w.id = s.warehouse_id
       GROUP BY w.id
       ORDER BY w.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== AUTHENTICATION & PROFILE APIS ====================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email: usernameOrEmail, password } = req.body;
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE (u.username = $1 OR u.email = $1) AND u.is_active = TRUE`,
      [usernameOrEmail]
    );

    if (result.rows.length === 0 || !verifyPassword(password, result.rows[0].password_hash)) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    const user = result.rows[0];
    if (!user.password_hash.startsWith('scrypt$')) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(password), user.id]);
    }
    res.json(await authResponse(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/otp-login
app.post('/api/auth/otp-login', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_OTP !== 'true') {
      return res.status(501).json({ error: 'Server-side OTP verification has not been configured' });
    }
    const { phone, code } = req.body;
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.phone = $1 AND u.is_active = TRUE`,
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Số điện thoại chưa được đăng ký hoặc tài khoản bị khóa' });
    }

    const user = result.rows[0];
    res.json(await authResponse(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/send-otp
app.post('/api/auth/send-otp', (req, res) => {
  res.status(200).json({ message: 'OTP sent successfully (Mock: 123456)' });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { userName, email, password, phone } = req.body;
    if (!userName || !email || typeof password !== 'string' || password.length < 8) {
      return res.status(400).send('Username, email, and a password of at least 8 characters are required');
    }
    
    // Check if user exists
    const checkRes = await pool.query(
      'SELECT 1 FROM users WHERE username = $1 OR email = $2',
      [userName, email]
    );
    if (checkRes.rows.length > 0) {
      return res.status(400).send('Tên tài khoản hoặc email đã tồn tại');
    }

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, phone, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING *`,
      [userName, email, hashPassword(password), phone, 2]
    );
    const newUser = result.rows[0];

    // Automatically create a cart for the user
    await pool.query('INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [newUser.id]);

    newUser.role_name = 'User';
    res.status(201).json(await authResponse(newUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/assign-role
app.post('/api/auth/assign-role', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const { userId, roleName } = req.body;
    let role_id = 2;
    if (roleName === 'Admin') role_id = 1;
    else if (roleName === 'Pharmacy' || roleName === 'Doctor' || roleName === 'Pharmacist') role_id = 3;

    await pool.query(
      'UPDATE users SET role_id = $1 WHERE id = $2',
      [role_id, userId]
    );
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/users
app.get('/api/profile/users', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       ORDER BY u.id ASC`
    );

    res.json(result.rows.map(row => {
      let role = row.role_name;
      if (role === 'Customer') role = 'User';
      if (role === 'Doctor' || role === 'Pharmacist') role = 'Pharmacy';
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        role: role || 'User',
        isActive: row.is_active,
        createdAt: row.created_at
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/profile/users/:userId/status
app.put('/api/profile/users/:userId/status', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PATIENT CRUD APIS ====================

// GET /patients
app.get('/patients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients ORDER BY id DESC');
    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      phone: r.phone,
      address: r.address,
      medicalHistory: r.medical_history,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /patients
app.post('/patients', async (req, res) => {
  try {
    const { name, gender, dateOfBirth, phone, address, medicalHistory } = req.body;
    const result = await pool.query(
      `INSERT INTO patients (name, gender, date_of_birth, phone, address, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, gender, dateOfBirth, phone, address, medicalHistory]
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      phone: r.phone,
      address: r.address,
      medicalHistory: r.medical_history,
      createdAt: r.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /patients/:id
app.put('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, dateOfBirth, phone, address, medicalHistory } = req.body;
    const result = await pool.query(
      `UPDATE patients 
       SET name = $1, gender = $2, date_of_birth = $3, phone = $4, address = $5, medical_history = $6
       WHERE id = $7
       RETURNING *`,
      [name, gender, dateOfBirth, phone, address, medicalHistory, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      name: r.name,
      gender: r.gender,
      dateOfBirth: r.date_of_birth,
      phone: r.phone,
      address: r.address,
      medicalHistory: r.medical_history,
      createdAt: r.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /patients/:id
app.delete('/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== APPOINTMENT CRUD APIS ====================

// GET /appointments
app.get('/appointments', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.patient_id AS "patientId",
        a.doctor_id AS "doctorId",
        a.appointment_date AS "appointmentDate",
        a.reason,
        a.status,
        a.notes,
        p.name AS "patientName",
        p.phone AS "patientPhone",
        u.username AS "doctorName"
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      ORDER BY a.appointment_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /appointments
app.post('/appointments', async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason, status, notes } = req.body;
    const insertRes = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [patientId, doctorId, appointmentDate, reason, status, notes]
    );
    
    const newId = insertRes.rows[0].id;
    const result = await pool.query(
      `SELECT 
        a.id,
        a.patient_id AS "patientId",
        a.doctor_id AS "doctorId",
        a.appointment_date AS "appointmentDate",
        a.reason,
        a.status,
        a.notes,
        p.name AS "patientName",
        p.phone AS "patientPhone",
        u.username AS "doctorName"
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE a.id = $1`,
      [newId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /appointments/:id
app.put('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { patientId, doctorId, appointmentDate, reason, status, notes } = req.body;
    const updateRes = await pool.query(
      `UPDATE appointments
       SET patient_id = $1, doctor_id = $2, appointment_date = $3, reason = $4, status = $5, notes = $6
       WHERE id = $7
       RETURNING id`,
      [patientId, doctorId, appointmentDate, reason, status, notes, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const result = await pool.query(
      `SELECT 
        a.id,
        a.patient_id AS "patientId",
        a.doctor_id AS "doctorId",
        a.appointment_date AS "appointmentDate",
        a.reason,
        a.status,
        a.notes,
        p.name AS "patientName",
        p.phone AS "patientPhone",
        u.username AS "doctorName"
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE a.id = $1`,
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /appointments/:id
app.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PRESCRIPTION APIS ====================

// GET /api/prescription
app.get('/api/prescription', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        p.patient_id AS "patientId",
        p.user_id AS "userId",
        p.doctor_name AS "doctorName",
        p.hospital,
        p.prescription_date AS "prescriptionDate",
        p.image_url AS "imageUrl",
        p.status,
        pat.name AS "patientName"
      FROM prescriptions p
      LEFT JOIN patients pat ON p.patient_id = pat.id
      ORDER BY p.id DESC`
    );

    const prescriptions = result.rows;
    for (const p of prescriptions) {
      const itemsRes = await pool.query(
        `SELECT 
          pi.id,
          pi.prescription_id AS "prescriptionId",
          pi.medicine_id AS "medicineId",
          pi.quantity,
          m.name AS "medicineName"
        FROM prescription_items pi
        JOIN medicines m ON pi.medicine_id = m.id
        WHERE pi.prescription_id = $1`,
        [p.id]
      );
      p.items = itemsRes.rows;
    }
    res.json(prescriptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prescription
app.post('/api/prescription', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { patientId, doctorName, hospital, items } = req.body;

    const presRes = await client.query(
      `INSERT INTO prescriptions (patient_id, doctor_name, hospital, prescription_date, status)
       VALUES ($1, $2, $3, NOW(), 'Active')
       RETURNING *`,
      [patientId, doctorName, hospital]
    );
    const newPres = presRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO prescription_items (prescription_id, medicine_id, quantity)
         VALUES ($1, $2, $3)`,
        [newPres.id, item.medicineId, item.quantity]
      );
    }

    await client.query('COMMIT');

    // Retrieve full data for response
    const fullRes = await pool.query(
      `SELECT 
        p.id,
        p.patient_id AS "patientId",
        p.user_id AS "userId",
        p.doctor_name AS "doctorName",
        p.hospital,
        p.prescription_date AS "prescriptionDate",
        p.image_url AS "imageUrl",
        p.status,
        pat.name AS "patientName"
      FROM prescriptions p
      LEFT JOIN patients pat ON p.patient_id = pat.id
      WHERE p.id = $1`,
      [newPres.id]
    );

    const prescription = fullRes.rows[0];
    const itemsRes = await pool.query(
      `SELECT 
        pi.id,
        pi.prescription_id AS "prescriptionId",
        pi.medicine_id AS "medicineId",
        pi.quantity,
        m.name AS "medicineName"
      FROM prescription_items pi
      JOIN medicines m ON pi.medicine_id = m.id
      WHERE pi.prescription_id = $1`,
      [prescription.id]
    );
    prescription.items = itemsRes.rows;

    res.status(201).json(prescription);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/prescription/:id/status
app.put('/api/prescription/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE prescriptions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PRODUCT REVIEWS APIS ====================

// GET /api/reviews/medicine/:productId
app.get('/api/reviews/medicine/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(
      `SELECT 
        r.id,
        r.user_id AS "userId",
        r.medicine_id AS "medicineId",
        r.rating,
        r.comment,
        r.created_at AS "createdAt",
        u.username AS "userName"
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.medicine_id = $1
      ORDER BY r.created_at DESC`,
      [productId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/check-eligibility
app.get('/api/reviews/check-eligibility', async (req, res) => {
  try {
    const { medicineId, userId } = req.query;
    if (!medicineId || !userId) {
      return res.status(400).json({ error: 'Missing medicineId or userId' });
    }

    // Check if the user has a completed order with this medicine
    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = $1 AND oi.medicine_id = $2
      ) AS eligible`,
      [userId, medicineId]
    );
    res.json({ eligible: result.rows[0].eligible });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews
app.post('/api/reviews', async (req, res) => {
  try {
    const { userId, medicineId, rating, comment } = req.body;
    const insertRes = await pool.query(
      `INSERT INTO reviews (user_id, medicine_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [userId, medicineId, rating, comment]
    );
    
    const newId = insertRes.rows[0].id;
    const result = await pool.query(
      `SELECT 
        r.id,
        r.user_id AS "userId",
        r.medicine_id AS "medicineId",
        r.rating,
        r.comment,
        r.created_at AS "createdAt",
        u.username AS "userName"
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1`,
      [newId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// PATCH /medicines
app.patch('/medicines', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing medicine ID filter' });
    }

    const { category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging, requires_prescription } = req.body;
    
    const result = await pool.query(
      `UPDATE medicines 
       SET category_id = COALESCE($1, category_id), 
           supplier_id = COALESCE($2, supplier_id), 
           name = COALESCE($3, name), 
           description = COALESCE($4, description), 
           price = COALESCE($5, price), 
           stock_quantity = COALESCE($6, stock_quantity), 
           image_url = COALESCE($7, image_url), 
           unit = COALESCE($8, unit), 
           origin = COALESCE($9, origin), 
           packaging = COALESCE($10, packaging), 
           requires_prescription = COALESCE($11, requires_prescription)
       WHERE id = $12 RETURNING *`,
      [category_id, supplier_id, name, description, price, stock_quantity, image_url, unit, origin, packaging, requires_prescription, idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /medicines
app.delete('/medicines', async (req, res) => {
  try {
    let idVal = null;
    if (req.query.id) {
      const filter = parseFilter(req.query.id);
      if (filter) idVal = filter.val;
    }

    if (!idVal) {
      return res.status(400).json({ error: 'Missing medicine ID filter' });
    }

    const result = await pool.query(
      'DELETE FROM medicines WHERE id = $1 RETURNING *',
      [idVal]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== VOUCHER APIS ====================

// GET /vouchers — Public list of active vouchers
app.get('/vouchers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vouchers WHERE is_active = TRUE AND (end_date IS NULL OR end_date > NOW()) ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/vouchers — All vouchers for admin
app.get('/admin/vouchers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vouchers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/vouchers — Create voucher
app.post('/admin/vouchers', async (req, res) => {
  try {
    const { code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active } = req.body;
    const result = await pool.query(
      `INSERT INTO vouchers (code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [code, name, discount_type || 'percent', discount_value, min_order_value || 0, max_discount, start_date || new Date(), end_date, usage_limit || 100, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/vouchers/:id — Update voucher
app.patch('/admin/vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active } = req.body;
    const result = await pool.query(
      `UPDATE vouchers SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        discount_type = COALESCE($3, discount_type),
        discount_value = COALESCE($4, discount_value),
        min_order_value = COALESCE($5, min_order_value),
        max_discount = COALESCE($6, max_discount),
        start_date = COALESCE($7, start_date),
        end_date = $8,
        usage_limit = COALESCE($9, usage_limit),
        is_active = COALESCE($10, is_active)
       WHERE id = $11 RETURNING *`,
      [code, name, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, usage_limit, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Voucher not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/vouchers/:id
app.delete('/admin/vouchers/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vouchers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Voucher not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /vouchers/validate — Validate a voucher code
app.post('/vouchers/validate', async (req, res) => {
  try {
    const { code, order_total } = req.body;
    const result = await pool.query(
      `SELECT * FROM vouchers WHERE code = $1 AND is_active = TRUE AND (end_date IS NULL OR end_date > NOW()) AND used_count < usage_limit`,
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mã voucher không hợp lệ hoặc đã hết hạn' });
    }
    const v = result.rows[0];
    if (parseFloat(order_total) < parseFloat(v.min_order_value)) {
      return res.status(400).json({ error: `Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(v.min_order_value)}đ để dùng voucher này` });
    }
    let discount = 0;
    if (v.discount_type === 'percent') {
      discount = parseFloat(order_total) * parseFloat(v.discount_value) / 100;
      if (v.max_discount) discount = Math.min(discount, parseFloat(v.max_discount));
    } else {
      discount = parseFloat(v.discount_value);
    }
    res.json({ valid: true, voucher: v, discount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER PROFILE APIS ====================

// GET /api/profile/me — Get current user profile
app.get('/api/profile/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.phone, u.is_active, u.created_at, r.name as role_name,
              u.full_name, u.address, u.avatar_url, u.date_of_birth, u.gender
       FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    // Try without extra columns (graceful fallback)
    try {
      const userId = req.headers['x-user-id'];
      const result = await pool.query(
        `SELECT u.id, u.username, u.email, u.phone, u.is_active, u.created_at, r.name as role_name
         FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
        [userId]
      );
      res.json(result.rows[0] || {});
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

// PATCH /api/profile/me — Update user profile
app.patch('/api/profile/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { full_name, phone, address, avatar_url, date_of_birth, gender } = req.body;

    // Add columns if missing (safe migration)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`).catch(() => {});

    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        avatar_url = COALESCE($4, avatar_url),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender)
       WHERE id = $7 RETURNING id, username, email, phone, full_name, address, avatar_url, date_of_birth, gender, created_at`,
      [full_name, phone, address, avatar_url, date_of_birth || null, gender, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== AI CHATBOT API ====================
app.post('/api/chat', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const lowerText = text.toLowerCase();
    let queryTerm = null;
    let replyText = 'Tôi đã nhận được thông tin về triệu chứng của bạn. Để được tư vấn chính xác nhất, bạn có thể mô tả chi tiết hơn không? Hoặc bạn có thể tìm các thuốc liên quan đến "đau khớp", "dạ dày", "mệt mỏi", "táo bón".';
    
    const hasJointPain = ['khớp', 'khop', 'lưng', 'lung', 'vai gáy', 'vai gay', 'khương thảo đan', 'khuong thao dan'].some(k => lowerText.includes(k));
    const hasStomachPain = ['dạ dày', 'da day', 'trào ngược', 'trao nguoc', 'bụng', 'bung', 'bình vị', 'binh vi'].some(k => lowerText.includes(k));
    const hasFatigue = ['mệt mỏi', 'met moi', 'sâm', 'sam', 'yếu', 'yeu', 'sinh lực', 'sinh luc'].some(k => lowerText.includes(k));
    const hasConstipation = ['táo bón', 'tao bon', 'tiêu hóa', 'tieu hoa', 'phân cứng', 'phan cung', 'gokids', 'nhuận tràng', 'nhuan trang'].some(k => lowerText.includes(k));

    if (hasJointPain) {
      replyText = 'Đối với các triệu chứng đau nhức xương khớp, thoái hóa khớp, tôi khuyên dùng viên uống Khương Thảo Đan giúp giảm đau xương khớp, tái tạo sụn khớp hiệu quả.';
      queryTerm = '%Khương Thảo Đan%';
    } else if (hasStomachPain) {
      replyText = 'Triệu chứng trào ngược dạ dày, viêm loét dạ dày có thể được hỗ trợ cải thiện rất tốt nhờ Bình Vị giúp giảm tiết acid, bảo vệ niêm mạc dạ dày.';
      queryTerm = '%Bình Vị%';
    } else if (hasFatigue) {
      replyText = 'Để bồi bổ sức khỏe, tăng cường sinh lực và tăng sức đề kháng chống mệt mỏi, Trà Sâm là sự lựa chọn tuyệt vời.';
      queryTerm = '%Sâm%';
    } else if (hasConstipation) {
      replyText = 'Bé hoặc người lớn bị táo bón, khó đi ngoài nên bổ sung Cốm Nhuận Tràng Gokids giúp làm mềm phân, kích thích nhu động ruột an toàn.';
      queryTerm = '%Gokids%';
    }
    
    let recommendedProduct = null;
    if (queryTerm) {
      const dbResult = await pool.query(
        'SELECT * FROM medicines WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 1',
        [queryTerm]
      );
      if (dbResult.rows.length > 0) {
        const p = dbResult.rows[0];
        recommendedProduct = {
          id: p.id,
          name: p.name,
          price: parseFloat(p.price),
          image: p.image_url || p.imageUrl || 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop',
          unit: p.unit || 'Hộp'
        };
      }
    }
    
    res.json({
      text: replyText,
      product: recommendedProduct
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== REAL-TIME ORDER TRACKING SIMULATION & WEBHOOK ====================

const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});

const storeCoords = { lat: 10.76008, lng: 106.68220 };
const userCoords = { lat: 10.75784, lng: 106.67102 };

// Generate waypoints connecting Store to User
const waypoints = [];
const steps = 15;
for (let i = 0; i <= steps; i++) {
  const t = i / steps;
  waypoints.push({
    lat: storeCoords.lat + (userCoords.lat - storeCoords.lat) * t,
    lng: storeCoords.lng + (userCoords.lng - storeCoords.lng) * t
  });
}

let activeSimulations = {};

function startShipperSimulation(orderId) {
  if (activeSimulations[orderId]) {
    clearInterval(activeSimulations[orderId].intervalId);
  }

  const shipperInfo = {
    name: "Nguyễn Minh Hải",
    phone: "0912.345.678",
    plate: "59-A1 789.65"
  };

  let currentStep = 0;
  let orderStatus = 'Preparing';

  // Broadcast initial location
  io.emit(`order-${orderId}-tracking`, {
    orderId,
    status: orderStatus,
    shipper: shipperInfo,
    coords: waypoints[0]
  });

  const intervalId = setInterval(async () => {
    currentStep++;
    if (currentStep === 1) {
      orderStatus = 'Shipping';
    }

    if (currentStep >= waypoints.length) {
      orderStatus = 'Arrived';
      clearInterval(intervalId);
      delete activeSimulations[orderId];

      try {
        await pool.query("UPDATE orders SET status = 'Delivered' WHERE id = $1", [orderId]);
      } catch (err) {
        console.error('Failed to update order status in DB:', err.message);
      }

      io.emit(`order-${orderId}-tracking`, {
        orderId,
        status: orderStatus,
        shipper: shipperInfo,
        coords: waypoints[waypoints.length - 1]
      });
      return;
    }

    io.emit(`order-${orderId}-tracking`, {
      orderId,
      status: orderStatus,
      shipper: shipperInfo,
      coords: waypoints[currentStep]
    });
  }, 3000);

  activeSimulations[orderId] = {
    intervalId,
    waypoints,
    currentStep,
    shipperInfo
  };
}

io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('start-tracking', (orderId) => {
    console.log(`Start tracking requested for order #${orderId}`);
    startShipperSimulation(orderId);
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

app.post('/api/shipping/webhook', (req, res) => {
  const { orderId, status, coords, shipper } = req.body;
  if (!orderId || !status) {
    return res.status(400).json({ error: 'orderId and status are required' });
  }

  console.log(`Webhook received: Order #${orderId} status changed to ${status}`);

  io.emit(`order-${orderId}-tracking`, {
    orderId,
    status,
    coords: coords || null,
    shipper: shipper || null
  });

  if (['Arrived', 'Delivered'].includes(status) && activeSimulations[orderId]) {
    clearInterval(activeSimulations[orderId].intervalId);
    delete activeSimulations[orderId];
  }

  res.json({ success: true, message: 'Status updated and broadcasted' });
});

// Database auto-creation and initialization helper functions
async function ensureDatabaseExists() {
  if (process.env.DATABASE_URL) {
    // In production or when connection string is provided directly, assume DB exists
    return;
  }
  const dbName = 'tmpms';
  const { Client } = require('pg');
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      console.log(`[PostgreSQL] Database "${dbName}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`[PostgreSQL] Database "${dbName}" created successfully.`);
    } else {
      console.log(`[PostgreSQL] Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('[PostgreSQL] Error checking/creating database:', err.message);
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}

async function initializeDatabase() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Check if the users table exists (indicates schema is already created)
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('[PostgreSQL] Schema not found. Initializing tables...');
      
      const schemaPath = path.join(__dirname, 'database', 'schema.sql');
      const schemaClinicPath = path.join(__dirname, 'database', 'schema_clinic.sql');
      const seedPath = path.join(__dirname, 'database', 'seed.sql');
      const seedDongyPath = path.join(__dirname, 'database', 'seed_dongy.sql');
      
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const schemaClinicSql = fs.readFileSync(schemaClinicPath, 'utf8');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      const seedDongySql = fs.readFileSync(seedDongyPath, 'utf8');
      
      console.log('[PostgreSQL] Executing schema.sql...');
      await pool.query(schemaSql);
      
      console.log('[PostgreSQL] Executing schema_clinic.sql...');
      await pool.query(schemaClinicSql);
      
      console.log('[PostgreSQL] Executing seed.sql...');
      await pool.query(seedSql);
      
      console.log('[PostgreSQL] Executing seed_dongy.sql...');
      await pool.query(seedDongySql);
      
      console.log('[PostgreSQL] Database schema and seeding initialized successfully.');
    } else {
      console.log('[PostgreSQL] Schema already initialized. Skipping creation.');
    }

    // Ensure chatbot specific medicines exist in PostgreSQL
    console.log('[PostgreSQL] Ensuring chatbot specific medicines exist...');
    await pool.query(`
      INSERT INTO medicines (id, category_id, supplier_id, name, description, price, old_price, unit, origin, packaging, stock_quantity, image_url) VALUES
      (601, 1, 3, 'TPBVSK Khương Thảo Đan Gold', 'Giúp giảm đau xương khớp, tái tạo sụn khớp, hỗ trợ giảm triệu chứng thoái hóa khớp.', 170000, 190000, 'Hộp', 'Việt Nam', 'Hộp 30 viên', 100, 'https://tmp.vn/storage/media/c03d3ce6-2187-43ca-a3ef-b32c1c3fca93.webp'),
      (611, 1, 3, 'TPBVSK Bình Vị Thái Minh', 'Hỗ trợ giảm acid dịch vị, giảm trào ngược dạ dày thực quản, bảo vệ niêm mạc dạ dày.', 165000, 185000, 'Hộp', 'Việt Nam', 'Hộp 20 viên', 150, 'https://tmp.vn/storage/media/caeb95d2-f674-4b5f-8f83-d5d14dfbb500.webp'),
      (620, 1, 3, 'Trà sâm 1700 Thái Minh', 'Bồi bổ sức khỏe, tăng cường đề kháng, giảm căng thẳng mệt mỏi từ sâm Lai Châu.', 180000, 200000, 'Hộp', 'Việt Nam', 'Hộp 20 gói', 80, 'https://tmp.vn/storage/media/ddfa6c2b-ea32-4467-b864-4e789bc44d03.webp'),
      (631, 1, 3, 'Cốm Nhuận Tràng Gokids Thái Minh', 'Hỗ trợ nhuận tràng, bổ sung chất xơ, giảm táo bón cho trẻ nhỏ và người lớn.', 255000, 280000, 'Hộp', 'Việt Nam', 'Hộp 20 gói', 120, 'https://tmp.vn/storage/media/dd0f6dbe-907c-4e58-9352-82bffe5f842d.webp')
      ON CONFLICT (id) DO NOTHING;
    `);
    
    // Reset sequence just in case
    await pool.query("SELECT setval('medicines_id_seq', COALESCE((SELECT MAX(id)+1 FROM medicines), 1), false);");
  } catch (err) {
    console.error('[PostgreSQL] Error initializing database schema:', err.message);
  }
}

async function startServer() {
  await ensureDatabaseExists();
  await initializeDatabase();
  server.listen(port, () => {
    console.log(`Mock PostgREST server with Socket.io running at http://localhost:${port}`);
  });
}

startServer();
