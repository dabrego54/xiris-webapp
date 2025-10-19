import { z } from 'zod';

/**
 * Regular expression that validates Chilean mobile numbers with spaces:
 * "+56 9 1234 5678".
 */
const CHILEAN_PHONE_REGEX = /^\+56\s9\s\d{4}\s\d{4}$/;

/**
 * Regular expression validating names with spaces and accented characters.
 */
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

/**
 * Collection of special characters required for strong password validation.
 */
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_\-+={}[\]|\\:;"'<>.,?/~`]/;

/**
 * Validates that the supplied password follows the platform strength rules.
 *
 * @example
 * isStrongPassword('ClaveSegura1!'); // true
 */
export const isStrongPassword = (password: string): boolean =>
  password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && SPECIAL_CHAR_REGEX.test(password);

/**
 * Checks whether the provided phone matches the Chilean mobile format.
 *
 * @example
 * isChileanPhone('+56 9 8765 4321'); // true
 */
export const isChileanPhone = (phone: string): boolean => CHILEAN_PHONE_REGEX.test(phone);

/**
 * Ensures the name contains only alphabetic characters (including accents) and spaces.
 *
 * @example
 * isValidName('María López'); // true
 */
export const isValidName = (name: string): boolean => NAME_REGEX.test(name.trim());

/**
 * Schema used during user registration.
 *
 * @example
 * signUpSchema.parse({
 *   email: 'persona@xiris.com',
 *   password: 'ClaveSegura1!',
 *   confirmPassword: 'ClaveSegura1!',
 *   full_name: 'Juan Pérez',
 *   phone: '+56 9 1234 5678',
 *   user_type: 'cliente',
 *   terms: true,
 * });
 */
export const signUpSchema = z
  .object({
    email: z
      .string({ required_error: 'El correo electrónico es obligatorio.' })
      .email('Ingresa un correo electrónico válido.'),
    password: z
      .string({ required_error: 'La contraseña es obligatoria.' })
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .refine(isStrongPassword, {
        message: 'La contraseña debe incluir una mayúscula, un número y un caracter especial.',
      }),
    confirmPassword: z.string({ required_error: 'Debes confirmar tu contraseña.' }),
    full_name: z
      .string({ required_error: 'Tu nombre completo es obligatorio.' })
      .min(3, 'El nombre debe tener al menos 3 caracteres.')
      .refine(isValidName, {
        message: 'El nombre solo puede contener letras y espacios.',
      }),
    phone: z
      .string()
      .optional()
      .refine((value) => !value || isChileanPhone(value), {
        message: 'Ingresa un número con el formato +56 9 XXXX XXXX.',
      }),
    user_type: z.enum(['cliente', 'tecnico'], {
      required_error: 'Debes seleccionar un tipo de usuario.',
      invalid_type_error: 'Selecciona un tipo de usuario válido.',
    }),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'Debes aceptar los términos y condiciones.' }),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

/**
 * Schema validating user login credentials.
 *
 * @example
 * signInSchema.parse({ email: 'persona@xiris.com', password: 'ClaveSegura1!' });
 */
export const signInSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio.' })
    .email('Ingresa un correo electrónico válido.'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria.' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

/**
 * Schema for validating profile updates from both clients and technicians.
 *
 * @example
 * updateProfileSchema.parse({
 *   full_name: 'Ana Díaz',
 *   specialties: ['Electricidad'],
 *   service_areas: ['Santiago Centro'],
 * });
 */
export const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .min(3, 'El nombre debe tener al menos 3 caracteres.')
      .refine(isValidName, {
        message: 'El nombre solo puede contener letras y espacios.',
      })
      .optional(),
    phone: z
      .string()
      .refine(isChileanPhone, { message: 'Ingresa un número con el formato +56 9 XXXX XXXX.' })
      .optional(),
    avatar_url: z
      .string()
      .url('Ingresa una URL válida para tu avatar.')
      .optional(),
    address: z.string().min(3, 'La dirección debe tener al menos 3 caracteres.').optional(),
    specialties: z
      .array(
        z
          .string()
          .min(1, 'Cada especialidad debe tener al menos 1 carácter.')
          .max(60, 'Cada especialidad debe tener menos de 60 caracteres.')
      )
      .max(20, 'Puedes registrar hasta 20 especialidades.')
      .optional(),
    service_areas: z
      .array(
        z
          .string()
          .min(1, 'Cada zona de servicio debe tener al menos 1 carácter.')
          .max(60, 'Cada zona de servicio debe tener menos de 60 caracteres.')
      )
      .max(30, 'Puedes registrar hasta 30 zonas de servicio.')
      .optional(),
  })
  .strict();

/**
 * Schema for validating password reset requests.
 *
 * @example
 * passwordResetSchema.parse({ email: 'persona@xiris.com' });
 */
export const passwordResetSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio.' })
    .email('Ingresa un correo electrónico válido.'),
});

/**
 * Schema for validating password updates performed by authenticated users.
 *
 * @example
 * updatePasswordSchema.parse({ password: 'ClaveSegura1!', confirmPassword: 'ClaveSegura1!' });
 */
export const updatePasswordSchema = z
  .object({
    password: z
      .string({ required_error: 'La contraseña es obligatoria.' })
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .refine(isStrongPassword, {
        message: 'La contraseña debe incluir una mayúscula, un número y un caracter especial.',
      }),
    confirmPassword: z.string({ required_error: 'Debes confirmar tu contraseña.' }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

export type SignUpSchema = z.infer<typeof signUpSchema>;
export type SignInSchema = z.infer<typeof signInSchema>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
export type PasswordResetSchema = z.infer<typeof passwordResetSchema>;
export type UpdatePasswordSchema = z.infer<typeof updatePasswordSchema>;

