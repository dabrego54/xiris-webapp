import type { PostgrestSingleResponse } from '@supabase/supabase-js';

/**
 * Placeholder Supabase database schema.
 *
 * Replace this type with the generated database types from Supabase when available.
 */
export type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
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
