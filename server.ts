import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("bank.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    account_number TEXT UNIQUE NOT NULL,
    passport_number TEXT,
    address TEXT,
    postal_code TEXT,
    phone_number TEXT,
    dob TEXT,
    profile_picture TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    balance REAL DEFAULT 1000.00,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migration: Add new user columns if they don't exist
const userTableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const newCols = ['passport_number', 'address', 'postal_code', 'phone_number', 'dob', 'profile_picture'];
newCols.forEach(col => {
  if (!userTableInfo.some(c => c.name === col)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
  }
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const PORT = 3000;

  // Auth Routes
  app.post("/api/register", (req, res) => {
    const { email, password, name, passport_number, address, postal_code, phone_number, dob, profile_picture } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Missing required fields" });

    const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    try {
      const register = db.transaction(() => {
        const userResult = db.prepare(`
          INSERT INTO users (email, password, name, account_number, passport_number, address, postal_code, phone_number, dob, profile_picture) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(email, password, name, accountNumber, passport_number, address, postal_code, phone_number, dob, profile_picture);
        
        db.prepare("INSERT INTO accounts (user_id, balance) VALUES (?, ?)").run(userResult.lastInsertRowid, 1000.00);
        db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(userResult.lastInsertRowid, "Welcome to Nexus Bank! Your account has been created.");
      });
      register();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Email already exists or invalid data" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ user: { id: user.id, name: user.name, email: user.email, account_number: user.account_number, profile_picture: user.profile_picture } });
  });

  // API Routes (Updated to use user_id)
  app.get("/api/account/:userId", (req, res) => {
    const account = db.prepare("SELECT u.name, u.account_number, u.profile_picture, a.balance FROM users u JOIN accounts a ON u.id = a.user_id WHERE u.id = ?").get(req.params.userId);
    res.json(account);
  });

  app.get("/api/transactions/:userId", (req, res) => {
    const account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(req.params.userId);
    const transactions = db.prepare("SELECT * FROM transactions WHERE account_id = ? ORDER BY timestamp DESC").all(account.id);
    res.json(transactions);
  });

  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50").all(req.params.userId);
    res.json(notifications);
  });

  app.post("/api/deposit", (req, res) => {
    const { userId, amount, description } = req.body;
    const account = db.prepare("SELECT id FROM accounts WHERE user_id = ?").get(userId);

    const deposit = db.transaction(() => {
      db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, account.id);
      db.prepare("INSERT INTO transactions (account_id, type, amount, description) VALUES (?, ?, ?, ?)").run(account.id, 'deposit', amount, description || 'Deposit');
      db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(userId, `Successfully deposited $${amount.toLocaleString()} - ${description || 'Deposit'}`);
    });

    deposit();
    res.json({ success: true });
  });

  app.post("/api/withdraw", (req, res) => {
    const { userId, amount, description } = req.body;
    const account = db.prepare("SELECT id, balance FROM accounts WHERE user_id = ?").get(userId);

    if (account.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

    const withdraw = db.transaction(() => {
      db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, account.id);
      db.prepare("INSERT INTO transactions (account_id, type, amount, description) VALUES (?, ?, ?, ?)").run(account.id, 'withdrawal', amount, description || 'Withdrawal');
      db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(userId, `Successfully withdrew $${amount.toLocaleString()} - ${description || 'Withdrawal'}`);
    });

    withdraw();
    res.json({ success: true });
  });

  app.post("/api/request-atm", (req, res) => {
    const { userId } = req.body;
    db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(userId, "ATM Card request received. Your card will be processed within 5-7 business days.");
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
