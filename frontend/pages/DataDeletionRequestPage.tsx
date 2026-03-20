/**
 * Page de demande de suppression de données (Droit à l'oubli RGPD)
 * Accessible publiquement avec vérification par email
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, XCircle, Mail, Lock, FileText, Clock } from 'lucide-react';
import {
  createDataDeletionRequest,
  verifyDeletionRequest,
  processDataDeletion,
} from '../lib/services/gdprComplianceService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';

export const DataDeletionRequestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get('request');
  const token = searchParams.get('token');

  const [step, setStep] = useState<'request' | 'verify' | 'processing' | 'completed'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Formulaire de demande
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [keepLegalData, setKeepLegalData] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    // Si on a un request ID et token, on est sur l'étape de vérification
    if (requestId && token) {
      setStep('verify');
    }
  }, [requestId, token]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const request = await createDataDeletionRequest(email, undefined, {
        ipAddress: await getClientIP(),
        reason,
        keepLegalData,
      });

      setSuccess(true);
      // Rediriger vers la page de vérification
      navigate(`/gdpr/deletion?request=${request.id}&token=${request.verificationToken}`);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !verificationCode) return;

    setLoading(true);
    setError(null);

    try {
      const verified = await verifyDeletionRequest(requestId, verificationCode);
      if (verified) {
        setStep('processing');
        // Traiter immédiatement la suppression
        await processDataDeletion(requestId, {
          keepLegalData,
        });
        setStep('completed');
        setSuccess(true);
      } else {
        setError('Code de vérification invalide');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <Lock className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">Demande de suppression de données</h1>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
            Conformité RGPD - Droit à l'oubli
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && step === 'completed' && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium mb-1">
                  Données supprimées avec succès
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Vos données personnelles ont été supprimées conformément à votre demande.
                  Une confirmation vous a été envoyée par email.
                </p>
              </div>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleSubmitRequest} className="space-y-6">
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
                  Vous recevrez un code de vérification à cette adresse
                </p>
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Raison (optionnel)
                </label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Je ne souhaite plus recevoir de communications..."
                  rows={4}
                />
              </div>

              <div className="flex items-start space-x-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <input
                  type="checkbox"
                  id="keepLegalData"
                  checked={keepLegalData}
                  onChange={(e) => setKeepLegalData(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2 mt-1"
                />
                <label htmlFor="keepLegalData" className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                  Conserver les données légales (factures, contrats)
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Certaines données peuvent être conservées pour des raisons légales (comptabilité, contrats).
                    Cochez cette case si vous souhaitez conserver ces données.
                  </span>
                </label>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Délai de traitement</p>
                    <p>Votre demande sera traitée sous 48 heures maximum (conforme RGPD).</p>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Envoi en cours...' : 'Demander la suppression'}
              </Button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center mb-6">
                <Mail className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Vérification de votre demande</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Un code de vérification a été envoyé à votre adresse email.
                  Veuillez le saisir ci-dessous pour confirmer votre demande.
                </p>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Code de vérification <span className="text-red-500">*</span>
                </label>
                <Input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  placeholder="Entrez le code reçu par email"
                  maxLength={50}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Vérification...' : 'Vérifier et confirmer la suppression'}
              </Button>
            </form>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-xl font-semibold mb-2">Traitement en cours</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Vos données sont en cours de suppression...
              </p>
            </div>
          )}

          {step === 'completed' && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Suppression terminée</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Vos données personnelles ont été supprimées avec succès.
              </p>
              <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
            </div>
          )}

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

