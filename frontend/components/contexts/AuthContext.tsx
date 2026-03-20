import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { isSuperAdmin, SUPERADMIN_UUID } from '../../lib/config/roles';
import { getUserAvatar } from '../../lib/utils/avatar';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Initialise automatiquement le rôle SuperAdmin pour l'utilisateur spécifié
 */
const initializeSuperAdmin = async (userId: string) => {
  if (!supabase || !SUPERADMIN_UUID) return;

  try {
    // Vérifier si l'utilisateur existe déjà dans la table users
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, ce qui est OK pour une première initialisation
      console.error('Erreur lors de la vérification de l\'utilisateur:', fetchError);
      return;
    }

    // Si l'utilisateur existe mais n'a pas le rôle SuperAdmin, le mettre à jour
    // Note: Si la contrainte CHECK ne permet pas "SuperAdmin", on utilise "Admin" comme fallback
    // Le rôle SuperAdmin est géré logiquement via l'UUID, pas nécessairement stocké en DB
    if (existingUser && existingUser.role !== 'SuperAdmin' && existingUser.role !== 'Admin') {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'SuperAdmin' })
        .eq('id', userId);

      if (updateError) {
        // Si c'est une erreur de contrainte CHECK (23514), utiliser "Admin" comme fallback
        if (updateError.code === '23514' || updateError.message?.includes('check constraint')) {
          const { error: fallbackError } = await supabase
            .from('users')
            .update({ role: 'Admin' })
            .eq('id', userId);
          
          if (fallbackError) {
            console.error('Erreur lors de la mise à jour du rôle Admin (fallback):', fallbackError);
          }
        } else {
          console.error('Erreur lors de la mise à jour du rôle SuperAdmin:', updateError);
        }
      }
    } else if (!existingUser) {
      // Si l'utilisateur n'existe pas, récupérer ses infos depuis Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
            role: 'SuperAdmin',
            avatar_url: getUserAvatar(authUser.email),
          }, {
            onConflict: 'id'
          });

        if (insertError) {
          // Si c'est une erreur de contrainte CHECK, utiliser "Admin" comme fallback
          if (insertError.code === '23514' || insertError.message?.includes('check constraint')) {
            const { error: fallbackError } = await supabase
              .from('users')
              .upsert({
                id: authUser.id,
                email: authUser.email!,
                name: authUser.user_metadata?.name || authUser.email!.split('@')[0],
                role: 'Admin',
                avatar_url: getUserAvatar(authUser.email),
              }, {
                onConflict: 'id'
              });
            
            if (fallbackError) {
              console.error('Erreur lors de la création du profil Admin (fallback):', fallbackError);
            }
          } else {
            console.error('Erreur lors de la création du profil SuperAdmin:', insertError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du SuperAdmin:', error);
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Récupérer la session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Ne pas bloquer l'auth pour l'initialisation du superadmin
      setLoading(false);
      
      // Initialiser automatiquement le superadmin en arrière-plan
      if (session?.user && isSuperAdmin(session.user.id)) {
        initializeSuperAdmin(session.user.id).catch(err => {
          console.error('Erreur lors de l\'initialisation du SuperAdmin:', err);
        });
      }
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Ne pas bloquer l'auth pour l'initialisation du superadmin
      setLoading(false);
      
      // Initialiser automatiquement le superadmin en arrière-plan
      if (session?.user && isSuperAdmin(session.user.id)) {
        initializeSuperAdmin(session.user.id).catch(err => {
          console.error('Erreur lors de l\'initialisation du SuperAdmin:', err);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase non configuré', status: 500 } as AuthError };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase non configuré', status: 500 } as AuthError };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
      },
    });

    // Si l'inscription réussit, créer l'utilisateur dans la table users
    if (data.user && !error) {
      const { error: dbError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email!,
          name: name || data.user.email!.split('@')[0],
          role: 'Lecteur',
          avatar_url: getUserAvatar(data.user.email),
        }, {
          onConflict: 'id'
        });

      if (dbError) {
        console.error('Erreur lors de la création du profil utilisateur:', dbError);
      }
    }

    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase non configuré', status: 500 } as AuthError };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase non configuré', status: 500 } as AuthError };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

