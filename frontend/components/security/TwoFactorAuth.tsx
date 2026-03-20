import React, { useState, useEffect } from 'react';
import { Shield, QrCode, Key, Copy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { use2FA } from '../../lib/supabase/hooks/use2FA';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../../lib/hooks/useRole';
import { check2FARequirement } from '../../lib/services/twoFactorPolicyService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { User2FA } from '../../types';

interface TwoFactorAuthProps {
  userId: string;
  userEmail: string;
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ userId, userEmail }) => {
  const {
    get2FA,
    generateSecret,
    enable2FA,
    disable2FA,
    generateBackupCodes,
  } = use2FA();

  const { showToast, users } = useApp();
  const { user } = useAuth();
  const { role: userRole } = useRole();
  const [twoFA, setTwoFA] = useState<User2FA | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isBackupCodesModalOpen, setIsBackupCodesModalOpen] = useState(false);
  const [secret, setSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [policyRequirement, setPolicyRequirement] = useState<{
    required: boolean;
    message?: string;
    gracePeriodEnds?: string;
  } | null>(null);

  useEffect(() => {
    load2FA();
    checkPolicyRequirement();
  }, [userId, userRole]);

  const load2FA = async () => {
    setLoading(true);
    try {
      const data = await get2FA(userId);
      setTwoFA(data);
    } catch (error) {
      console.error('Error loading 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPolicyRequirement = async () => {
    if (!userRole) return;
    try {
      const requirement = await check2FARequirement(userId, userRole);
      setPolicyRequirement(requirement);
    } catch (error) {
      console.error('Error checking 2FA policy requirement:', error);
    }
  };

  const handleStartSetup = async () => {
    try {
      const { secret: newSecret, qrCodeUrl: newQrCodeUrl } = await generateSecret(userId, userEmail);
      setSecret(newSecret);
      setQrCodeUrl(newQrCodeUrl);
      setIsSetupModalOpen(true);
    } catch (error) {
      showToast('Erreur lors de la génération du secret', 'error');
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      showToast('Code invalide (6 chiffres requis)', 'error');
      return;
    }

    try {
      const { backupCodes: codes } = await enable2FA(userId, secret, verificationCode);
      setBackupCodes(codes);
      setIsSetupModalOpen(false);
      setIsBackupCodesModalOpen(true);
      await load2FA();
      showToast('2FA activé avec succès', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de l\'activation', 'error');
    }
  };

  const handleDisable = async () => {
    try {
      await disable2FA(userId);
      await load2FA();
      setIsDisableModalOpen(false);
      showToast('2FA désactivé', 'success');
    } catch (error) {
      showToast('Erreur lors de la désactivation', 'error');
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      const codes = await generateBackupCodes(userId);
      setBackupCodes(codes);
      setIsBackupCodesModalOpen(true);
      showToast('Nouveaux codes de secours générés', 'success');
    } catch (error) {
      showToast('Erreur lors de la génération', 'error');
    }
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-slate-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-[30px] shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <Shield size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Authentification à deux facteurs</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sécurisez votre compte avec un code supplémentaire
              </p>
            </div>
          </div>
          {twoFA?.enabled ? (
            <Badge className="bg-emerald-100 text-emerald-700">
              <CheckCircle size={14} className="mr-1" />
              Activé
            </Badge>
          ) : (
            <Badge variant="outline">
              <XCircle size={14} className="mr-1" />
              Désactivé
            </Badge>
          )}
        </div>

        {twoFA?.enabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="font-bold text-emerald-900 dark:text-emerald-100">
                  Votre compte est protégé par 2FA
                </span>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Méthode : {twoFA.method === 'totp' ? "Application d'authentification (TOTP)" : twoFA.method}
              </p>
              {twoFA.lastUsedAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Dernière utilisation : {new Date(twoFA.lastUsedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Codes de secours disponibles
                  </span>
                  {twoFA.backupCodes && twoFA.backupCodes.length > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {twoFA.backupCodes.length} codes
                    </Badge>
                  )}
                </div>
                {twoFA.backupCodes && twoFA.backupCodes.length > 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Vous avez {twoFA.backupCodes.length} code{twoFA.backupCodes.length > 1 ? 's' : ''} de secours disponible{twoFA.backupCodes.length > 1 ? 's' : ''}.
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Aucun code de secours disponible. Régénérez-en pour sécuriser votre compte.
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  icon={Key}
                  onClick={handleGenerateBackupCodes}
                >
                  {twoFA.backupCodes && twoFA.backupCodes.length > 0 
                    ? 'Régénérer codes de secours' 
                    : 'Générer codes de secours'}
                </Button>
                <Button
                  variant="outline"
                  icon={XCircle}
                  onClick={() => setIsDisableModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Désactiver 2FA
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {policyRequirement?.required && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <span className="font-bold text-rose-900 dark:text-rose-100">
                    2FA requis pour votre rôle
                  </span>
                </div>
                <p className="text-sm text-rose-700 dark:text-rose-300 mb-2">
                  {policyRequirement.message || 'L\'authentification à deux facteurs est obligatoire pour votre rôle.'}
                </p>
                {policyRequirement.gracePeriodEnds && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Période de grâce jusqu'au {new Date(policyRequirement.gracePeriodEnds).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            )}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <span className="font-bold text-amber-900 dark:text-amber-100">
                  Votre compte n'est pas protégé par 2FA
                </span>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Activez l'authentification à deux facteurs pour renforcer la sécurité de votre compte.
              </p>
            </div>

            <Button 
              icon={Shield} 
              onClick={handleStartSetup}
              variant={policyRequirement?.required ? 'primary' : 'secondary'}
            >
              {policyRequirement?.required ? 'Activer 2FA (requis)' : 'Activer 2FA'}
            </Button>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
          setVerificationCode('');
        }}
        title="Configurer l'authentification à deux facteurs"
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              1. Scannez ce code QR avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </p>
            {qrCodeUrl && (
              <div className="flex justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg mb-4">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Code secret (manuel) :</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-slate-900 dark:text-white flex-1 break-all">
                  {secret}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Copy}
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    showToast('Code secret copié', 'success');
                  }}
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleEnable} className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                2. Entrez le code à 6 chiffres généré par votre application
              </p>
              <Input
                label="Code de vérification"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsSetupModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Activer</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        isOpen={isBackupCodesModalOpen}
        onClose={() => setIsBackupCodesModalOpen(false)}
        title="Codes de secours"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              <strong>Important :</strong> Enregistrez ces codes dans un endroit sûr. Vous pouvez les utiliser pour
              accéder à votre compte si vous perdez votre appareil d'authentification.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Chaque code ne peut être utilisé qu'une seule fois.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            {backupCodes.map((code, index) => (
              <code key={index} className="text-sm font-mono text-slate-900 dark:text-white text-center py-2">
                {code}
              </code>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" icon={Copy} onClick={copyBackupCodes}>
              {copied ? 'Copié !' : 'Copier tous les codes'}
            </Button>
            <Button onClick={() => setIsBackupCodesModalOpen(false)}>J'ai enregistré les codes</Button>
          </div>
        </div>
      </Modal>

      {/* Disable Modal */}
      <Modal
        isOpen={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        title="Désactiver l'authentification à deux facteurs"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
            <p className="text-sm text-rose-700 dark:text-rose-300">
              Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs ? Votre compte sera moins sécurisé.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsDisableModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleDisable}>
              Désactiver 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

