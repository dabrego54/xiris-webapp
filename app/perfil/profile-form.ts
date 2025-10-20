import { z } from "zod";

import { updateProfileSchema } from "@/lib/validations/auth.validation";

export const profileFormSchema = updateProfileSchema.extend({
  preferred_payment_method: z
    .union([z.literal(""), z.string().min(2, "Selecciona un método de pago.")])
    .optional(),
  twoFactorEnabled: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const defaultProfileValues: ProfileFormValues = {
  full_name: "",
  phone: "",
  avatar_url: "",
  address: "",
  specialties: [],
  service_areas: [],
  preferred_payment_method: "",
  twoFactorEnabled: false,
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
};
