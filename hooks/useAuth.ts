import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PostgrestError, Session, User as AuthUser } from '@supabase/supabase-js';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { DatabaseProfile, SignUpData, UpdateProfileData } from '@/types/database.types';

interface AuthOperationResult {
  error: string | null;
}

const PROFILE_SELECT = `
  id,
  email,
  full_name,
  phone,
  avatar_url,
  user_type,
  status,
  created_at,
  updated_at,
  technician_profile:technician_profiles(*),
  client_profile:client_profiles(*)
`;

/**
 * Hook que encapsula la lógica de autenticación del cliente utilizando Supabase.
 *
 * Provee utilidades para iniciar/cerrar sesión, sincronizar el perfil y reaccionar
 * en tiempo real a los cambios de autenticación.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<DatabaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const isMountedRef = useRef(true);
  const profileCacheRef = useRef<Map<string, DatabaseProfile | null>>(new Map());

  /**
   * Obtiene el perfil desde la base de datos aplicando una caché local para evitar
   * lecturas redundantes.
   */
  const fetchProfile = useCallback(
    async (profileId: string, forceRefresh = false): Promise<DatabaseProfile | null> => {
      if (!forceRefresh && profileCacheRef.current.has(profileId)) {
        return profileCacheRef.current.get(profileId) ?? null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', profileId)
        .maybeSingle<DatabaseProfile>();

      if (error) {
        console.error('No se pudo obtener el perfil del usuario.', error);
        return null;
      }

      profileCacheRef.current.set(profileId, data ?? null);
      return data ?? null;
    },
    [supabase]
  );

  /**
   * Sincroniza el estado local con la sesión recibida.
   */
  const syncSession = useCallback(
    async (session: Session | null, { forceProfileRefresh = false } = {}): Promise<void> => {
      if (!isMountedRef.current) {
        return;
      }

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (!sessionUser) {
        profileCacheRef.current.clear();
        setProfile(null);
        return;
      }

      const userProfile = await fetchProfile(sessionUser.id, forceProfileRefresh);

      if (!isMountedRef.current) {
        return;
      }

      setProfile(userProfile);
    },
    [fetchProfile]
  );

  /**
   * Refresca la sesión actual forzando la recarga del perfil asociado.
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('No se pudo obtener la sesión actual.', error);
        return;
      }

      await syncSession(data.session, { forceProfileRefresh: true });
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, syncSession]);

  useEffect(() => {
    isMountedRef.current = true;

    const initialise = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error al inicializar la sesión del usuario.', error);
          return;
        }

        await syncSession(data.session);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    void initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoading(true);
      void syncSession(session).finally(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, syncSession]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthOperationResult> => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Error al iniciar sesión.', error);
          return { error: error.message };
        }

        await syncSession(data.session, { forceProfileRefresh: true });
        return { error: null };
      } catch (error) {
        console.error('Fallo inesperado al iniciar sesión.', error);
        return {
          error: error instanceof Error ? error.message : 'Error desconocido al iniciar sesión.',
        };
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [supabase, syncSession]
  );

  const signUp = useCallback(
    async (data: SignUpData): Promise<AuthOperationResult> => {
      setIsLoading(true);
      try {
        const { email, password, full_name, phone, user_type, metadata } = data;
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: full_name ?? null,
              phone: phone ?? null,
              user_type,
              ...metadata,
            },
          },
        });

        if (error) {
          console.error('Error al registrar al usuario.', error);
          return { error: error.message };
        }

        await syncSession(signUpData.session, { forceProfileRefresh: true });
        return { error: null };
      } catch (error) {
        console.error('Fallo inesperado durante el registro.', error);
        return {
          error:
            error instanceof Error ? error.message : 'Error desconocido durante el registro.',
        };
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [supabase, syncSession]
  );

  const signOut = useCallback(async (): Promise<AuthOperationResult> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error al cerrar sesión.', error);
        return { error: error.message };
      }

      profileCacheRef.current.clear();
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (error) {
      console.error('Fallo inesperado al cerrar sesión.', error);
      return {
        error: error instanceof Error ? error.message : 'Error desconocido al cerrar sesión.',
      };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<AuthOperationResult> => {
      if (!user) {
        return { error: 'No hay un usuario autenticado.' };
      }

      if (data.id !== user.id) {
        return { error: 'El perfil proporcionado no pertenece al usuario actual.' };
      }

      setIsLoading(true);

      try {
        type UpdateResponse = { error: PostgrestError | null };
        const updates: Array<Promise<UpdateResponse>> = [];

        if (data.profile && Object.keys(data.profile).length > 0) {
          updates.push(
            supabase
              .from('profiles')
              .update(data.profile)
              .eq('id', data.id)
          );
        }

        if (data.technician_profile && Object.keys(data.technician_profile).length > 0) {
          updates.push(
            supabase
              .from('technician_profiles')
              .update(data.technician_profile)
              .eq('id', data.id)
          );
        }

        if (data.client_profile && Object.keys(data.client_profile).length > 0) {
          updates.push(
            supabase
              .from('client_profiles')
              .update(data.client_profile)
              .eq('id', data.id)
          );
        }

        if (updates.length === 0) {
          return { error: null };
        }

        const responses = await Promise.all(updates);

        const failedResponse = responses.find((response) => response.error !== null);

        if (failedResponse?.error) {
          const message = failedResponse.error.message ?? 'No se pudo actualizar el perfil.';
          console.error('Error al actualizar el perfil.', failedResponse.error);
          return { error: message };
        }

        profileCacheRef.current.delete(data.id);
        await refreshUser();
        return { error: null };
      } catch (error) {
        console.error('Fallo inesperado al actualizar el perfil.', error);
        return {
          error:
            error instanceof Error ? error.message : 'Error desconocido al actualizar el perfil.',
        };
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [refreshUser, supabase, user]
  );

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    userType: profile?.user_type ?? null,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  };
}
