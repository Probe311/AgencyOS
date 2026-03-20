// Utility functions for exporting data to various formats
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export interface ExportData {
  title: string;
  [key: string]: any;
}

export const exportToPDF = async (data: ExportData, filename: string) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, margin, yPosition);
    yPosition += 10;

    // Draw a line under title
    doc.setDrawColor(99, 102, 241); // indigo-500
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Performance metrics
    if (data.performance) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const metrics = [
        { label: "Taux d'ouverture", value: `${(data.performance.openRate || 0).toFixed(1)}%` },
        { label: 'Taux de clic', value: `${(data.performance.clickRate || 0).toFixed(1)}%` },
        { label: 'ROI', value: `${(data.performance.roi || 0).toFixed(1)}%` },
        { label: 'Revenus', value: `${(data.performance.totalRevenue || 0).toLocaleString('fr-FR')}€` },
      ];

      const boxWidth = (pageWidth - 2 * margin - 10) / 2;
      let xPos = margin;
      let row = 0;

      metrics.forEach((metric, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }

        // Draw metric box
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(xPos, yPosition - 8, boxWidth, 15, 2, 2, 'F');
        
        // Label
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(metric.label, xPos + 3, yPosition - 2);
        
        // Value
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(metric.value, xPos + 3, yPosition + 5);

        // Move to next position
        if (index % 2 === 1) {
          yPosition += 20;
          xPos = margin;
          row++;
        } else {
          xPos += boxWidth + 10;
        }
      });

      yPosition += 10;
    }

    // Summary
    if (data.summary) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Résumé', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const summaryItems = [
        { label: 'Revenus totaux', value: `${(data.summary.totalRevenue || 0).toLocaleString('fr-FR')}€` },
        { label: 'Nouveaux leads', value: `${data.summary.newLeads || 0}` },
        { label: 'Taux de conversion', value: `${data.summary.conversionRate || 0}%` },
        { label: 'Tâches actives', value: `${data.summary.activeTasks || 0}` },
        { label: 'Tâches terminées', value: `${data.summary.finishedTasks || 0}` },
      ];

      summaryItems.forEach((item) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(`${item.label}: ${item.value}`, margin + 5, yPosition);
        yPosition += 7;
      });

      yPosition += 5;
    }

    // Metrics table
    if (data.metrics && data.metrics.length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Métriques détaillées', margin, yPosition);
      yPosition += 8;

      // Table headers
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');
      
      const headers = ['Date', 'Ouvertures', 'Clics', 'Rebonds', 'Conversions', 'Revenus (€)'];
      const colWidths = [
        (pageWidth - 2 * margin) * 0.20,
        (pageWidth - 2 * margin) * 0.15,
        (pageWidth - 2 * margin) * 0.15,
        (pageWidth - 2 * margin) * 0.15,
        (pageWidth - 2 * margin) * 0.15,
        (pageWidth - 2 * margin) * 0.20,
      ];
      
      let xPos = margin;
      headers.forEach((header, index) => {
        doc.text(header, xPos + 2, yPosition);
        xPos += colWidths[index];
      });
      yPosition += 5;

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      data.metrics.forEach((metric: any) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = margin + 8;
        }

        xPos = margin;
        const rowData = [
          new Date(metric.metricDate).toLocaleDateString('fr-FR'),
          (metric.opens || 0).toString(),
          (metric.clicks || 0).toString(),
          (metric.bounces || 0).toString(),
          (metric.conversions || 0).toString(),
          (metric.revenue || 0).toLocaleString('fr-FR'),
        ];

        rowData.forEach((cell, index) => {
          doc.text(cell, xPos + 2, yPosition);
          xPos += colWidths[index];
        });

        // Draw row separator
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.1);
        doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);

        yPosition += 6;
      });
    }

    // Footer with page numbers
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${i} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        margin,
        pageHeight - 10
      );
    }

    // Save the PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to print method if jsPDF fails
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour exporter en PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${data.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #1e293b;
            }
            h1 {
              color: #0f172a;
              border-bottom: 2px solid #6366f1;
              padding-bottom: 10px;
              margin-bottom: 30px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
            }
            .metric {
              display: inline-block;
              margin: 10px 20px 10px 0;
              padding: 15px;
              background-color: #f8fafc;
              border-radius: 8px;
            }
            .metric-label {
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
            }
            .metric-value {
              font-size: 24px;
              font-weight: bold;
              color: #0f172a;
              margin-top: 5px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <h1>${data.title}</h1>
          ${generatePDFContent(data)}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

const generatePDFContent = (data: ExportData): string => {
  let content = '';

  if (data.performance) {
    content += '<div style="margin-bottom: 30px;">';
    content += '<h2>Performance</h2>';
    content += '<div>';
    content += `<div class="metric"><div class="metric-label">Taux d'ouverture</div><div class="metric-value">${data.performance.openRate?.toFixed(1) || 0}%</div></div>`;
    content += `<div class="metric"><div class="metric-label">Taux de clic</div><div class="metric-value">${data.performance.clickRate?.toFixed(1) || 0}%</div></div>`;
    content += `<div class="metric"><div class="metric-label">ROI</div><div class="metric-value">${data.performance.roi?.toFixed(1) || 0}%</div></div>`;
    content += `<div class="metric"><div class="metric-label">Revenus</div><div class="metric-value">${data.performance.totalRevenue?.toLocaleString('fr-FR') || 0}€</div></div>`;
    content += '</div></div>';
  }

  if (data.metrics && data.metrics.length > 0) {
    content += '<h2>Métriques détaillées</h2>';
    content += '<table>';
    content += '<thead><tr>';
    content += '<th>Date</th>';
    content += '<th>Ouvertures</th>';
    content += '<th>Clics</th>';
    content += '<th>Rebonds</th>';
    content += '<th>Conversions</th>';
    content += '<th>Revenus (€)</th>';
    content += '</tr></thead><tbody>';

    data.metrics.forEach((metric: any) => {
      content += '<tr>';
      content += `<td>${new Date(metric.metricDate).toLocaleDateString('fr-FR')}</td>`;
      content += `<td>${metric.opens || 0}</td>`;
      content += `<td>${metric.clicks || 0}</td>`;
      content += `<td>${metric.bounces || 0}</td>`;
      content += `<td>${metric.conversions || 0}</td>`;
      content += `<td>${(metric.revenue || 0).toLocaleString('fr-FR')}</td>`;
      content += '</tr>';
    });

    content += '</tbody></table>';
  }

  return content;
};

/**
 * Exporte des données au format CSV de manière générique
 * @param data Tableau d'objets à exporter
 * @param filename Nom du fichier
 * @param columns Optionnel : colonnes spécifiques à exporter (avec labels si objet)
 */
export const exportToCSV = async (
  data: any[], 
  filename: string,
  columns?: string[] | Record<string, string>
): Promise<void> => {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  let headers: string[] = [];
  let headerLabels: string[] = [];
  
  if (columns) {
    // Colonnes spécifiées
    if (Array.isArray(columns)) {
      headers = columns;
      headerLabels = columns;
    } else {
      // Objet avec mapping colonne -> label
      headers = Object.keys(columns);
      headerLabels = headers.map(key => columns[key]);
    }
  } else {
    // Utiliser toutes les clés du premier objet
    headers = Object.keys(data[0]);
    headerLabels = headers;
  }
  
  // Créer le contenu CSV
  let csvContent = headerLabels.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header] ?? '';
      
      // Gérer les objets complexes
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          value = value.join('; ');
        } else {
          value = JSON.stringify(value);
        }
      }
      
      // Convertir en string
      value = String(value);
      
      // Échapper les guillemets et virgules
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    csvContent += values.join(',') + '\n';
  });

  // Ajouter BOM pour Excel UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const exportToExcel = async (data: any[], filename: string, columns?: string[] | Record<string, string>) => {
  try {
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    let headers: string[] = [];
    let headerLabels: string[] = [];
    
    if (columns) {
      if (Array.isArray(columns)) {
        headers = columns;
        headerLabels = columns;
      } else {
        headers = Object.keys(columns);
        headerLabels = headers.map(key => columns[key]);
      }
    } else {
      headers = Object.keys(data[0]);
      headerLabels = headers;
    }

    // Préparer les données pour Excel
    const excelData = data.map(row => {
      const excelRow: any = {};
      headers.forEach(header => {
        let value = row[header] ?? '';
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            value = value.join('; ');
          } else {
            value = JSON.stringify(value);
          }
        }
        excelRow[headerLabels[headers.indexOf(header)]] = value;
      });
      return excelRow;
    });

    // Créer le workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Ajuster la largeur des colonnes
    const colWidths = headers.map(() => ({ wch: 15 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    
    // Générer le fichier
    const excelFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, excelFilename);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    // Fallback to CSV
    const csvFilename = filename.replace('.xlsx', '.csv').replace('.xls', '.csv');
    await exportToCSV(data, csvFilename, columns);
  }
};

/**
 * Exporte des données au format PowerPoint (PPT)
 * Note: Cette fonction crée un fichier HTML qui peut être ouvert dans PowerPoint
 * Pour un vrai fichier .pptx, il faudrait utiliser une bibliothèque comme pptxgenjs
 */
export const exportToPPT = async (data: ExportData, filename: string): Promise<void> => {
  try {
    // Créer un contenu HTML structuré pour PowerPoint
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      padding: 40px;
      background: #f8fafc;
    }
    .slide {
      background: white;
      margin: 20px 0;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      page-break-after: always;
    }
    h1 {
      color: #0f172a;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 15px;
      margin-bottom: 30px;
      font-size: 32px;
    }
    h2 {
      color: #1e293b;
      margin-top: 30px;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f1f5f9;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #6366f1;
    }
    .metric-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #6366f1;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="slide">
    <h1>${data.title}</h1>
    <div class="footer">
      Généré le ${new Date().toLocaleDateString('fr-FR')} - AgencyOS
    </div>
  </div>
  
  ${data.performance ? `
  <div class="slide">
    <h2>Performance</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Taux d'ouverture</div>
        <div class="metric-value">${(data.performance.openRate || 0).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Taux de clic</div>
        <div class="metric-value">${(data.performance.clickRate || 0).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">ROI</div>
        <div class="metric-value">${(data.performance.roi || 0).toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Revenus</div>
        <div class="metric-value">${(data.performance.totalRevenue || 0).toLocaleString('fr-FR')}€</div>
      </div>
    </div>
  </div>
  ` : ''}
  
  ${data.summary ? `
  <div class="slide">
    <h2>Résumé</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Revenus totaux</div>
        <div class="metric-value">${(data.summary.totalRevenue || 0).toLocaleString('fr-FR')}€</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Nouveaux leads</div>
        <div class="metric-value">${data.summary.newLeads || 0}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Taux de conversion</div>
        <div class="metric-value">${data.summary.conversionRate || 0}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Tâches actives</div>
        <div class="metric-value">${data.summary.activeTasks || 0}</div>
      </div>
    </div>
  </div>
  ` : ''}
  
  ${data.metrics && data.metrics.length > 0 ? `
  <div class="slide">
    <h2>Métriques détaillées</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Ouvertures</th>
          <th>Clics</th>
          <th>Rebonds</th>
          <th>Conversions</th>
          <th>Revenus (€)</th>
        </tr>
      </thead>
      <tbody>
        ${data.metrics.map((metric: any) => `
          <tr>
            <td>${new Date(metric.metricDate).toLocaleDateString('fr-FR')}</td>
            <td>${metric.opens || 0}</td>
            <td>${metric.clicks || 0}</td>
            <td>${metric.bounces || 0}</td>
            <td>${metric.conversions || 0}</td>
            <td>${(metric.revenue || 0).toLocaleString('fr-FR')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
</body>
</html>
    `;

    // Créer un blob et télécharger
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PPT export:', error);
    // Fallback: exporter en PDF
    await exportToPDF(data, filename.replace('.ppt', '.pdf').replace('.pptx', '.pdf'));
  }
};

