import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TestRunner from "./TestRunner";

export default async function WeeklyTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    redirect("/login");
  }

  return <TestRunner mockExamId={id} />;
}
