import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById } from '@/lib/auth';
import { getAllSales } from '@/lib/sales';
import ExcelJS from 'exceljs';

async function getAuthUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    return null;
  }
  
  return getUserById(parseInt(userId));
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }
    
    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    
    let sales = await getAllSales();
    
    // Filter by date range if provided
    if (startDate || endDate) {
      sales = sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        // Set end date to end of day
        if (end) {
          end.setHours(23, 59, 59, 999);
        }
        
        if (start && end) {
          return saleDate >= start && saleDate <= end;
        } else if (start) {
          return saleDate >= start;
        } else if (end) {
          return saleDate <= end;
        }
        return true;
      });
    }
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Système de Gestion des Ventes';
    workbook.created = new Date();
    
    // Create worksheet
    const worksheet = workbook.addWorksheet('Rapport des Ventes', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    
    // Add title
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'RAPPORT COMPLET DES VENTES';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    titleCell.font = { ...titleCell.font, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).height = 30;
    
    // Add date and period info
    worksheet.mergeCells('A2:K2');
    const dateCell = worksheet.getCell('A2');
    let periodText = `Date d'export: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;
    if (startDate || endDate) {
      const startText = startDate ? new Date(startDate).toLocaleDateString('fr-FR') : 'début';
      const endText = endDate ? new Date(endDate).toLocaleDateString('fr-FR') : 'aujourd\'hui';
      periodText += ` | Période: ${startText} - ${endText}`;
    }
    dateCell.value = periodText;
    dateCell.alignment = { horizontal: 'center' };
    dateCell.font = { italic: true };
    worksheet.getRow(2).height = 20;
    
    // Calculate statistics
    const totalSales = sales.length;
    const validatedSales = sales.filter(s => s.status === 'validated').length;
    const pendingSales = sales.filter(s => s.status === 'pending').length;
    const cancelledSales = sales.filter(s => s.status === 'cancelled').length;
    const totalRevenue = sales
      .filter(s => s.status === 'validated')
      .reduce((sum, sale) => sum + sale.total_amount, 0);
    
    // Add summary section
    worksheet.getCell('A4').value = 'RÉSUMÉ';
    worksheet.getCell('A4').font = { bold: true, size: 12 };
    worksheet.getCell('A4').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    };
    
    worksheet.getCell('A5').value = 'Total des ventes:';
    worksheet.getCell('B5').value = totalSales;
    worksheet.getCell('B5').font = { bold: true };
    
    worksheet.getCell('A6').value = 'Ventes validées:';
    worksheet.getCell('B6').value = validatedSales;
    worksheet.getCell('B6').font = { color: { argb: 'FF008000' }, bold: true };
    
    worksheet.getCell('A7').value = 'Ventes en attente:';
    worksheet.getCell('B7').value = pendingSales;
    worksheet.getCell('B7').font = { color: { argb: 'FFFFA500' }, bold: true };
    
    worksheet.getCell('A8').value = 'Ventes annulées:';
    worksheet.getCell('B8').value = cancelledSales;
    worksheet.getCell('B8').font = { color: { argb: 'FFFF0000' }, bold: true };
    
    worksheet.getCell('A9').value = 'MONTANT TOTAL DES VENTES VALIDÉES:';
    worksheet.getCell('A9').font = { bold: true, size: 12 };
    worksheet.getCell('B9').value = totalRevenue;
    worksheet.getCell('B9').numFmt = '#,##0 "FCFA"';
    worksheet.getCell('B9').font = { bold: true, size: 12, color: { argb: 'FF008000' } };
    worksheet.getCell('B9').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4EDDA' }
    };
    
    // Add empty row
    worksheet.getRow(10).height = 5;
    
    // Add header row for sales data
    const headerRow = worksheet.getRow(11);
    headerRow.values = [
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
    
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;
    
    // Add data rows
    sales.forEach((sale, index) => {
      const row = worksheet.getRow(12 + index);
      row.values = [
        sale.receipt_number,
        new Date(sale.created_at).toLocaleDateString('fr-FR'),
        sale.buyer_name,
        sale.buyer_firstname,
        sale.buyer_matricule,
        sale.buyer_grade,
        sale.total_amount,
        sale.status === 'pending' ? 'En attente' : 
          sale.status === 'validated' ? 'Validé' : 'Annulé',
        sale.agent_name,
        sale.validator_name || '-',
        sale.validated_at ? new Date(sale.validated_at).toLocaleDateString('fr-FR') : '-'
      ];
      
      // Format amount
      row.getCell(7).numFmt = '#,##0';
      
      // Color status cell
      const statusCell = row.getCell(8);
      if (sale.status === 'validated') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4EDDA' }
        };
        statusCell.font = { color: { argb: 'FF008000' } };
      } else if (sale.status === 'pending') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' }
        };
        statusCell.font = { color: { argb: 'FF856404' } };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8D7DA' }
        };
        statusCell.font = { color: { argb: 'FF721C24' } };
      }
      
      // Alternate row colors
      if (index % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          if (!cell.fill || cell.fill.type !== 'pattern' || !('fgColor' in cell.fill)) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' }
            };
          }
        });
      }
    });
    
    // Set column widths
    worksheet.columns = [
      { key: 'receipt', width: 18 },
      { key: 'date', width: 12 },
      { key: 'name', width: 15 },
      { key: 'firstname', width: 15 },
      { key: 'matricule', width: 15 },
      { key: 'grade', width: 12 },
      { key: 'amount', width: 15 },
      { key: 'status', width: 12 },
      { key: 'agent', width: 18 },
      { key: 'validator', width: 18 },
      { key: 'validatedAt', width: 15 }
    ];
    
    // Add borders to all cells with data
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber >= 11) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rapport_ventes_${new Date().toISOString().split('T')[0]}.xlsx"`
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
