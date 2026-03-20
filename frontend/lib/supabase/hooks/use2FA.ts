import { useCallback } from 'react';
import { User2FA, User2FASession } from '../../../types';
import { supabase, isSupabaseConfigured } from '../../supabase';
import { SupabaseUser2FA, SupabaseUser2FASession } from '../types';
import { authenticator } from 'otplib';
import TableExistsCache from '../utils/tableExistsCache';

interface Use2FAReturn {
  get2FA: (userId: string) => Promise<User2FA | null>;
  generateSecret: (userId: string, email: string) => Promise<{ secret: string; qrCodeUrl: string }>;
  enable2FA: (userId: string, secret: string, code: string) => Promise<{ backupCodes: string[] }>;
  disable2FA: (userId: string) => Promise<void>;
  verify2FA: (userId: string, code: string) => Promise<boolean>;
  verifyBackupCode: (userId: string, code: string) => Promise<boolean>;
  generateBackupCodes: (userId: string) => Promise<string[]>;
  create2FASession: (userId: string, sessionToken: string, expiresInHours?: number) => Promise<User2FASession | null>;
  verify2FASession: (sessionToken: string) => Promise<boolean>;
  revoke2FASession: (sessionToken: string) => Promise<void>;
}

export const use2FA = (): Use2FAReturn => {
  const get2FA = useCallback(async (userId: string): Promise<User2FA | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    // Vérifier si la table existe avant de faire la requête
    if (TableExistsCache.shouldSkipQuery('user_2fa')) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('user_2fa')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // PGRST116 = no rows returned (normal, pas d'erreur)
        if (error.code === 'PGRST116') {
          return null;
        }
        // Si la table n'existe pas, mémoriser et retourner null
        if (TableExistsCache.handleTableError('user_2fa', error)) {
          return null;
        }
        throw error;
      }

      // Si la requête réussit, mémoriser que la table existe
      TableExistsCache.setTableExists('user_2fa');

      if (data) {
        const u2fa = data as SupabaseUser2FA;
        return {
          id: u2fa.id,
          userId: u2fa.user_id,
          enabled: u2fa.enabled,
          secret: u2fa.secret || undefined,
          backupCodes: u2fa.backup_codes || undefined,
          method: u2fa.method as User2FA['method'],
          phoneNumber: u2fa.phone_number || undefined,
          lastUsedAt: u2fa.last_used_at || undefined,
          createdAt: u2fa.created_at,
          updatedAt: u2fa.updated_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error fetching 2FA:', err);
      return null;
    }
  }, []);

  const generateSecret = useCallback(async (
    userId: string,
    email: string
  ): Promise<{ secret: string; qrCodeUrl: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    // Generate TOTP secret
    const secret = authenticator.generateSecret();
    const serviceName = 'AgencyOS';
    const otpAuthUrl = authenticator.keyuri(email, serviceName, secret);

    // Vérifier si la table existe avant de faire la requête
    if (TableExistsCache.shouldSkipQuery('user_2fa')) {
      // Table n'existe pas, retourner quand même le secret et QR code
      return { secret, qrCodeUrl: `otpauth://totp/${encodeURIComponent(serviceName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(serviceName)}` };
    }

    // Store secret temporarily (not enabled yet)
    const { data: existing, error: checkError } = await supabase
      .from('user_2fa')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      if (TableExistsCache.handleTableError('user_2fa', checkError)) {
        // Table n'existe pas, retourner quand même le secret et QR code
        return { secret, qrCodeUrl: `otpauth://totp/${encodeURIComponent(serviceName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(serviceName)}` };
      }
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('user_2fa')
        .update({ secret })
        .eq('user_id', userId);
      
      if (updateError && !TableExistsCache.handleTableError('user_2fa', updateError)) {
        throw updateError;
      }
      if (!updateError) TableExistsCache.setTableExists('user_2fa');
    } else {
      const { error: insertError } = await supabase
        .from('user_2fa')
        .insert({
          user_id: userId,
          secret,
          enabled: false,
        });
      
      if (insertError && !TableExistsCache.handleTableError('user_2fa', insertError)) {
        throw insertError;
      }
      if (!insertError) TableExistsCache.setTableExists('user_2fa');
    }

    // Generate QR code URL (using a QR code service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;

    return { secret, qrCodeUrl };
  }, []);

  const enable2FA = useCallback(async (
    userId: string,
    secret: string,
    code: string
  ): Promise<{ backupCodes: string[] }> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    // Verify the code
    const isValid = authenticator.check(code, secret);
    if (!isValid) {
      throw new Error('Code invalide');
    }

    // Generate backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // Vérifier si la table existe avant de faire la requête
    if (TableExistsCache.shouldSkipQuery('user_2fa')) {
      throw new Error('La table user_2fa n\'existe pas dans la base de données');
    }

    // Enable 2FA
    const { error } = await supabase
      .from('user_2fa')
      .update({
        enabled: true,
        secret,
        backup_codes: backupCodes,
      })
      .eq('user_id', userId);

    if (error) {
      if (TableExistsCache.handleTableError('user_2fa', error)) {
        throw new Error('La table user_2fa n\'existe pas dans la base de données');
      }
      throw error;
    }

    TableExistsCache.setTableExists('user_2fa');

    return { backupCodes };
  }, []);

  const disable2FA = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_2fa')) {
        return; // Table n'existe pas, rien à faire
      }

      const { error } = await supabase
        .from('user_2fa')
        .update({
          enabled: false,
          secret: null,
          backup_codes: null,
        })
        .eq('user_id', userId);

      if (error) {
        if (TableExistsCache.handleTableError('user_2fa', error)) {
          return; // Table n'existe pas, rien à faire
        }
        throw error;
      }

      TableExistsCache.setTableExists('user_2fa');
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      throw err;
    }
  }, []);

  const verify2FA = useCallback(async (userId: string, code: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) {
      return false;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_2fa')) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_2fa')
        .select('secret')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single();

      if (error) {
        if (TableExistsCache.handleTableError('user_2fa', error)) {
          return false;
        }
        return false;
      }

      if (!data || !data.secret) return false;

      TableExistsCache.setTableExists('user_2fa');

      const isValid = authenticator.check(code, data.secret);

      if (isValid) {
        // Update last_used_at
        const { error: updateError } = await supabase
          .from('user_2fa')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', userId);
        
        if (updateError) {
          TableExistsCache.handleTableError('user_2fa', updateError);
        }
      }

      return isValid;
    } catch (err) {
      console.error('Error verifying 2FA:', err);
      return false;
    }
  }, []);

  const verifyBackupCode = useCallback(async (userId: string, code: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) {
      return false;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_2fa')) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_2fa')
        .select('backup_codes')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single();

      if (error) {
        if (TableExistsCache.handleTableError('user_2fa', error)) {
          return false;
        }
        return false;
      }

      if (!data || !data.backup_codes) return false;

      TableExistsCache.setTableExists('user_2fa');

      const codes = data.backup_codes as string[];
      const index = codes.indexOf(code);

      if (index === -1) return false;

      // Remove used backup code
      const updatedCodes = codes.filter((_, i) => i !== index);
      const { error: updateError } = await supabase
        .from('user_2fa')
        .update({ backup_codes: updatedCodes })
        .eq('user_id', userId);

      if (updateError) {
        TableExistsCache.handleTableError('user_2fa', updateError);
      }

      return true;
    } catch (err) {
      console.error('Error verifying backup code:', err);
      return false;
    }
  }, []);

  const generateBackupCodes = useCallback(async (userId: string): Promise<string[]> => {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }

    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_2fa')) {
        return backupCodes; // Retourner les codes même si la table n'existe pas
      }

      const { error } = await supabase
        .from('user_2fa')
        .update({ backup_codes: backupCodes })
        .eq('user_id', userId);

      if (error) {
        if (TableExistsCache.handleTableError('user_2fa', error)) {
          return backupCodes; // Retourner les codes même si la table n'existe pas
        }
        throw error;
      }

      TableExistsCache.setTableExists('user_2fa');
      return backupCodes;
    } catch (err) {
      console.error('Error generating backup codes:', err);
      throw err;
    }
  }, []);

  const create2FASession = useCallback(async (
    userId: string,
    sessionToken: string,
    expiresInHours = 24
  ): Promise<User2FASession | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      if (TableExistsCache.shouldSkipQuery('user_2fa_sessions')) {
        // Table n'existe pas, retourner null
        return null;
      }

      const { data, error } = await supabase
        .from('user_2fa_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (TableExistsCache.handleTableError('user_2fa_sessions', error)) {
          return null; // Table n'existe pas
        }
        throw error;
      }

      TableExistsCache.setTableExists('user_2fa_sessions');

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          sessionToken: data.session_token,
          verifiedAt: data.verified_at,
          expiresAt: data.expires_at,
          ipAddress: data.ip_address || undefined,
          userAgent: data.user_agent || undefined,
          createdAt: data.created_at,
        };
      }
      return null;
    } catch (err) {
      console.error('Error creating 2FA session:', err);
      return null;
    }
  }, []);

  const verify2FASession = useCallback(async (sessionToken: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !supabase) {
      return false;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_2fa_sessions')) {
        return false;
      }

      const { data, error } = await supabase
        .from('user_2fa_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (TableExistsCache.handleTableError('user_2fa_sessions', error)) {
          return false;
        }
        return false;
      }

      if (!data) return false;

      TableExistsCache.setTableExists('user_2fa_sessions');

      return true;
    } catch (err) {
      console.error('Error verifying 2FA session:', err);
      return false;
    }
  }, []);

  const revoke2FASession = useCallback(async (sessionToken: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      if (TableExistsCache.shouldSkipQuery('user_2fa_sessions')) {
        return; // Table n'existe pas, rien à faire
      }

      const { error } = await supabase
        .from('user_2fa_sessions')
        .delete()
        .eq('session_token', sessionToken);

      if (error) {
        TableExistsCache.handleTableError('user_2fa_sessions', error);
      } else {
        TableExistsCache.setTableExists('user_2fa_sessions');
      }
    } catch (err) {
      console.error('Error revoking 2FA session:', err);
    }
  }, []);

  return {
    get2FA,
    generateSecret,
    enable2FA,
    disable2FA,
    verify2FA,
    verifyBackupCode,
    generateBackupCodes,
    create2FASession,
    verify2FASession,
    revoke2FASession,
  };
};

