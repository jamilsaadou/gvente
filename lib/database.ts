import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'sales.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'agent', 'controller')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      weight TEXT NOT NULL,
      price INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      agent_id INTEGER NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_firstname TEXT NOT NULL,
      buyer_matricule TEXT NOT NULL,
      buyer_grade TEXT NOT NULL CHECK(buyer_grade IN ('GP', 'Sous officier', 'Officier', 'Inspecteur', 'Commissaire')),
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'validated', 'cancelled')),
      validated_by INTEGER,
      validated_at DATETIME,
      cancelled_by INTEGER,
      cancelled_at DATETIME,
      cancellation_reason TEXT CHECK(cancellation_reason IN ('stock_unavailable', 'not_eligible', 'other')),
      cancellation_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES users(id),
      FOREIGN KEY (validated_by) REFERENCES users(id),
      FOREIGN KEY (cancelled_by) REFERENCES users(id)
    )
  `);

  // Sale items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Insert default products if not exist
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  
  if (productCount.count === 0) {
    const insertProduct = db.prepare('INSERT INTO products (name, weight, price) VALUES (?, ?, ?)');
    const products = [
      ['Riz', '50 KG', 16500],
      ['Riz', '25 KG', 8250],
      ['Maïs', '100 KG', 13500],
      ['Mil', '50 KG', 6750],
      ['Mil', '100 KG', 13500],
      ['Sorgho', '50 KG', 6750],
      ['Sorgho', '100 KG', 13500],
    ];
    
    products.forEach(product => {
      insertProduct.run(product);
    });
  }

  // Insert default admin user if not exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const hashedPassword = hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run(
      'admin',
      hashedPassword,
      'Administrateur',
      'admin'
    );
  }

  // Add migration for existing database
  try {
    db.exec(`
      ALTER TABLE sales ADD COLUMN cancelled_by INTEGER REFERENCES users(id);
    `);
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec(`
      ALTER TABLE sales ADD COLUMN cancelled_at DATETIME;
    `);
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec(`
      ALTER TABLE sales ADD COLUMN cancellation_reason TEXT CHECK(cancellation_reason IN ('stock_unavailable', 'not_eligible', 'other'));
    `);
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec(`
      ALTER TABLE sales ADD COLUMN cancellation_note TEXT;
    `);
  } catch (e) {
    // Column already exists
  }
}

// Initialize on import
initializeDatabase();

export default db;
