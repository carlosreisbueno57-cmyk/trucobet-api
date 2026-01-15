import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (e) {
    res.status(500).json({ status: "error", error: e.message });
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================
// TESTE
// ===============================
app.get("/", (req, res) => {
  res.send("TRUCO BET API ONLINE");
});

// ===============================
// USER REGISTER
// ===============================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    const user = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id",
      [username, hash]
    );

    await pool.query(
      "INSERT INTO wallets (user_id, balance) VALUES ($1,0)",
      [user.rows[0].id]
    );

    res.json({ success: true });
  } catch {
    res.status(400).json({ error: "Username already exists" });
  }
});

// ===============================
// USER LOGIN
// ===============================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (result.rows.length === 0) return res.status(401).json({ error: "User not found" });

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid password" });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  res.json({ token, userId: user.id });
});

// ===============================
// USER BALANCE
// ===============================
app.get("/balance/:id", async (req, res) => {
  const wallet = await pool.query(
    "SELECT balance FROM wallets WHERE user_id=$1",
    [req.params.id]
  );
  res.json(wallet.rows[0]);
});

// ===============================
// ADMIN LOGIN
// ===============================
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM admins WHERE username = $1",
    [username]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Admin not found" });
  }

  res.json({
    success: true,
    admin: result.rows[0].username
  });
});

  const admin = result.rows[0];
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid password" });

  const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET);
  res.json({ token });
});

// ===============================
// ADMIN DASHBOARD
// ===============================
app.get("/admin/dashboard", async (req, res) => {
  const house = await pool.query("SELECT balance FROM house_wallet WHERE id=1");
  const users = await pool.query("SELECT COUNT(*) FROM users");
  const bets = await pool.query("SELECT SUM(amount) FROM bets");

  res.json({
    house_balance: house.rows[0].balance,
    users: users.rows[0].count,
    total_bets: bets.rows[0].sum || 0
  });
});

// ===============================
// ADMIN USERS
// ===============================
app.get("/admin/users", async (req, res) => {
  const users = await pool.query(
    "SELECT username, created_at FROM users ORDER BY created_at DESC"
  );
  res.json(users.rows);
});

// ===============================
// ADMIN TRANSACTIONS
// ===============================
app.get("/admin/transactions", async (req, res) => {
  const t = await pool.query(
    "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100"
  );
  res.json(t.rows);
});

// ===============================
// START
// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("TRUCO BET API ONLINE");
});
