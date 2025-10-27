import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.8";

type Decision = "approved" | "rejected";

type ApproveApplicationPayload = {
  applicationId: string;
  decision: Decision;
  reviewNotes?: string;
};

type ApplicationRecord = {
  id: string;
  user_id: string | null;
  email: string;
};

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const getEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

type AuthResult = {
  reviewerId: string;
};

const authenticateRequest = async (
  req: Request,
  client: ReturnType<typeof createClient>,
): Promise<AuthResult> => {
  const adminServiceSecret = Deno.env.get("ADMIN_SERVICE_SECRET");
  const serviceHeader = req.headers.get("x-admin-service");

  if (adminServiceSecret && serviceHeader === adminServiceSecret) {
    const reviewerId = req.headers.get("x-reviewer-id");
    if (!reviewerId) {
      throw jsonResponse(
        { error: "Missing x-reviewer-id header for service invocation" },
        { status: 400 },
      );
    }
    return { reviewerId };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    throw jsonResponse({ error: "Missing or invalid Authorization header" }, {
      status: 401,
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw jsonResponse({ error: "Missing access token" }, { status: 401 });
  }

  const {
    data: userData,
    error: userError,
  } = await client.auth.getUser(token);
  if (userError || !userData?.user) {
    throw jsonResponse({ error: "Failed to authenticate user" }, { status: 401 });
  }

  const reviewerId = userData.user.id;
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, role")
    .eq("id", reviewerId)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching reviewer profile", profileError.message);
    throw jsonResponse({ error: "Unable to verify reviewer profile" }, {
      status: 500,
    });
  }

  if (!profile || profile.role !== "admin") {
    throw jsonResponse({ error: "Reviewer is not authorized" }, { status: 403 });
  }

  return { reviewerId };
};

const validatePayload = (payload: unknown): ApproveApplicationPayload => {
  if (typeof payload !== "object" || payload === null) {
    throw jsonResponse({ error: "Invalid request body" }, { status: 400 });
  }

  const { applicationId, decision, reviewNotes } =
    payload as ApproveApplicationPayload;

  if (typeof applicationId !== "string" || applicationId.length === 0) {
    throw jsonResponse({ error: "applicationId is required" }, { status: 400 });
  }

  if (decision !== "approved" && decision !== "rejected") {
    throw jsonResponse({ error: "decision must be 'approved' or 'rejected'" }, {
      status: 400,
    });
  }

  if (reviewNotes !== undefined && typeof reviewNotes !== "string") {
    throw jsonResponse({ error: "reviewNotes must be a string" }, { status: 400 });
  }

  return { applicationId, decision, reviewNotes };
};

const fetchApplication = async (
  client: ReturnType<typeof createClient>,
  applicationId: string,
): Promise<ApplicationRecord> => {
  const { data, error } = await client
    .from("technician_applications")
    .select("id, user_id, email")
    .eq("id", applicationId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching application", error.message);
    throw jsonResponse({ error: "Failed to fetch application" }, { status: 500 });
  }

  if (!data) {
    throw jsonResponse({ error: "Application not found" }, { status: 404 });
  }

  return data as ApplicationRecord;
};

const ensureTechnicianUser = async (
  client: ReturnType<typeof createClient>,
  application: ApplicationRecord,
): Promise<string> => {
  let userId = application.user_id;

  if (!userId) {
    if (!application.email) {
      throw jsonResponse({ error: "Application is missing applicant email" }, {
        status: 500,
      });
    }

    const { data, error } = await client.auth.admin.inviteUserByEmail(
      application.email,
    );

    if (error) {
      console.error("Error inviting user", error.message);
      throw jsonResponse({ error: "Failed to invite applicant" }, { status: 500 });
    }

    userId = data?.user?.id ?? null;
    if (!userId) {
      throw jsonResponse({ error: "Invite succeeded but user id missing" }, {
        status: 500,
      });
    }
  }

  const { error: profileUpdateError } = await client
    .from("profiles")
    .update({ role: "technician" })
    .eq("id", userId);

  if (profileUpdateError) {
    console.error(
      "Error updating profile role",
      profileUpdateError.message,
    );
    throw jsonResponse({ error: "Failed to update profile role" }, { status: 500 });
  }

  const { error: authUpdateError } = await client.auth.admin.updateUserById(
    userId,
    { app_metadata: { role: "technician" } },
  );

  if (authUpdateError) {
    console.error("Error updating user app metadata", authUpdateError.message);
    throw jsonResponse({ error: "Failed to update user app metadata" }, {
      status: 500,
    });
  }

  return userId;
};

type ApplicationStatusUpdate = {
  status: string;
  reviewer_id: string;
  reviewed_at: string;
  review_notes: string | null;
  user_id?: string | null;
};

const updateApplication = async (
  client: ReturnType<typeof createClient>,
  applicationId: string,
  fields: ApplicationStatusUpdate,
) => {
  const { error } = await client
    .from("technician_applications")
    .update(fields)
    .eq("id", applicationId);

  if (error) {
    console.error("Error updating application", error.message);
    throw jsonResponse({ error: "Failed to update application" }, { status: 500 });
  }
};

const insertAuditLog = async (
  client: ReturnType<typeof createClient>,
  actorId: string,
  applicationId: string,
  decision: Decision,
  reviewNotes: string | undefined,
) => {
  const { error } = await client.from("audit_logs").insert({
    actor_id: actorId,
    action: decision === "approved"
      ? "APPLICATION_APPROVED"
      : "APPLICATION_REJECTED",
    entity: "technician_application",
    entity_id: applicationId,
    details: {
      decision,
      reviewNotes: reviewNotes ?? null,
    },
  });

  if (error) {
    console.error("Error inserting audit log", error.message);
    throw jsonResponse({ error: "Failed to insert audit log" }, { status: 500 });
  }
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  let payload: ApproveApplicationPayload;
  try {
    payload = validatePayload(await req.json());
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Error parsing request body", err instanceof Error
      ? err.message
      : String(err));
    return jsonResponse({ error: "Invalid request body" }, { status: 400 });
  }

  let supabaseClient: ReturnType<typeof createClient>;
  try {
    const supabaseUrl = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "Configuration error" }, { status: 500 });
  }

  let reviewerId: string;
  try {
    ({ reviewerId } = await authenticateRequest(req, supabaseClient));
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Authentication failure", err instanceof Error
      ? err.message
      : String(err));
    return jsonResponse({ error: "Authentication failed" }, { status: 401 });
  }

  let application: ApplicationRecord;
  try {
    application = await fetchApplication(supabaseClient, payload.applicationId);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Application retrieval failure", err instanceof Error
      ? err.message
      : String(err));
    return jsonResponse({ error: "Unable to retrieve application" }, {
      status: 500,
    });
  }

  const reviewedAt = new Date().toISOString();

  try {
    if (payload.decision === "approved") {
      const userId = await ensureTechnicianUser(supabaseClient, application);
      await updateApplication(supabaseClient, application.id, {
        status: "approved",
        reviewer_id: reviewerId,
        reviewed_at: reviewedAt,
        review_notes: payload.reviewNotes ?? null,
        user_id: userId,
      });
    } else {
      await updateApplication(supabaseClient, application.id, {
        status: "rejected",
        reviewer_id: reviewerId,
        reviewed_at: reviewedAt,
        review_notes: payload.reviewNotes ?? null,
      });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Application update failure", err instanceof Error
      ? err.message
      : String(err));
    return jsonResponse({ error: "Failed to process decision" }, {
      status: 500,
    });
  }

  try {
    await insertAuditLog(
      supabaseClient,
      reviewerId,
      application.id,
      payload.decision,
      payload.reviewNotes,
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Audit log failure", err instanceof Error ? err.message : String(err));
    return jsonResponse({ error: "Failed to record audit log" }, { status: 500 });
  }

  return jsonResponse({ ok: true }, { status: 200 });
});
