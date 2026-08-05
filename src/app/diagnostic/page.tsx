import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiagnosticRunner from "./DiagnosticRunner";

export default async function DiagnosticPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    redirect("/login");
  }

  return <DiagnosticRunner />;
}
