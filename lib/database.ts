import mysql from 'mysql2/promise';
import { hashSync } from 'bcryptjs';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database schema
export async function initializeDatabase() {
  const connection = await pool.getConnection();
  
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'agent', 'controller') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        weight VARCHAR(255) NOT NULL,
        price INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Sales table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receipt_number VARCHAR(255) UNIQUE NOT NULL,
        agent_id INT NOT NULL,
        buyer_name VARCHAR(255) NOT NULL,
        buyer_firstname VARCHAR(255) NOT NULL,
        buyer_matricule VARCHAR(255) NOT NULL,
        buyer_grade ENUM('GP', 'Sous officier', 'Officier', 'Inspecteur', 'Commissaire') NOT NULL,
        total_amount INT NOT NULL,
        status ENUM('pending', 'validated', 'cancelled') NOT NULL DEFAULT 'pending',
        validated_by INT DEFAULT NULL,
        validated_at TIMESTAMP NULL DEFAULT NULL,
        cancelled_by INT DEFAULT NULL,
        cancelled_at TIMESTAMP NULL DEFAULT NULL,
        cancellation_reason ENUM('stock_unavailable', 'not_eligible', 'other') DEFAULT NULL,
        cancellation_note TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES users(id),
        FOREIGN KEY (validated_by) REFERENCES users(id),
        FOREIGN KEY (cancelled_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Sale items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price INT NOT NULL,
        total_price INT NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default products if not exist
    const [productRows] = await connection.execute('SELECT COUNT(*) as count FROM products');
    const productCount = (productRows as any)[0].count;
    
    if (productCount === 0) {
      const products = [
        ['Riz', '50 KG', 16500],
        ['Riz', '25 KG', 8250],
        ['Maïs', '100 KG', 13500],
        ['Mil', '50 KG', 6750],
        ['Mil', '100 KG', 13500],
        ['Sorgho', '50 KG', 6750],
        ['Sorgho', '100 KG', 13500],
      ];
      
      for (const product of products) {
        await connection.execute(
          'INSERT INTO products (name, weight, price) VALUES (?, ?, ?)',
          product
        );
      }
    }

    // Insert default admin user if not exist
    const [userRows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const userCount = (userRows as any)[0].count;
    
    if (userCount === 0) {
      const hashedPassword = hashSync('admin123', 10);
      await connection.execute(
        'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrateur', 'admin']
      );
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Helper function to execute queries
export async function query(sql: string, params?: any[]) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } finally {
    connection.release();
  }
}

// Helper function to get a single row
export async function queryOne(sql: string, params?: any[]) {
  const results = await query(sql, params) as any[];
  return results.length > 0 ? results[0] : undefined;
}

// Initialize on import
initializeDatabase().catch(console.error);

export default pool;
