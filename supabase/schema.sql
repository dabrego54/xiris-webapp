-- Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        WHERE t.typname = 'user_role'
          AND t.typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.user_role AS ENUM ('client', 'technician', 'admin');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Service matchmaking tables
CREATE TABLE IF NOT EXISTS public.service_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    assigned_technician_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'requested',
    problem_description text,
    location_lat double precision,
    location_lng double precision,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ensure post-match lifecycle columns exist for ongoing services
ALTER TABLE public.service_requests
    ADD COLUMN IF NOT EXISTS started_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS cancel_reason text NULL;

-- Document the expected service request statuses without altering existing values
COMMENT ON COLUMN public.service_requests.status IS 'Expected statuses include: requested, searching, candidate_ready, accepted, on_route, in_progress, completed, cancelled.';

CREATE TABLE IF NOT EXISTS public.technician_status (
    technician_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
    is_online boolean NOT NULL DEFAULT false,
    current_status text NOT NULL DEFAULT 'offline',
    current_lat double precision,
    current_lng double precision,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_request_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id uuid NOT NULL REFERENCES public.service_requests (id) ON DELETE CASCADE,
    technician_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Updated_at triggers for matchmaking tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_public_service_requests_updated_at'
          AND tgrelid = 'public.service_requests'::regclass
    ) THEN
        CREATE TRIGGER set_public_service_requests_updated_at
        BEFORE UPDATE ON public.service_requests
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_public_technician_status_updated_at'
          AND tgrelid = 'public.technician_status'::regclass
    ) THEN
        CREATE TRIGGER set_public_technician_status_updated_at
        BEFORE UPDATE ON public.technician_status
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_public_service_request_offers_updated_at'
          AND tgrelid = 'public.service_request_offers'::regclass
    ) THEN
        CREATE TRIGGER set_public_service_request_offers_updated_at
        BEFORE UPDATE ON public.service_request_offers
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on matchmaking tables
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_offers ENABLE ROW LEVEL SECURITY;

-- Policies for public.service_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'service_requests_client_select'
    ) THEN
        CREATE POLICY service_requests_client_select
            ON public.service_requests
            FOR SELECT
            USING (
                auth.uid() IS NOT NULL
                AND client_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'client'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'service_requests_client_insert'
    ) THEN
        CREATE POLICY service_requests_client_insert
            ON public.service_requests
            FOR INSERT
            WITH CHECK (
                auth.uid() IS NOT NULL
                AND client_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'client'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'service_requests_technician_select'
    ) THEN
        CREATE POLICY service_requests_technician_select
            ON public.service_requests
            FOR SELECT
            USING (
                auth.uid() IS NOT NULL
                AND assigned_technician_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'technician'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_requests' AND policyname = 'service_requests_admin_select'
    ) THEN
        CREATE POLICY service_requests_admin_select
            ON public.service_requests
            FOR SELECT
            USING (public.is_admin(auth.uid()));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Policies for public.technician_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_status' AND policyname = 'technician_status_select_self'
    ) THEN
        CREATE POLICY technician_status_select_self
            ON public.technician_status
            FOR SELECT
            USING (
                auth.uid() IS NOT NULL
                AND technician_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'technician'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_status' AND policyname = 'technician_status_insert_self'
    ) THEN
        CREATE POLICY technician_status_insert_self
            ON public.technician_status
            FOR INSERT
            WITH CHECK (
                auth.uid() IS NOT NULL
                AND technician_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'technician'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_status' AND policyname = 'technician_status_update_self'
    ) THEN
        CREATE POLICY technician_status_update_self
            ON public.technician_status
            FOR UPDATE
            USING (
                auth.uid() IS NOT NULL
                AND technician_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'technician'
                )
            )
            WITH CHECK (
                auth.uid() IS NOT NULL
                AND technician_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'technician'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_status' AND policyname = 'technician_status_admin_select'
    ) THEN
        CREATE POLICY technician_status_admin_select
            ON public.technician_status
            FOR SELECT
            USING (public.is_admin(auth.uid()));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Policies for public.service_request_offers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_request_offers' AND policyname = 'service_request_offers_select_self'
    ) THEN
        CREATE POLICY service_request_offers_select_self
            ON public.service_request_offers
            FOR SELECT
            USING (
                auth.uid() IS NOT NULL
                AND technician_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'technician'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_request_offers' AND policyname = 'service_request_offers_admin_select'
    ) THEN
        CREATE POLICY service_request_offers_admin_select
            ON public.service_request_offers
            FOR SELECT
            USING (public.is_admin(auth.uid()));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Storage bucket and policies for technician documents
INSERT INTO storage.buckets (id, name, public)
SELECT 'tech-docs', 'tech-docs', FALSE
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'tech-docs'
);

DO $rls_buckets$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'storage'
          AND c.relname = 'buckets'
          AND pg_catalog.pg_get_userbyid(c.relowner) = current_user
    ) THEN
        EXECUTE 'ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;';
    END IF;
END;
$rls_buckets$ LANGUAGE plpgsql;

DO $rls_objects$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'storage'
          AND c.relname = 'objects'
          AND pg_catalog.pg_get_userbyid(c.relowner) = current_user
    ) THEN
        EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;';
    END IF;
END;
$rls_objects$ LANGUAGE plpgsql;

DO $bucket_policy$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'buckets'
          AND policyname = 'tech_docs_bucket_select_admin'
    ) THEN
        CREATE POLICY tech_docs_bucket_select_admin
            ON storage.buckets
            FOR SELECT
            USING (
                id = 'tech-docs'
                AND public.is_admin(auth.uid())
            );
    END IF;
END;
$bucket_policy$ LANGUAGE plpgsql;

DO $policy$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'tech_docs_insert_owner_or_admin'
    ) THEN
        CREATE POLICY tech_docs_insert_owner_or_admin
            ON storage.objects
            FOR INSERT
            WITH CHECK (
                bucket_id = 'tech-docs'
                AND (
                    public.is_admin(auth.uid())
                    OR (
                        split_part(name, '/', 1) = 'applications'
                        AND split_part(name, '/', 2) <> ''
                        AND EXISTS (
                            SELECT 1
                            FROM public.technician_applications ta
                            WHERE ta.id::text = split_part(name, '/', 2)
                              AND ta.user_id = auth.uid()
                        )
                    )
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'tech_docs_select_owner_or_admin'
    ) THEN
        CREATE POLICY tech_docs_select_owner_or_admin
            ON storage.objects
            FOR SELECT
            USING (
                bucket_id = 'tech-docs'
                AND (
                    public.is_admin(auth.uid())
                    OR (
                        split_part(name, '/', 1) = 'applications'
                        AND split_part(name, '/', 2) <> ''
                        AND EXISTS (
                            SELECT 1
                            FROM public.technician_applications ta
                            WHERE ta.id::text = split_part(name, '/', 2)
                              AND ta.user_id = auth.uid()
                        )
                    )
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'tech_docs_delete_admin'
    ) THEN
        CREATE POLICY tech_docs_delete_admin
            ON storage.objects
            FOR DELETE
            USING (
                bucket_id = 'tech-docs'
                AND public.is_admin(auth.uid())
            );
    END IF;
END;
$policy$ LANGUAGE plpgsql;
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'technician';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        WHERE t.typname = 'application_status'
          AND t.typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.application_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected');
    END IF;
END;
$$ LANGUAGE plpgsql;
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'rejected';

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    full_name text,
    role public.user_role NOT NULL DEFAULT 'client',
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Technician applications table
CREATE TABLE IF NOT EXISTS public.technician_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    skills text[],
    experience text,
    cv_url text,
    certs_urls text[],
    status public.application_status NOT NULL DEFAULT 'submitted',
    reviewer_id uuid REFERENCES public.profiles (id),
    review_notes text,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id bigserial PRIMARY KEY,
    actor_id uuid REFERENCES public.profiles (id),
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS
$$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for public.profiles.updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_public_profiles_updated_at'
          AND tgrelid = 'public.profiles'::regclass
    ) THEN
        CREATE TRIGGER set_public_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for public.technician_applications.updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_public_technician_applications_updated_at'
          AND tgrelid = 'public.technician_applications'::regclass
    ) THEN
        CREATE TRIGGER set_public_technician_applications_updated_at
        BEFORE UPDATE ON public.technician_applications
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Automatic profile creation for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS
$$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
          AND tgrelid = 'auth.users'::regclass
    ) THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_applications ENABLE ROW LEVEL SECURITY;

-- Helper expression to determine if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin(current_user_id uuid)
RETURNS boolean AS
$$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = current_user_id
          AND p.role = 'admin'
    );
$$ LANGUAGE sql STABLE;

-- Policies for public.profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_self'
    ) THEN
        CREATE POLICY profiles_select_self
            ON public.profiles
            FOR SELECT
            USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_admin'
    ) THEN
        CREATE POLICY profiles_select_admin
            ON public.profiles
            FOR SELECT
            USING (public.is_admin(auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_admin_role_status'
    ) THEN
        CREATE POLICY profiles_update_admin_role_status
            ON public.profiles
            FOR UPDATE
            USING (public.is_admin(auth.uid()))
            WITH CHECK (public.is_admin(auth.uid()));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Policies for public.technician_applications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_applications' AND policyname = 'technician_applications_insert_auth'
    ) THEN
        CREATE POLICY technician_applications_insert_auth
            ON public.technician_applications
            FOR INSERT
            WITH CHECK (
                auth.role() = 'authenticated'
                AND (
                    user_id IS NULL
                    OR user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_applications' AND policyname = 'technician_applications_select_self_or_admin'
    ) THEN
        CREATE POLICY technician_applications_select_self_or_admin
            ON public.technician_applications
            FOR SELECT
            USING (
                (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR email = auth.email()))
                OR public.is_admin(auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_applications' AND policyname = 'technician_applications_update_self_submitted'
    ) THEN
        CREATE POLICY technician_applications_update_self_submitted
            ON public.technician_applications
            FOR UPDATE
            USING (
                auth.uid() IS NOT NULL
                AND (user_id = auth.uid() OR email = auth.email())
                AND status = 'submitted'
            )
            WITH CHECK (
                auth.uid() IS NOT NULL
                AND (user_id = auth.uid() OR email = auth.email())
                AND status = 'submitted'
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'technician_applications' AND policyname = 'technician_applications_update_admin'
    ) THEN
        CREATE POLICY technician_applications_update_admin
            ON public.technician_applications
            FOR UPDATE
            USING (public.is_admin(auth.uid()))
            WITH CHECK (public.is_admin(auth.uid()));
    END IF;
END;
$$ LANGUAGE plpgsql;
