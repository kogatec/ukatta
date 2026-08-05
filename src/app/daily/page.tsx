import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DailyMissionRunner from "./DailyMissionRunner";

export default async function DailyPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    redirect("/login");
  }

  return <DailyMissionRunner />;
}
