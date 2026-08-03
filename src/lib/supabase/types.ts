export type GradeLevel = "jhs1" | "jhs2" | "jhs3" | "hs1" | "hs2" | "hs3" | "ronin";
export type ExamTrack = "highschool" | "university";

export interface UserRow {
  id: string;
  auth_id: string;
  display_name: string;
  grade_level: GradeLevel;
  exam_track: ExamTrack;
  exam_date: string | null;
  timezone: string;
  is_minor: boolean;
  created_at: string;
}

export interface SchoolRow {
  id: string;
  type: "highschool" | "university";
  name: string;
  name_kana: string;
  prefecture: string | null;
  is_national: boolean | null;
  deviation: number | null;
}

export interface SchoolDepartmentRow {
  id: string;
  school_id: string;
  faculty: string;
  department: string | null;
  admission_type: "一般" | "共テ利用" | "総合型" | "学校推薦";
}

export interface UserTargetRow {
  id: string;
  user_id: string;
  school_id: string;
  department_id: string | null;
  priority: 1 | 2 | 3;
  exam_subjects: { subject_id: string; weight_points: number }[];
}
