/**
 * Utilitaires d'export de leads (CSV, JSON, Excel)
 */

import { exportToCSV as exportToCSVGeneric } from './export';
import { logError, logWarn } from './logger';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  filename?: string;
  includeHeaders?: boolean;
}

/**
 * Colonnes et labels pour l'export de leads
 */
const LEAD_COLUMNS = [
  'name', 'company', 'email', 'phone', 'address', 'website', 'linkedin',
  'stage', 'lifecycleStage', 'value', 'probability', 'source',
  'industry', 'company_size', 'description', 'ceo', 'creation_year',
  'google_rating', 'google_reviews_count', 'siret', 'trigger_event'
] as const;

const LEAD_COLUMN_LABELS: Record<string, string> = {
  name: 'Nom',
  company: 'Entreprise',
  email: 'Email',
  phone: 'Téléphone',
  address: 'Adresse',
  website: 'Site web',
  linkedin: 'LinkedIn',
  stage: 'Étape',
  lifecycleStage: 'Cycle de vie',
  value: 'Valeur (€)',
  probability: 'Probabilité (%)',
  source: 'Source',
  industry: 'Secteur',
  company_size: 'Taille entreprise',
  description: 'Description',
  ceo: 'CEO',
  creation_year: 'Année création',
  google_rating: 'Note Google',
  google_reviews_count: 'Nb avis Google',
  siret: 'SIRET',
  trigger_event: 'Événement déclencheur'
};

/**
 * Exporte des leads au format CSV
 */
export function exportToCSV(leads: any[], filename: string = 'leads_export.csv'): void {
  if (leads.length === 0) {
    throw new Error('Aucun lead à exporter');
  }

  // Utiliser la fonction générique avec colonnes spécialisées
  exportToCSVGeneric(leads, filename, LEAD_COLUMN_LABELS);
}

/**
 * Exporte des leads au format JSON
 */
export function exportToJSON(leads: any[], filename: string = 'leads_export.json'): void {
  if (leads.length === 0) {
    throw new Error('Aucun lead à exporter');
  }

  const jsonContent = JSON.stringify(leads, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Exporte des leads au format Excel (XLSX)
 * Note: Nécessite la bibliothèque xlsx ou une alternative
 */
export async function exportToExcel(leads: any[], filename: string = 'leads_export.xlsx'): Promise<void> {
  if (leads.length === 0) {
    throw new Error('Aucun lead à exporter');
  }

  try {
    // Essayer d'importer xlsx dynamiquement
    const XLSX = await import('xlsx');
    
    const columns = LEAD_COLUMNS as readonly string[];
    
    // Créer les données pour Excel
    const worksheetData = [
      columns.map(col => LEAD_COLUMN_LABELS[col] || col), // En-têtes
      ...leads.map(lead => {
        return columns.map(col => {
          let value = lead[col] || '';
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
              value = value.join('; ');
            } else {
              value = JSON.stringify(value);
            }
          }
          return value;
        });
      })
    ];

    // Créer le workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Générer le fichier
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    logError('Erreur export Excel:', error);
    // Fallback vers CSV si xlsx n'est pas disponible
    logWarn('Bibliothèque xlsx non disponible, export CSV à la place');
    exportToCSV(leads, filename.replace('.xlsx', '.csv'));
  }
}

/**
 * Exporte des leads selon le format demandé
 */
export async function exportLeads(leads: any[], options: ExportOptions): Promise<void> {
  const filename = options.filename || `leads_export_${new Date().toISOString().split('T')[0]}.${options.format}`;

  switch (options.format) {
    case 'csv':
      exportToCSV(leads, filename);
      break;
    case 'json':
      exportToJSON(leads, filename);
      break;
    case 'excel':
      await exportToExcel(leads, filename);
      break;
    default:
      throw new Error(`Format d'export non supporté: ${options.format}`);
  }
}

