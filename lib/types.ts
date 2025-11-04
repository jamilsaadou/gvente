export interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'agent' | 'controller';
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  weight: string;
  price: number;
  created_at: string;
}

export interface Sale {
  id: number;
  receipt_number: string;
  agent_id: number;
  buyer_name: string;
  buyer_firstname: string;
  buyer_matricule: string;
  buyer_grade: 'GP' | 'Sous officier' | 'Officier' | 'Inspecteur' | 'Commissaire';
  total_amount: number;
  status: 'pending' | 'validated' | 'cancelled';
  validated_by?: number;
  validated_at?: string;
  cancelled_by?: number;
  cancelled_at?: string;
  cancellation_reason?: 'stock_unavailable' | 'not_eligible' | 'other';
  cancellation_note?: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SaleWithDetails extends Sale {
  agent_name: string;
  validator_name?: string;
  items: (SaleItem & { product_name: string; product_weight: string })[];
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  pendingSales: number;
  validatedSales: number;
  salesByDay: { date: string; count: number; revenue: number }[];
  salesByProduct: { product: string; count: number; revenue: number }[];
  salesByAgent: { agent: string; count: number; revenue: number }[];
  salesByGrade: { grade: string; count: number; revenue: number }[];
}
