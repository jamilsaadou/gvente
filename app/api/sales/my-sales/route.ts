import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/auth';
import { getSalesByAgent } from '@/lib/sales';

async function getAuthUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    return null;
  }
  
  return getUserById(parseInt(userId));
}

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    
    const sales = getSalesByAgent(user.id);
    
    return NextResponse.json({ sales });
  } catch (error) {
    console.error('Get my sales error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ventes' },
      { status: 500 }
    );
  }
}
