"use server";

import { revalidatePath } from 'next/cache';
import { z, type ZodIssue } from 'zod';
import {
  AuthApiError,
  type AuthError,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

import { AUTH_REVALIDATE_PATHS } from '@/app/actions/auth.config';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseDatabase } from '@/lib/supabase/types';
import type {
  AvailabilityStatus,
  DatabaseProfile,
  SignInData,
  SignUpData,
  UpdateProfileData,
  UserStatus,
  UserType,
} from '@/types/database.types';

const DEFAULT_ERROR_MESSAGE = 'Ocurrió un error inesperado. Inténtalo nuevamente.';
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

const USER_STATUS_VALUES = new Set<UserStatus>([
  'active',
  'inactive',
  'suspended',
  'pending_verification',
]);

const AVAILABILITY_STATUS_VALUES = new Set<AvailabilityStatus>(['online', 'offline', 'busy']);

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const result = value
      .map((item) => (typeof item === 'string' ? item.trim() : null))
      .filter((item): item is string => Boolean(item && item.length > 0));

    return result.length > 0 ? result : [];
  }

  if (typeof value === 'string') {
    const result = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return result.length > 0 ? result : [];
  }

  return undefined;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalised = value.toLowerCase();
    if (normalised === 'true') {
      return true;
    }

    if (normalised === 'false') {
      return false;
    }
  }

  return fallback;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

function toUserStatus(value: unknown): UserStatus {
  if (typeof value === 'string' && USER_STATUS_VALUES.has(value as UserStatus)) {
    return value as UserStatus;
  }

  return 'active';
}

function toAvailabilityStatus(value: unknown): AvailabilityStatus {
  if (typeof value === 'string' && AVAILABILITY_STATUS_VALUES.has(value as AvailabilityStatus)) {
    return value as AvailabilityStatus;
  }

  return 'offline';
}

function toLocation(
  value: unknown,
): { lat: number; lng: number } | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const [rawLat, rawLng] = value.split(',').map((item) => item.trim());
    const lat = Number.parseFloat(rawLat ?? '');
    const lng = Number.parseFloat(rawLng ?? '');

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  }

  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const lat = toNumber(record.lat, Number.NaN);
  const lng = toNumber(record.lng, Number.NaN);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}

function buildProfileFromUser(user: User): DatabaseProfile {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const createdAt = user.created_at ?? new Date().toISOString();
  const updatedAt = user.updated_at ?? createdAt;

  const fullName =
    toStringOrNull(metadata.full_name) ??
    toStringOrNull(metadata.fullName) ??
    toStringOrNull(metadata.name) ??
    toStringOrNull((user.app_metadata?.full_name as string | undefined) ?? null);

  const phone =
    toStringOrNull(metadata.phone) ??
    toStringOrNull(metadata.phone_number) ??
    toStringOrNull(metadata.telefono) ??
    toStringOrNull((user.app_metadata?.phone as string | undefined) ?? null);

  const avatarUrl =
    toStringOrNull(metadata.avatar_url) ??
    toStringOrNull(metadata.avatarUrl) ??
    toStringOrNull(metadata.avatar) ??
    null;

  const rawUserType =
    (metadata.user_type ?? metadata.userType ?? metadata.role ?? user.app_metadata?.user_type) as UserType | undefined;

  const clientMetadata =
    toRecord(metadata.client_profile) ??
    toRecord(metadata.clientProfile) ??
    toRecord(metadata.client);

  const address =
    toStringOrNull(clientMetadata?.address) ??
    toStringOrNull(metadata.address) ??
    null;

  const preferredPaymentMethod =
    toStringOrNull(clientMetadata?.preferred_payment_method) ??
    toStringOrNull(metadata.preferred_payment_method) ??
    toStringOrNull(metadata.payment_method) ??
    toStringOrNull(metadata.paymentMethod) ??
    null;

  const totalRequests = toNumber(clientMetadata?.total_requests ?? metadata.total_requests, 0);

  const technicianMetadata =
    toRecord(metadata.technician_profile) ??
    toRecord(metadata.technicianProfile) ??
    toRecord(metadata.technician);

  const specialties =
    toStringArray(technicianMetadata?.specialties ?? metadata.specialties) ??
    (rawUserType === 'tecnico' ? [] : undefined);
  const serviceAreas =
    toStringArray(technicianMetadata?.service_areas ?? metadata.service_areas ?? metadata.serviceAreas) ??
    (rawUserType === 'tecnico' ? [] : undefined);
  const rating = toNumber(technicianMetadata?.rating ?? metadata.rating, 0);
  const totalServices = toNumber(
    technicianMetadata?.total_services ?? metadata.total_services ?? metadata.totalServices,
    0,
  );
  const isVerified = toBoolean(technicianMetadata?.is_verified ?? metadata.is_verified ?? metadata.isVerified, false);
  const verificationDocuments =
    (toRecord(technicianMetadata?.verification_documents ?? metadata.verification_documents) as Record<
      string,
      unknown
    > | null) ?? {};
  const availabilityStatus = toAvailabilityStatus(
    technicianMetadata?.availability_status ?? metadata.availability_status ?? metadata.availabilityStatus,
  );
  const currentLocation = toLocation(
    technicianMetadata?.current_location ??
      metadata.current_location ??
      metadata.location ??
      metadata.currentLocation,
  );

  const technicianCreatedAt =
    toStringOrNull(
      technicianMetadata?.created_at ??
        metadata.technician_profile_created_at ??
        metadata.technicianCreatedAt ??
        metadata.technician_profile_createdAt,
    ) ?? createdAt;

  const clientCreatedAt =
    toStringOrNull(
      clientMetadata?.created_at ??
        metadata.client_profile_created_at ??
        metadata.clientCreatedAt ??
        metadata.client_profile_createdAt,
    ) ?? createdAt;

  const userType = rawUserType ?? 'cliente';

  const profile: DatabaseProfile = {
    id: user.id,
    email: user.email ?? '',
    full_name: fullName,
    phone,
    avatar_url: avatarUrl,
    user_type: userType,
    status: toUserStatus(metadata.status),
    created_at: createdAt,
    updated_at: updatedAt,
  };

  if (address !== null || preferredPaymentMethod !== null || totalRequests > 0) {
    profile.client_profile = {
      id: user.id,
      address,
      preferred_payment_method: preferredPaymentMethod,
      total_requests: totalRequests,
      created_at: clientCreatedAt,
    };
  }

  const hasTechnicianData =
    (specialties && specialties.length > 0) ||
    (serviceAreas && serviceAreas.length > 0) ||
    rating > 0 ||
    totalServices > 0 ||
    isVerified ||
    Object.keys(verificationDocuments).length > 0 ||
    currentLocation !== null;

  if (userType === 'tecnico' || hasTechnicianData) {
    profile.technician_profile = {
      id: user.id,
      specialties: specialties ?? [],
      service_areas: serviceAreas ?? [],
      rating,
      total_services: totalServices,
      is_verified: isVerified,
      verification_documents: verificationDocuments,
      availability_status: availabilityStatus,
      current_location: currentLocation,
      created_at: technicianCreatedAt,
    };
  }

  return profile;
}

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
    if (error.code === 'PGRST205') {
      console.warn('La tabla profiles no está disponible. Se utilizará la metadata del usuario.', error);
      return null;
    }

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
interface GoogleOAuthParams {
  flow: 'login' | 'register';
  userType: UserType;
  redirectTo?: string;
}

export async function signInWithGoogle({
  flow,
  userType,
  redirectTo,
}: GoogleOAuthParams): Promise<ActionResult<string | null>> {
  const supabase = await createClient();

  try {
    const callbackUrl = new URL(resolveSiteUrl('/auth/callback'));
    callbackUrl.searchParams.set('flow', flow);
    callbackUrl.searchParams.set('user_type', userType);

    if (redirectTo) {
      callbackUrl.searchParams.set('redirect_to', redirectTo);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const hydratedProfile = profile ?? buildProfileFromUser(user);

  return { user, profile: hydratedProfile };
}

/**
 * Actualiza los datos del perfil, incluyendo las tablas específicas de cliente o técnico.
 */
export async function updateProfile(
  profileData: UpdateProfileData
): Promise<ActionResult<DatabaseProfile | null>> {
  const supabase = await createClient();

  try {
    const parsed = profileUpdateSchema.parse(profileData);
    const metadataUpdates: Record<string, unknown> = {};
    let shouldPersistMetadata = false;

    if (parsed.profile) {
      const { error } = await supabase
        .from('profiles')
        .update({ ...parsed.profile, updated_at: new Date().toISOString() })
        .eq('id', parsed.id);

      if (error) {
        if (error.code === 'PGRST205') {
          shouldPersistMetadata = true;

          if ('full_name' in parsed.profile) {
            metadataUpdates.full_name = parsed.profile.full_name ?? null;
          }

          if ('phone' in parsed.profile) {
            metadataUpdates.phone = parsed.profile.phone ?? null;
          }

          if ('avatar_url' in parsed.profile) {
            metadataUpdates.avatar_url = parsed.profile.avatar_url ?? null;
          }

          if ('status' in parsed.profile && parsed.profile.status) {
            metadataUpdates.status = parsed.profile.status;
          }
        } else {
          console.error('Error al actualizar la tabla profiles.', error);
          return { data: null, error: error.message };
        }
      }
    }

    if (parsed.technician_profile) {
      const { error } = await supabase
        .from('technician_profiles')
        .upsert({ id: parsed.id, ...parsed.technician_profile }, { onConflict: 'id' });

      if (error) {
        if (error.code === 'PGRST205') {
          shouldPersistMetadata = true;
          const currentTechnicianMetadata = (metadataUpdates.technician_profile as Record<string, unknown> | undefined) ?? {};

          Object.assign(currentTechnicianMetadata, parsed.technician_profile);
          currentTechnicianMetadata.id = parsed.id;
          metadataUpdates.technician_profile = currentTechnicianMetadata;
        } else {
          console.error('Error al actualizar la tabla technician_profiles.', error);
          return { data: null, error: error.message };
        }
      }
    }

    if (parsed.client_profile) {
      const { error } = await supabase
        .from('client_profiles')
        .upsert({ id: parsed.id, ...parsed.client_profile }, { onConflict: 'id' });

      if (error) {
        if (error.code === 'PGRST205') {
          shouldPersistMetadata = true;
          const currentClientMetadata = (metadataUpdates.client_profile as Record<string, unknown> | undefined) ?? {};

          Object.assign(currentClientMetadata, parsed.client_profile);
          currentClientMetadata.id = parsed.id;
          metadataUpdates.client_profile = currentClientMetadata;
        } else {
          console.error('Error al actualizar la tabla client_profiles.', error);
          return { data: null, error: error.message };
        }
      }
    }

    if (shouldPersistMetadata) {
      const { error: metadataError } = await supabase.auth.updateUser({ data: metadataUpdates });

      if (metadataError) {
        console.error('Error al actualizar la metadata del usuario.', metadataError);
        return { data: null, error: metadataError.message };
      }
    }

    let updatedProfile = await fetchProfile(supabase, parsed.id);

    if (!updatedProfile) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('No se pudo refrescar el usuario tras actualizar el perfil.', userError);
      }

      if (user) {
        updatedProfile = buildProfileFromUser(user);
      }
    }

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
