import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/auth';
import { getAllSales } from '@/lib/sales';

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
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }
    
    const sales = getAllSales();
    
    // Create CSV content
    const headers = [
      'N° Reçu',
      'Date',
      'Nom',
      'Prénom',
      'Matricule',
      'Grade',
      'Montant (FCFA)',
      'Statut',
      'Agent',
      'Validé par',
      'Date validation'
    ];
    
    const rows = sales.map(sale => [
      sale.receipt_number,
      new Date(sale.created_at).toLocaleDateString('fr-FR'),
      sale.buyer_name,
      sale.buyer_firstname,
      sale.buyer_matricule,
      sale.buyer_grade,
      sale.total_amount.toString(),
      sale.status === 'pending' ? 'En attente' : 
        sale.status === 'validated' ? 'Validé' : 'Annulé',
      sale.agent_name,
      sale.validator_name || '',
      sale.validated_at ? new Date(sale.validated_at).toLocaleDateString('fr-FR') : ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Add BOM for Excel UTF-8 support
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;
    
    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ventes_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export sales error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exportation' },
      { status: 500 }
    );
  }
}
