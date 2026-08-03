import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// z.string().uuid() はRFC4122のバージョン/バリアントビットまで検証するが、
// Postgresのuuid型自体はその意味的検証をしない（開発用の連番シードIDも通したい）。
const uuidLike = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "invalid uuid");

const targetSchema = z.object({
  school_id: uuidLike,
  department_id: uuidLike.optional(),
  priority: z.number().int().min(1).max(3),
  exam_subjects: z
    .array(z.object({ subject_id: uuidLike, weight_points: z.number() }))
    .default([]),
});

const bodySchema = z.object({
  display_name: z.string().min(1).max(50),
  grade_level: z.enum(["jhs1", "jhs2", "jhs3", "hs1", "hs2", "hs3", "ronin"]),
  exam_track: z.enum(["highschool", "university"]),
  exam_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  is_minor: z.boolean().default(true),
  targets: z.array(targetSchema).min(1).max(3),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { display_name, grade_level, exam_track, exam_date, is_minor, targets } = parsed.data;

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already onboarded" }, { status: 409 });
  }

  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      auth_id: authUser.id,
      display_name,
      grade_level,
      exam_track,
      exam_date: exam_date ?? null,
      is_minor,
    })
    .select("id")
    .single();

  if (userError || !newUser) {
    return NextResponse.json(
      { error: userError?.message ?? "failed to create user" },
      { status: 500 }
    );
  }

  const targetRows = targets.map((t) => ({ ...t, user_id: newUser.id }));
  const { error: targetError } = await supabase.from("user_targets").insert(targetRows);

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: newUser.id }, { status: 201 });
}
