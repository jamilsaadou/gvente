import { query, queryOne } from './database';
import { Product, Sale, SaleWithDetails, SaleItem, DashboardStats } from './types';

export async function getAllProducts(): Promise<Product[]> {
  return await query('SELECT * FROM products ORDER BY name, weight') as Product[];
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getTime()).slice(-6);
  return `REC-${year}${month}${day}-${time}`;
}

export async function createSale(
  agentId: number,
  buyerData: {
    name: string;
    firstname: string;
    matricule: string;
    grade: string;
  },
  items: { productId: number; quantity: number }[]
): Promise<Sale> {
  const receiptNumber = generateReceiptNumber();
  
  // Calculate total amount
  let totalAmount = 0;
  const itemsWithPrices = [];
  
  for (const item of items) {
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [item.productId]) as Product;
    const totalPrice = product.price * item.quantity;
    totalAmount += totalPrice;
    itemsWithPrices.push({
      ...item,
      unitPrice: product.price,
      totalPrice
    });
  }
  
  // Insert sale
  const saleResult = await query(
    `INSERT INTO sales (receipt_number, agent_id, buyer_name, buyer_firstname, buyer_matricule, buyer_grade, total_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [receiptNumber, agentId, buyerData.name, buyerData.firstname, buyerData.matricule, buyerData.grade, totalAmount]
  ) as any;
  
  const saleId = saleResult.insertId;
  
  // Insert sale items
  for (const item of itemsWithPrices) {
    await query(
      `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
       VALUES (?, ?, ?, ?, ?)`,
      [saleId, item.productId, item.quantity, item.unitPrice, item.totalPrice]
    );
  }
  
  return (await getSaleById(saleId))!;
}

export async function getSaleById(id: number): Promise<Sale | undefined> {
  return await queryOne('SELECT * FROM sales WHERE id = ?', [id]) as Sale | undefined;
}

export async function getSaleByReceiptNumber(receiptNumber: string): Promise<SaleWithDetails | undefined> {
  const sale = await queryOne(
    `SELECT s.*, u.name as agent_name, v.name as validator_name
     FROM sales s
     JOIN users u ON s.agent_id = u.id
     LEFT JOIN users v ON s.validated_by = v.id
     WHERE s.receipt_number = ?`,
    [receiptNumber]
  ) as any;
  
  if (!sale) return undefined;
  
  const items = await query(
    `SELECT si.*, p.name as product_name, p.weight as product_weight
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     WHERE si.sale_id = ?`,
    [sale.id]
  ) as any[];
  
  return { ...sale, items };
}

export async function getAllSales(): Promise<SaleWithDetails[]> {
  const sales = await query(
    `SELECT s.*, u.name as agent_name, v.name as validator_name
     FROM sales s
     JOIN users u ON s.agent_id = u.id
     LEFT JOIN users v ON s.validated_by = v.id
     ORDER BY s.created_at DESC`
  ) as any[];
  
  const salesWithItems = [];
  for (const sale of sales) {
    const items = await query(
      `SELECT si.*, p.name as product_name, p.weight as product_weight
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [sale.id]
    ) as any[];
    
    salesWithItems.push({ ...sale, items });
  }
  
  return salesWithItems;
}

export async function getSalesByAgent(agentId: number): Promise<SaleWithDetails[]> {
  const sales = await query(
    `SELECT s.*, u.name as agent_name, v.name as validator_name
     FROM sales s
     JOIN users u ON s.agent_id = u.id
     LEFT JOIN users v ON s.validated_by = v.id
     WHERE s.agent_id = ?
     ORDER BY s.created_at DESC`,
    [agentId]
  ) as any[];
  
  const salesWithItems = [];
  for (const sale of sales) {
    const items = await query(
      `SELECT si.*, p.name as product_name, p.weight as product_weight
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [sale.id]
    ) as any[];
    
    salesWithItems.push({ ...sale, items });
  }
  
  return salesWithItems;
}

export async function getPendingSales(): Promise<SaleWithDetails[]> {
  const sales = await query(
    `SELECT s.*, u.name as agent_name
     FROM sales s
     JOIN users u ON s.agent_id = u.id
     WHERE s.status = 'pending'
     ORDER BY s.created_at DESC`
  ) as any[];
  
  const salesWithItems = [];
  for (const sale of sales) {
    const items = await query(
      `SELECT si.*, p.name as product_name, p.weight as product_weight
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [sale.id]
    ) as any[];
    
    salesWithItems.push({ ...sale, items });
  }
  
  return salesWithItems;
}

export async function validateSale(saleId: number, validatorId: number): Promise<Sale> {
  await query(
    `UPDATE sales 
     SET status = 'validated', validated_by = ?, validated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [validatorId, saleId]
  );
  
  return (await getSaleById(saleId))!;
}

export async function cancelSale(saleId: number): Promise<Sale> {
  await query('UPDATE sales SET status = ? WHERE id = ?', ['cancelled', saleId]);
  return (await getSaleById(saleId))!;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const totalSalesRow = await queryOne('SELECT COUNT(*) as count FROM sales WHERE status != ?', ['cancelled']) as any;
  const totalSales = totalSalesRow.count;
  
  const totalRevenueRow = await queryOne('SELECT SUM(total_amount) as total FROM sales WHERE status = ?', ['validated']) as any;
  const totalRevenue = totalRevenueRow.total || 0;
  
  const pendingSalesRow = await queryOne('SELECT COUNT(*) as count FROM sales WHERE status = ?', ['pending']) as any;
  const pendingSales = pendingSalesRow.count;
  
  const validatedSalesRow = await queryOne('SELECT COUNT(*) as count FROM sales WHERE status = ?', ['validated']) as any;
  const validatedSales = validatedSalesRow.count;
  
  // Sales by day (last 7 days)
  const salesByDay = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue
     FROM sales
     WHERE status != 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY DATE(created_at)
     ORDER BY date DESC`
  ) as any[];
  
  // Sales by product
  const salesByProduct = await query(
    `SELECT CONCAT(p.name, ' ', p.weight) as product, SUM(si.quantity) as count, SUM(si.total_price) as revenue
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     JOIN sales s ON si.sale_id = s.id
     WHERE s.status != 'cancelled'
     GROUP BY si.product_id, p.name, p.weight
     ORDER BY revenue DESC`
  ) as any[];
  
  // Sales by agent
  const salesByAgent = await query(
    `SELECT u.name as agent, COUNT(*) as count, SUM(s.total_amount) as revenue
     FROM sales s
     JOIN users u ON s.agent_id = u.id
     WHERE s.status != 'cancelled'
     GROUP BY s.agent_id, u.name
     ORDER BY revenue DESC`
  ) as any[];
  
  // Sales by grade
  const salesByGrade = await query(
    `SELECT buyer_grade as grade, COUNT(*) as count, SUM(total_amount) as revenue
     FROM sales
     WHERE status != 'cancelled'
     GROUP BY buyer_grade
     ORDER BY revenue DESC`
  ) as any[];
  
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
