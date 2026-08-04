import { z } from "zod";

// z.string().uuid() はRFC4122のバージョン/バリアントビットまで検証するが、
// Postgresのuuid型自体はその意味的検証をしない（開発用の連番シードIDも通したい）。
export const uuidLike = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "invalid uuid");
