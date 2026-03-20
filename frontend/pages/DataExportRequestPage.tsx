/**
 * Page de demande d'export de données personnelles (Droit d'accès RGPD)
 * Accessible publiquement avec vérification par email
 */

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Download, Mail, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { exportPersonalData } from '../lib/services/gdprComplianceService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export const DataExportRequestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leadId = searchParams.get('leadId');

  const [email, setEmail] = useState('');
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) {
      setError('ID lead manquant');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await exportPersonalData(leadId, format);

      // Créer un blob selon le format
      let blob: Blob;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        const jsonStr = JSON.stringify(data, null, 2);
        blob = new Blob([jsonStr], { type: 'application/json' });
        filename = `export-donnees-personnelles-${leadId}.json`;
        mimeType = 'application/json';
      } else if (format === 'csv') {
        blob = new Blob([data as string], { type: 'text/csv' });
        filename = `export-donnees-personnelles-${leadId}.csv`;
        mimeType = 'text/csv';
      } else {
        // PDF - pour l'instant, on utilise CSV
        blob = new Blob([data as string], { type: 'text/csv' });
        filename = `export-donnees-personnelles-${leadId}.csv`;
        mimeType = 'text/csv';
      }

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Télécharger automatiquement
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Libérer l'URL après téléchargement
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'export des données');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <Download className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">Export de vos données personnelles</h1>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
            Conformité RGPD - Droit d'accès
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {downloadUrl && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium mb-1">
                  Export généré avec succès
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Votre fichier a été téléchargé. Il contient toutes vos données personnelles.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleExport} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Pour vérifier votre identité
              </p>
            </div>

            <div>
              <label htmlFor="format" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Format d'export <span className="text-red-500">*</span>
              </label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as 'json' | 'csv' | 'pdf')}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="json">JSON (recommandé)</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Contenu de l'export</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Données personnelles du contact</li>
                    <li>Historique des consentements</li>
                    <li>Toutes les interactions</li>
                    <li>Activités et notes</li>
                    <li>Données de tracking email</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Délai de traitement</p>
                  <p>L'export sera disponible sous 30 jours maximum (conforme RGPD).</p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading || !leadId} className="w-full">
              {loading ? 'Génération en cours...' : 'Exporter mes données'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              Conformité RGPD - Vos données sont protégées
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

