import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/sales';

export async function GET() {
  try {
    const products = getAllProducts();
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits' },
      { status: 500 }
    );
  }
}
