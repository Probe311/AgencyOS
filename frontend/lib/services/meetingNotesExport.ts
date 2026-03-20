/**
 * Service d'export des notes de réunion
 */

import { jsPDF } from 'jspdf';
import type { MeetingNote } from './meetingNotesService';

/**
 * Exporte une note de réunion en PDF
 */
export async function exportMeetingNoteToPDF(
  note: MeetingNote,
  appointmentTitle?: string
): Promise<void> {
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

    // Titre
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(99, 102, 241); // indigo-500
    const title = appointmentTitle || 'Notes de réunion';
    doc.text(title, margin, yPosition);
    yPosition += 10;

    // Ligne de séparation
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Métadonnées
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    const metadata = [
      `Créé le ${new Date(note.created_at).toLocaleString('fr-FR')}`,
      note.updated_at && note.updated_at !== note.created_at
        ? `Modifié le ${new Date(note.updated_at).toLocaleString('fr-FR')}`
        : null,
      note.word_count ? `${note.word_count} mots` : null,
      note.duration_seconds ? `${Math.floor(note.duration_seconds / 60)} minutes` : null,
    ].filter(Boolean).join(' • ');
    
    doc.text(metadata, margin, yPosition);
    yPosition += 8;

    // Résumé IA
    if (note.ai_summary) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241); // indigo-500
      doc.text('Résumé IA', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const summaryLines = doc.splitTextToSize(note.ai_summary, pageWidth - 2 * margin);
      summaryLines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // Actions à faire
    if (note.action_items && note.action_items.length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`Actions à faire (${note.action_items.length})`, margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      note.action_items.forEach((action, idx) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }

        // Bullet point
        doc.setFillColor(16, 185, 129);
        doc.circle(margin + 2, yPosition - 1, 1, 'F');

        // Description
        const actionText = [
          action.description,
          action.assigned_to ? `→ Assigné à: ${action.assigned_to}` : null,
          action.due_date ? `Échéance: ${new Date(action.due_date).toLocaleDateString('fr-FR')}` : null,
          `Priorité: ${action.priority} | Statut: ${action.status}`,
        ].filter(Boolean).join(' • ');

        const actionLines = doc.splitTextToSize(actionText, pageWidth - 2 * margin - 10);
        actionLines.forEach((line: string) => {
          doc.text(line, margin + 6, yPosition);
          yPosition += 5;
        });
        yPosition += 3;
      });
      yPosition += 5;
    }

    // Insights
    if (note.insights) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(139, 92, 246); // purple-500
      doc.text('Insights', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      if (note.insights.sentiment) {
        doc.text(`Sentiment: ${note.insights.sentiment}`, margin, yPosition);
        yPosition += 6;
      }

      if (note.insights.interest_level) {
        doc.text(`Niveau d'intérêt: ${note.insights.interest_level}`, margin, yPosition);
        yPosition += 6;
      }

      if (note.insights.recommendations && Array.isArray(note.insights.recommendations)) {
        doc.text('Recommandations:', margin, yPosition);
        yPosition += 6;
        note.insights.recommendations.forEach((rec: string) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = margin;
          }
          const recLines = doc.splitTextToSize(`• ${rec}`, pageWidth - 2 * margin - 10);
          recLines.forEach((line: string) => {
            doc.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
        });
      }
      yPosition += 5;
    }

    // Transcription
    if (note.transcription_text) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Transcription', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105); // slate-600
      
      const transcriptionLines = doc.splitTextToSize(note.transcription_text, pageWidth - 2 * margin);
      transcriptionLines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 4;
      });
      yPosition += 5;
    }

    // Notes manuelles
    if (note.manual_notes) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Notes manuelles', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const notesLines = doc.splitTextToSize(note.manual_notes, pageWidth - 2 * margin);
      notesLines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
    }

    // Footer avec numéros de page
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
        `Généré le ${new Date().toLocaleDateString('fr-FR')} - AgencyOS`,
        margin,
        pageHeight - 10
      );
    }

    // Sauvegarder le PDF
    const filename = `notes-reunion-${appointmentTitle?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || note.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Erreur lors de la génération du PDF');
  }
}

/**
 * Exporte une note de réunion en Markdown
 */
export function exportMeetingNoteToMarkdown(
  note: MeetingNote,
  appointmentTitle?: string
): void {
  const content = `# Notes de réunion${appointmentTitle ? ` - ${appointmentTitle}` : ''}

**Créé le** ${new Date(note.created_at).toLocaleString('fr-FR')}
${note.updated_at && note.updated_at !== note.created_at ? `**Modifié le** ${new Date(note.updated_at).toLocaleString('fr-FR')}\n` : ''}
${note.word_count ? `**Mots** : ${note.word_count}\n` : ''}
${note.duration_seconds ? `**Durée** : ${Math.floor(note.duration_seconds / 60)} minutes\n` : ''}

${note.ai_summary ? `## Résumé IA\n\n${note.ai_summary}\n\n` : ''}
${note.action_items && note.action_items.length > 0 ? `## Actions à faire\n\n${note.action_items.map((a, idx) => `${idx + 1}. ${a.description}${a.assigned_to ? ` (Assigné à: ${a.assigned_to})` : ''}${a.due_date ? ` - Échéance: ${new Date(a.due_date).toLocaleDateString('fr-FR')}` : ''} - Priorité: ${a.priority} - Statut: ${a.status}`).join('\n')}\n\n` : ''}
${note.insights ? `## Insights\n\n${note.insights.sentiment ? `**Sentiment** : ${note.insights.sentiment}\n` : ''}${note.insights.interest_level ? `**Niveau d'intérêt** : ${note.insights.interest_level}\n` : ''}${note.insights.recommendations && Array.isArray(note.insights.recommendations) ? `\n**Recommandations** :\n${note.insights.recommendations.map((rec: string) => `- ${rec}`).join('\n')}\n` : ''}\n\n` : ''}
${note.transcription_text ? `## Transcription\n\n${note.transcription_text}\n\n` : ''}
${note.manual_notes ? `## Notes manuelles\n\n${note.manual_notes}\n\n` : ''}
`;

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-reunion-${appointmentTitle?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || note.id}-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

