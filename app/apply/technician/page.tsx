import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import TechnicianApplicationForm from "./TechnicianApplicationForm"

export default async function TechnicianApplicationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/apply/technician`)
  }

  const { data: application, error } = await supabase
    .from("technician_applications")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["submitted", "under_review", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching technician application", error)
  }

  if (application?.status === "approved") {
    redirect("/tech/dashboard")
  }

  return (
    <TechnicianApplicationForm
      userId={user.id}
      email={user.email ?? ""}
      initialApplication={application ?? null}
    />
  )
}
