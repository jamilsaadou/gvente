import db from './database';
import { Product, Sale, SaleWithDetails, SaleItem, DashboardStats } from './types';

export function getAllProducts(): Product[] {
  return db.prepare('SELECT * FROM products ORDER BY name, weight').all() as Product[];
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getTime()).slice(-6);
  return `REC-${year}${month}${day}-${time}`;
}

export function createSale(
  agentId: number,
  buyerData: {
    name: string;
    firstname: string;
    matricule: string;
    grade: string;
  },
  items: { productId: number; quantity: number }[]
): Sale {
  const receiptNumber = generateReceiptNumber();
  
  // Calculate total amount
  let totalAmount = 0;
  const itemsWithPrices = items.map(item => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId) as Product;
    const totalPrice = product.price * item.quantity;
    totalAmount += totalPrice;
    return {
      ...item,
      unitPrice: product.price,
      totalPrice
    };
  });
  
  // Insert sale
  const saleResult = db.prepare(`
    INSERT INTO sales (receipt_number, agent_id, buyer_name, buyer_firstname, buyer_matricule, buyer_grade, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    receiptNumber,
    agentId,
    buyerData.name,
    buyerData.firstname,
    buyerData.matricule,
    buyerData.grade,
    totalAmount
  );
  
  const saleId = saleResult.lastInsertRowid as number;
  
  // Insert sale items
  const insertItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  itemsWithPrices.forEach(item => {
    insertItem.run(saleId, item.productId, item.quantity, item.unitPrice, item.totalPrice);
  });
  
  return getSaleById(saleId)!;
}

export function getSaleById(id: number): Sale | undefined {
  return db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as Sale | undefined;
}

export function getSaleByReceiptNumber(receiptNumber: string): SaleWithDetails | undefined {
  const sale = db.prepare(`
    SELECT s.*, u.name as agent_name, v.name as validator_name
    FROM sales s
    JOIN users u ON s.agent_id = u.id
    LEFT JOIN users v ON s.validated_by = v.id
    WHERE s.receipt_number = ?
  `).get(receiptNumber) as any;
  
  if (!sale) return undefined;
  
  const items = db.prepare(`
    SELECT si.*, p.name as product_name, p.weight as product_weight
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
  `).all(sale.id) as any[];
  
  return { ...sale, items };
}

export function getAllSales(): SaleWithDetails[] {
  const sales = db.prepare(`
    SELECT s.*, u.name as agent_name, v.name as validator_name
    FROM sales s
    JOIN users u ON s.agent_id = u.id
    LEFT JOIN users v ON s.validated_by = v.id
    ORDER BY s.created_at DESC
  `).all() as any[];
  
  return sales.map(sale => {
    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.weight as product_weight
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(sale.id) as any[];
    
    return { ...sale, items };
  });
}

export function getSalesByAgent(agentId: number): SaleWithDetails[] {
  const sales = db.prepare(`
    SELECT s.*, u.name as agent_name, v.name as validator_name
    FROM sales s
    JOIN users u ON s.agent_id = u.id
    LEFT JOIN users v ON s.validated_by = v.id
    WHERE s.agent_id = ?
    ORDER BY s.created_at DESC
  `).all(agentId) as any[];
  
  return sales.map(sale => {
    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.weight as product_weight
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(sale.id) as any[];
    
    return { ...sale, items };
  });
}

export function getPendingSales(): SaleWithDetails[] {
  const sales = db.prepare(`
    SELECT s.*, u.name as agent_name
    FROM sales s
    JOIN users u ON s.agent_id = u.id
    WHERE s.status = 'pending'
    ORDER BY s.created_at DESC
  `).all() as any[];
  
  return sales.map(sale => {
    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.weight as product_weight
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(sale.id) as any[];
    
    return { ...sale, items };
  });
}

export function validateSale(saleId: number, validatorId: number): Sale {
  db.prepare(`
    UPDATE sales 
    SET status = 'validated', validated_by = ?, validated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(validatorId, saleId);
  
  return getSaleById(saleId)!;
}

export function cancelSale(saleId: number): Sale {
  db.prepare('UPDATE sales SET status = ? WHERE id = ?').run('cancelled', saleId);
  return getSaleById(saleId)!;
}

export function getDashboardStats(): DashboardStats {
  const totalSales = (db.prepare('SELECT COUNT(*) as count FROM sales WHERE status != ?').get('cancelled') as any).count;
  const totalRevenue = (db.prepare('SELECT SUM(total_amount) as total FROM sales WHERE status = ?').get('validated') as any).total || 0;
  const pendingSales = (db.prepare('SELECT COUNT(*) as count FROM sales WHERE status = ?').get('pending') as any).count;
  const validatedSales = (db.prepare('SELECT COUNT(*) as count FROM sales WHERE status = ?').get('validated') as any).count;
  
  // Sales by day (last 7 days)
  const salesByDay = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue
    FROM sales
    WHERE status != 'cancelled' AND created_at >= date('now', '-7 days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).all() as any[];
  
  // Sales by product
  const salesByProduct = db.prepare(`
    SELECT p.name || ' ' || p.weight as product, SUM(si.quantity) as count, SUM(si.total_price) as revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'cancelled'
    GROUP BY si.product_id
    ORDER BY revenue DESC
  `).all() as any[];
  
  // Sales by agent
  const salesByAgent = db.prepare(`
    SELECT u.name as agent, COUNT(*) as count, SUM(s.total_amount) as revenue
    FROM sales s
    JOIN users u ON s.agent_id = u.id
    WHERE s.status != 'cancelled'
    GROUP BY s.agent_id
    ORDER BY revenue DESC
  `).all() as any[];
  
  // Sales by grade
  const salesByGrade = db.prepare(`
    SELECT buyer_grade as grade, COUNT(*) as count, SUM(total_amount) as revenue
    FROM sales
    WHERE status != 'cancelled'
    GROUP BY buyer_grade
    ORDER BY revenue DESC
  `).all() as any[];
  
  return {
    totalSales,
    totalRevenue,
    pendingSales,
    validatedSales,
    salesByDay,
    salesByProduct,
    salesByAgent,
    salesByGrade
  };
}
