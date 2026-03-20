/**
 * Page de désabonnement
 * Accessible via lien unique avec token de sécurité
 * Permet le désabonnement partiel ou total
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, MessageSquare, Phone, AlertCircle } from 'lucide-react';
import { validateUnsubscribeToken, unsubscribeLead, reactivateLead } from '../lib/services/unsubscriptionService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
// Checkbox existe déjà, mais on va utiliser un input natif pour simplicité

export const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadInfo, setLeadInfo] = useState<{ leadId: string; email: string } | null>(null);

  const [preferences, setPreferences] = useState({
    emailMarketing: false,
    emailTransactional: false,
    sms: false,
    whatsApp: false,
  });

  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de désabonnement manquant ou invalide.');
      setValidating(false);
      setLoading(false);
      return;
    }

    // Valider le token
    validateUnsubscribeToken(token).then((result) => {
      if (result) {
        setLeadInfo(result);
        // Pré-remplir avec désabonnement total par défaut
        setPreferences({
          emailMarketing: true,
          emailTransactional: false, // Les emails transactionnels restent autorisés
          sms: true,
          whatsApp: true,
        });
      } else {
        setError('Token de désabonnement invalide ou expiré.');
      }
      setValidating(false);
      setLoading(false);
    });
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!leadInfo) return;

    setLoading(true);
    setError(null);

    try {
      await unsubscribeLead(leadInfo.leadId, preferences, {
        reason: reason || undefined,
        from: 'email',
        ipAddress: '', // Récupérer depuis les headers si disponible
        userAgent: navigator.userAgent,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du désabonnement.');
      setLoading(false);
    }
  };

  if (validating || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <Loader size={48} className="mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Chargement...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !leadInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Erreur</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Désabonnement réussi
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Vous avez été désabonné avec succès. Vous ne recevrez plus d'emails marketing.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
              Note : Vous continuerez à recevoir des emails transactionnels (devis, factures, confirmations) conformément à la réglementation.
            </p>
            <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Gérer vos préférences
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Vous pouvez vous désabonner des communications que vous ne souhaitez plus recevoir.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="emailMarketing"
              checked={preferences.emailMarketing}
              onChange={(e) => setPreferences({ ...preferences, emailMarketing: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-1"
            />
            <label htmlFor="emailMarketing" className="flex-1 cursor-pointer">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-900 dark:text-white">Emails marketing</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Newsletters, promotions, actualités
              </p>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="emailTransactional"
              checked={preferences.emailTransactional}
              onChange={(e) => setPreferences({ ...preferences, emailTransactional: e.target.checked })}
              disabled={true}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-1 opacity-50"
            />
            <label htmlFor="emailTransactional" className="flex-1 cursor-not-allowed opacity-60">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-900 dark:text-white">Emails transactionnels</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Devis, factures, confirmations (obligatoires)
              </p>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="sms"
              checked={preferences.sms}
              onChange={(e) => setPreferences({ ...preferences, sms: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-1"
            />
            <label htmlFor="sms" className="flex-1 cursor-pointer">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-900 dark:text-white">SMS</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Messages SMS marketing
              </p>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="whatsapp"
              checked={preferences.whatsApp}
              onChange={(e) => setPreferences({ ...preferences, whatsApp: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-1"
            />
            <label htmlFor="whatsapp" className="flex-1 cursor-pointer">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-900 dark:text-white">WhatsApp</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Messages WhatsApp marketing
              </p>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Raison du désabonnement (optionnel)
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">Sélectionner une raison</option>
            <option value="Trop d'emails">Trop d'emails</option>
            <option value="Pas intéressé">Pas intéressé</option>
            <option value="Contenu non pertinent">Contenu non pertinent</option>
            <option value="Jamais souscrit">Jamais souscrit</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Conformité RGPD</p>
              <p>Vos données sont protégées. Vous pouvez vous réabonner à tout moment depuis votre profil.</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleUnsubscribe}
          disabled={loading || !preferences.emailMarketing && !preferences.sms && !preferences.whatsApp}
          className="w-full"
        >
          Confirmer le désabonnement
        </Button>
      </Card>
    </div>
  );
};

