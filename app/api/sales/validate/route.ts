import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/auth';
import { validateSale, getSaleByReceiptNumber } from '@/lib/sales';

async function getAuthUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    return null;
  }
  
  return getUserById(parseInt(userId));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user || user.role !== 'controller') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }
    
    const { receiptNumber } = await request.json();
    
    if (!receiptNumber) {
      return NextResponse.json(
        { error: 'Numéro de reçu requis' },
        { status: 400 }
      );
    }
    
    const sale = await getSaleByReceiptNumber(receiptNumber);
    
    if (!sale) {
      return NextResponse.json(
        { error: 'Vente non trouvée' },
        { status: 404 }
      );
    }
    
    if (sale.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cette vente a déjà été traitée' },
        { status: 400 }
      );
    }
    
    const validatedSale = await validateSale(sale.id, user.id);
    
    return NextResponse.json({ sale: validatedSale });
  } catch (error) {
    console.error('Validate sale error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la validation de la vente' },
      { status: 500 }
    );
  }
}
