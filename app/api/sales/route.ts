import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/auth';
import { createSale, getAllSales, getAllProducts } from '@/lib/sales';

async function getAuthUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    return null;
  }
  
  return getUserById(parseInt(userId));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const matricule = searchParams.get('matricule');
    
    let sales = await getAllSales();
    
    // Filter by status if provided
    if (status) {
      sales = sales.filter(sale => sale.status === status);
    }
    
    // Filter by matricule if provided
    if (matricule) {
      sales = sales.filter(sale => 
        sale.buyer_matricule.toLowerCase().includes(matricule.toLowerCase())
      );
    }
    
    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ventes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user || user.role !== 'agent') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }
    
    const { buyerData, items } = await request.json();
    
    if (!buyerData || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      );
    }
    
    const sale = await createSale(user.id, buyerData, items);
    
    return NextResponse.json({ sale });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la vente' },
      { status: 500 }
    );
  }
}
