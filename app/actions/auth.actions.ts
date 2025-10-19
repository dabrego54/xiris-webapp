'use server';

import { revalidatePath } from 'next/cache';
import { z, type ZodIssue } from 'zod';
import {
  AuthApiError,
  type AuthError,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import type { SupabaseDatabase } from '@/lib/supabase/types';
import type {
  DatabaseProfile,
  SignInData,
  SignUpData,
  UpdateProfileData,
} from '@/types/database.types';

const DEFAULT_ERROR_MESSAGE = 'Ocurrió un error inesperado. Inténtalo nuevamente.';
const AUTH_REVALIDATE_PATHS = ['/', '/dashboard', '/perfil'];

const signUpSchema = z.object({
  email: z.string({ required_error: 'El correo es obligatorio.' }).email('Ingresa un correo válido.'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  full_name: z
    .string()
    .min(1, 'El nombre no puede estar vacío.')
    .max(150, 'El nombre es demasiado largo.')
    .optional()
    .nullable(),
  phone: z
    .string()
    .min(7, 'El teléfono debe tener al menos 7 dígitos.')
    .max(20, 'El teléfono es demasiado largo.')
    .optional()
    .nullable(),
  user_type: z.enum(['cliente', 'tecnico'], {
    required_error: 'Selecciona un tipo de usuario.',
  }),
  metadata: z.record(z.unknown()).optional(),
});

const signInSchema = z.object({
  email: z.string({ required_error: 'El correo es obligatorio.' }).email('Ingresa un correo válido.'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const emailSchema = z
  .string({ required_error: 'El correo es obligatorio.' })
  .email('Ingresa un correo válido.');

const passwordSchema = z
  .string({ required_error: 'La contraseña es obligatoria.' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres.');

const profileUpdateSchema = z
  .object({
    id: z.string({ required_error: 'El identificador del perfil es obligatorio.' }).uuid('El identificador no es válido.'),
    profile: z
      .object({
        full_name: z
          .string()
          .min(1, 'El nombre no puede estar vacío.')
          .max(150, 'El nombre es demasiado largo.')
          .optional()
          .nullable(),
        phone: z
          .string()
          .min(7, 'El teléfono debe tener al menos 7 dígitos.')
          .max(20, 'El teléfono es demasiado largo.')
          .optional()
          .nullable(),
        avatar_url: z.string().url('La URL del avatar no es válida.').optional().nullable(),
        status: z
          .enum(['active', 'inactive', 'suspended', 'pending_verification'])
          .optional(),
      })
      .optional(),
    technician_profile: z
      .object({
        specialties: z.array(z.string()).min(1, 'Incluye al menos una especialidad.').optional(),
        service_areas: z.array(z.string()).min(1, 'Incluye al menos un área de servicio.').optional(),
        rating: z.number().min(0).max(5).optional(),
        total_services: z.number().min(0).optional(),
        is_verified: z.boolean().optional(),
        verification_documents: z.record(z.unknown()).optional(),
        availability_status: z.enum(['online', 'offline', 'busy']).optional(),
        current_location: z
          .object({
            lat: z.number(),
            lng: z.number(),
          })
          .nullable()
          .optional(),
      })
      .optional(),
    client_profile: z
      .object({
        address: z.string().max(255).optional().nullable(),
        preferred_payment_method: z.string().max(100).optional().nullable(),
        total_requests: z.number().min(0).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    const hasProfileData = value.profile
      ? Object.values(value.profile).some((field) => field !== undefined)
      : false;
    const hasTechnicianData = value.technician_profile
      ? Object.values(value.technician_profile).some((field) => field !== undefined)
      : false;
    const hasClientData = value.client_profile
      ? Object.values(value.client_profile).some((field) => field !== undefined)
      : false;

    if (!hasProfileData && !hasTechnicianData && !hasClientData) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe proporcionar al menos un campo para actualizar.',
        path: ['profile'],
      });
    }
  });

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

const FAILURE_MESSAGES: Record<string, string> = {
  EMAIL_IN_USE: 'El correo ya está registrado. Inicia sesión o utiliza otro correo.',
  WEAK_PASSWORD: 'La contraseña es demasiado débil. Intenta con una contraseña más segura.',
  INVALID_CREDENTIALS: 'Credenciales inválidas. Verifica tu correo y contraseña.',
};

interface ActionResult<TData> {
  data: TData;
  error: string | null;
}

type SupabaseServerClient = SupabaseClient<SupabaseDatabase>;

function resolveSiteUrl(path: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    return new URL(path, baseUrl).toString();
  } catch (error) {
    console.error('Configuración de URL inválida para la aplicación.', error);
    return new URL(path, 'http://localhost:3000').toString();
  }
}

function normaliseZodError(issues: ZodIssue[]): string {
  return issues.map((issue) => issue.message).join(' ');
}

function mapAuthError(error: AuthError | null): string {
  if (!error) {
    return DEFAULT_ERROR_MESSAGE;
  }

  if (error instanceof AuthApiError) {
    if (error.status === 422) {
      return FAILURE_MESSAGES.EMAIL_IN_USE;
    }

    if (error.status === 400 && error.message.toLowerCase().includes('password')) {
      return FAILURE_MESSAGES.WEAK_PASSWORD;
    }

    if (error.status === 400 && error.message.toLowerCase().includes('invalid login credentials')) {
      return FAILURE_MESSAGES.INVALID_CREDENTIALS;
    }
  }

  return error.message || DEFAULT_ERROR_MESSAGE;
}

async function fetchProfile(
  supabase: SupabaseServerClient,
  profileId: string
): Promise<DatabaseProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    console.error('No se pudo obtener el perfil.', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    technician_profile: data.technician_profile ?? undefined,
    client_profile: data.client_profile ?? undefined,
  } satisfies DatabaseProfile;
}

function revalidateAuthPaths(): void {
  for (const path of AUTH_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

/**
 * Registra un nuevo usuario en Supabase Auth y persiste metadata personalizada.
 */
export async function signUp(data: SignUpData): Promise<ActionResult<User | null>> {
  const supabase = createClient();

  try {
    const parsed = signUpSchema.parse(data);

    const { data: result, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: {
          ...parsed.metadata,
          user_type: parsed.user_type,
          full_name: parsed.full_name ?? undefined,
          phone: parsed.phone ?? undefined,
        },
        emailRedirectTo: resolveSiteUrl('/auth/callback'),
      },
    });

    if (error) {
      const message = mapAuthError(error);
      console.error('Fallo el registro de usuario en Supabase.', error);
      return { data: null, error: message };
    }

    revalidateAuthPaths();

    return { data: result.user, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error: normaliseZodError(error.issues) };
    }

    console.error('Error inesperado durante el registro de usuario.', error);
    return { data: null, error: DEFAULT_ERROR_MESSAGE };
  }
}

/**
 * Autentica al usuario utilizando correo y contraseña.
 */
export async function signIn(email: string, password: string): Promise<ActionResult<Session | null>> {
  const supabase = createClient();

  try {
    const parsed = signInSchema.parse({ email, password } satisfies SignInData);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      const message = mapAuthError(error);
      console.error('Inicio de sesión fallido.', error);
      return { data: null, error: message };
    }

    // Fuerza la sincronización de cookies en la respuesta del server action.
    await supabase.auth.getSession();

    revalidateAuthPaths();

    return { data: data.session, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error: normaliseZodError(error.issues) };
    }

    console.error('Error inesperado durante el inicio de sesión.', error);
    return { data: null, error: DEFAULT_ERROR_MESSAGE };
  }
}

/**
 * Solicita a Supabase el enlace de autenticación de Google.
 */
export async function signInWithGoogle(): Promise<ActionResult<string | null>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: resolveSiteUrl('/auth/callback'),
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      const message = mapAuthError(error);
      console.error('Error al generar el enlace de Google OAuth.', error);
      return { data: null, error: message };
    }

    return { data: data?.url ?? null, error: null };
  } catch (error) {
    console.error('Error inesperado al iniciar OAuth con Google.', error);
    return { data: null, error: DEFAULT_ERROR_MESSAGE };
  }
}

/**
 * Cierra la sesión actual y limpia las cookies de autenticación.
 */
export async function signOut(): Promise<ActionResult<boolean>> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error al cerrar sesión.', error);
    return { data: false, error: error.message };
  }

  revalidateAuthPaths();

  return { data: true, error: null };
}

/**
 * Envía un correo para restablecer la contraseña del usuario.
 */
export async function resetPassword(email: string): Promise<ActionResult<boolean>> {
  const supabase = createClient();

  try {
    const parsedEmail = emailSchema.parse(email);

    const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail, {
      redirectTo: resolveSiteUrl('/auth/update-password'),
    });

    if (error) {
      console.error('Error al solicitar el restablecimiento de contraseña.', error);
      return { data: false, error: mapAuthError(error) };
    }

    return { data: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: false, error: normaliseZodError(error.issues) };
    }

    console.error('Error inesperado al solicitar el restablecimiento de contraseña.', error);
    return { data: false, error: DEFAULT_ERROR_MESSAGE };
  }
}

/**
 * Actualiza la contraseña del usuario autenticado.
 */
export async function updatePassword(newPassword: string): Promise<ActionResult<boolean>> {
  const supabase = createClient();

  try {
    const parsedPassword = passwordSchema.parse(newPassword);
    const { error } = await supabase.auth.updateUser({ password: parsedPassword });

    if (error) {
      console.error('Error al actualizar la contraseña.', error);
      return { data: false, error: mapAuthError(error) };
    }

    revalidateAuthPaths();

    return { data: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: false, error: normaliseZodError(error.issues) };
    }

    console.error('Error inesperado al actualizar la contraseña.', error);
    return { data: false, error: DEFAULT_ERROR_MESSAGE };
  }
}

export type CurrentUserResult = { user: User; profile: DatabaseProfile | null } | null;

/**
 * Recupera la sesión actual junto con el perfil extendido desde la base de datos.
 */
export async function getCurrentUser(): Promise<CurrentUserResult> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('No se pudo obtener el usuario actual.', error);
    return null;
  }

  if (!user) {
    return null;
  }

  const profile = await fetchProfile(supabase, user.id);

  return { user, profile };
}

/**
 * Actualiza los datos del perfil, incluyendo las tablas específicas de cliente o técnico.
 */
export async function updateProfile(
  profileData: UpdateProfileData
): Promise<ActionResult<DatabaseProfile | null>> {
  const supabase = createClient();

  try {
    const parsed = profileUpdateSchema.parse(profileData);

    if (parsed.profile) {
      const { error } = await supabase
        .from('profiles')
        .update({ ...parsed.profile, updated_at: new Date().toISOString() })
        .eq('id', parsed.id);

      if (error) {
        console.error('Error al actualizar la tabla profiles.', error);
        return { data: null, error: error.message };
      }
    }

    if (parsed.technician_profile) {
      const { error } = await supabase
        .from('technician_profiles')
        .upsert({ id: parsed.id, ...parsed.technician_profile }, { onConflict: 'id' });

      if (error) {
        console.error('Error al actualizar la tabla technician_profiles.', error);
        return { data: null, error: error.message };
      }
    }

    if (parsed.client_profile) {
      const { error } = await supabase
        .from('client_profiles')
        .upsert({ id: parsed.id, ...parsed.client_profile }, { onConflict: 'id' });

      if (error) {
        console.error('Error al actualizar la tabla client_profiles.', error);
        return { data: null, error: error.message };
      }
    }

    const updatedProfile = await fetchProfile(supabase, parsed.id);

    revalidateAuthPaths();

    return { data: updatedProfile, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error: normaliseZodError(error.issues) };
    }

    console.error('Error inesperado al actualizar el perfil.', error);
    return { data: null, error: DEFAULT_ERROR_MESSAGE };
  }
}
