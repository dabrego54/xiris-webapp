export const AUTH_REVALIDATE_PATHS = ['/', '/dashboard', '/perfil'] as const;

export type AuthRevalidatePath = (typeof AUTH_REVALIDATE_PATHS)[number];
