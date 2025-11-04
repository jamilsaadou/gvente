import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/auth';
import db from '@/lib/database';

async function getAuthUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    return null;
  }
  
  return getUserById(parseInt(userId));
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (user.role !== 'agent') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { receiptNumber, reason, note } = body;

    if (!receiptNumber || !reason) {
      return NextResponse.json({ error: 'Numéro de reçu et raison requis' }, { status: 400 });
    }

    // Validate reason
    const validReasons = ['stock_unavailable', 'not_eligible', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Raison d\'annulation invalide' }, { status: 400 });
    }

    // Check if sale exists and belongs to the agent
    const sale = db.prepare(
      'SELECT * FROM sales WHERE receipt_number = ? AND agent_id = ?'
    ).get(receiptNumber, user.id) as any;

    if (!sale) {
      return NextResponse.json({ error: 'Reçu non trouvé ou non autorisé' }, { status: 404 });
    }

    if (sale.status === 'validated') {
      return NextResponse.json({ error: 'Impossible d\'annuler un reçu déjà validé' }, { status: 400 });
    }

    if (sale.status === 'cancelled') {
      return NextResponse.json({ error: 'Ce reçu est déjà annulé' }, { status: 400 });
    }

    // Cancel the sale
    db.prepare(`
      UPDATE sales 
      SET status = 'cancelled',
          cancelled_by = ?,
          cancelled_at = CURRENT_TIMESTAMP,
          cancellation_reason = ?,
          cancellation_note = ?
      WHERE receipt_number = ?
    `).run(user.id, reason, note || null, receiptNumber);

    return NextResponse.json({ 
      message: 'Reçu annulé avec succès',
      receiptNumber 
    });

  } catch (error) {
    console.error('Error cancelling sale:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'annulation' },
      { status: 500 }
    );
  }
}
