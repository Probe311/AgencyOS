import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Mail, Lock, User, ArrowLeft, CheckCircle2, AlertCircle, Hexagon, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordCriteria {
  label: string;
  met: boolean;
}

const calculatePasswordStrength = (password: string): { strength: PasswordStrength; score: number; criteria: PasswordCriteria[] } => {
  const criteria: PasswordCriteria[] = [
    { label: 'Au moins 8 caractères', met: password.length >= 8 },
    { label: 'Au moins 12 caractères', met: password.length >= 12 },
    { label: 'Une majuscule', met: /[A-Z]/.test(password) },
    { label: 'Une minuscule', met: /[a-z]/.test(password) },
    { label: 'Un chiffre', met: /[0-9]/.test(password) },
    { label: 'Un caractère spécial (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const score = criteria.filter(c => c.met).length;
  
  let strength: PasswordStrength = 'weak';
  if (score <= 2) strength = 'weak';
  else if (score <= 3) strength = 'fair';
  else if (score <= 4) strength = 'good';
  else strength = 'strong';

  return { strength, score, criteria };
};

export const Auth: React.FC = () => {
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  // Calculer la force du mot de passe
  const passwordStrength = useMemo(() => {
    if (!password || (mode !== 'signup' && mode !== 'reset')) {
      return null;
    }
    return calculatePasswordStrength(password);
  }, [password, mode]);

  // Vérifier si on est sur la page de reset password (avec token)
  useEffect(() => {
    if (!supabase) return;

    const checkResetToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        setMode('reset');
        // Nettoyer l'URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    checkResetToken();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message || 'Erreur lors de la connexion');
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (passwordStrength && passwordStrength.strength === 'weak') {
      setError('Le mot de passe est trop faible. Veuillez renforcer votre mot de passe.');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, name);

    if (error) {
      setError(error.message || 'Erreur lors de l\'inscription');
    } else {
      setSuccess('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
      setTimeout(() => {
        setMode('login');
        setEmail('');
        setPassword('');
        setName('');
        setConfirmPassword('');
      }, 3000);
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message || 'Erreur lors de l\'envoi de l\'email');
    } else {
      setSuccess('Un email de réinitialisation a été envoyé à votre adresse.');
      setTimeout(() => {
        setMode('login');
        setEmail('');
      }, 3000);
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (passwordStrength && passwordStrength.strength === 'weak') {
      setError('Le mot de passe est trop faible. Veuillez renforcer votre mot de passe.');
      return;
    }

    setLoading(true);

    const { error } = await updatePassword(password);

    if (error) {
      setError(error.message || 'Erreur lors de la réinitialisation du mot de passe');
    } else {
      setSuccess('Mot de passe réinitialisé avec succès !');
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }, 2000);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
    setShowPasswordStrength(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md">
        <Card className="p-8" variant="elevated" rounded="3xl">
          {/* Logo / Titre */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <Hexagon className="fill-white/90 group-hover:rotate-180 transition-all duration-500 relative z-10" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  AgencyOS
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {mode === 'login' && 'Connectez-vous à votre compte'}
                  {mode === 'signup' && 'Créez votre compte'}
                  {mode === 'forgot' && 'Réinitialisez votre mot de passe'}
                  {mode === 'reset' && 'Définissez un nouveau mot de passe'}
                </p>
              </div>
            </div>
          </div>

          {/* Messages d'erreur et de succès */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          )}

          {/* Formulaire Login */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />

              <Input
                label="Mot de passe"
                type="password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('forgot');
                  }}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={loading}
                className="mt-6"
              >
                Se connecter
              </Button>

              <div className="text-center pt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setMode('signup');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                  >
                    S'inscrire
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Formulaire Signup */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Input
                label="Nom complet"
                type="text"
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
                autoComplete="name"
              />

              <Input
                label="Email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />

              <div>
                <Input
                  label="Mot de passe"
                  type="password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setShowPasswordStrength(true);
                  }}
                  onFocus={() => setShowPasswordStrength(true)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                {showPasswordStrength && passwordStrength && (
                  <div className="mt-3 space-y-2">
                    {/* Barre de progression */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            passwordStrength.strength === 'weak'
                              ? 'bg-rose-500 w-1/4'
                              : passwordStrength.strength === 'fair'
                              ? 'bg-amber-500 w-2/4'
                              : passwordStrength.strength === 'good'
                              ? 'bg-blue-500 w-3/4'
                              : 'bg-emerald-500 w-full'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          passwordStrength.strength === 'weak'
                            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                            : passwordStrength.strength === 'fair'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : passwordStrength.strength === 'good'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {passwordStrength.strength === 'weak'
                          ? 'Faible'
                          : passwordStrength.strength === 'fair'
                          ? 'Moyen'
                          : passwordStrength.strength === 'good'
                          ? 'Bon'
                          : 'Fort'}
                      </span>
                    </div>
                    {/* Critères */}
                    <div className="space-y-1.5 pt-1">
                      {passwordStrength.criteria.map((criterion, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          {criterion.met ? (
                            <Check size={14} className="text-emerald-500 shrink-0" />
                          ) : (
                            <X size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span
                            className={
                              criterion.met
                                ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {criterion.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Confirmer le mot de passe"
                type="password"
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={loading}
                className="mt-6"
              >
                S'inscrire
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </button>
              </div>
            </form>
          )}

          {/* Formulaire Forgot Password */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              <Input
                label="Email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={loading}
                className="mt-6"
              >
                Envoyer l'email de réinitialisation
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </button>
              </div>
            </form>
          )}

          {/* Formulaire Reset Password */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Définissez un nouveau mot de passe pour votre compte.
              </p>

              <div>
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setShowPasswordStrength(true);
                  }}
                  onFocus={() => setShowPasswordStrength(true)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                {showPasswordStrength && passwordStrength && (
                  <div className="mt-3 space-y-2">
                    {/* Barre de progression */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            passwordStrength.strength === 'weak'
                              ? 'bg-rose-500 w-1/4'
                              : passwordStrength.strength === 'fair'
                              ? 'bg-amber-500 w-2/4'
                              : passwordStrength.strength === 'good'
                              ? 'bg-blue-500 w-3/4'
                              : 'bg-emerald-500 w-full'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          passwordStrength.strength === 'weak'
                            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                            : passwordStrength.strength === 'fair'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : passwordStrength.strength === 'good'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {passwordStrength.strength === 'weak'
                          ? 'Faible'
                          : passwordStrength.strength === 'fair'
                          ? 'Moyen'
                          : passwordStrength.strength === 'good'
                          ? 'Bon'
                          : 'Fort'}
                      </span>
                    </div>
                    {/* Critères */}
                    <div className="space-y-1.5 pt-1">
                      {passwordStrength.criteria.map((criterion, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          {criterion.met ? (
                            <Check size={14} className="text-emerald-500 shrink-0" />
                          ) : (
                            <X size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
                          )}
                          <span
                            className={
                              criterion.met
                                ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {criterion.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Confirmer le mot de passe"
                type="password"
                icon={Lock}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={loading}
                className="mt-6"
              >
                Réinitialiser le mot de passe
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMode('login');
                  }}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </button>
              </div>
            </form>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          © 2025 AgencyOS. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

