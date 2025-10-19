import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type {
  ClientProfile,
  Profile,
  TechnicianProfile,
} from '@/types/database.types';

type WithOptional<TSchema, TKeys extends keyof TSchema> = Omit<TSchema, TKeys> &
  Partial<Pick<TSchema, TKeys>>;

/**
 * Typed representation of the public schema in Supabase.
 */
export type SupabaseDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: WithOptional<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
        Relationships: [];
      };
      technician_profiles: {
        Row: TechnicianProfile;
        Insert: WithOptional<TechnicianProfile, 'created_at'>;
        Update: Partial<Omit<TechnicianProfile, 'id'>>;
        Relationships: [];
      };
      client_profiles: {
        Row: ClientProfile;
        Insert: WithOptional<ClientProfile, 'created_at'>;
        Update: Partial<Omit<ClientProfile, 'id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/**
 * Utility type that narrows the expected shape of PostgREST responses once
 * typed definitions are generated. Keeping it exported allows future
 * extensions without updating all imports.
 */
export type TypedPostgrestResponse<T> = PostgrestSingleResponse<T>;
