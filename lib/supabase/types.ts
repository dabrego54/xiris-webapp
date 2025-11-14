import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type {
  ClientProfile,
  Profile,
  ServiceRequest,
  ServiceRequestOffer,
  TechnicianApplication,
  TechnicianPresenceStatus,
  TechnicianProfile,
  TechnicianStatus,
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
      technician_applications: {
        Row: TechnicianApplication;
        Insert: WithOptional<
          TechnicianApplication,
          | 'id'
          | 'user_id'
          | 'full_name'
          | 'phone'
          | 'skills'
          | 'experience'
          | 'cv_url'
          | 'certs_urls'
          | 'status'
          | 'reviewer_id'
          | 'review_notes'
          | 'reviewed_at'
          | 'created_at'
          | 'updated_at'
        >;
        Update: Partial<Omit<TechnicianApplication, 'id'>>;
        Relationships: [];
      };
      technician_status: {
        Row: TechnicianStatus;
        Insert: WithOptional<
          TechnicianStatus,
          'is_online' | 'current_status' | 'current_lat' | 'current_lng' | 'updated_at'
        >;
        Update: Partial<
          Omit<TechnicianStatus, 'technician_id'> & { current_status?: TechnicianPresenceStatus }
        >;
        Relationships: [];
      };
      service_requests: {
        Row: ServiceRequest;
        Insert: WithOptional<
          ServiceRequest,
          | 'id'
          | 'assigned_technician_id'
          | 'status'
          | 'problem_description'
          | 'location_lat'
          | 'location_lng'
          | 'created_at'
          | 'updated_at'
        >;
        Update: Partial<Omit<ServiceRequest, 'id'>>;
        Relationships: [];
      };
      service_request_offers: {
        Row: ServiceRequestOffer;
        Insert: WithOptional<
          ServiceRequestOffer,
          'id' | 'status' | 'expires_at' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Omit<ServiceRequestOffer, 'id'>>;
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
