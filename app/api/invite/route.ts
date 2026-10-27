import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, loadState } from "@/lib/studio/store";
import { requirePermission, StudioError } from "@/lib/studio/permissions";
import { failure } from "@/lib/studio/http";
export async function POST(req: NextRequest) {
  try {
    const { db, actor } = await authenticate(req),
      state = await loadState(db, actor);
    requirePermission(state, actor, "users.manage");
    const c = z
      .object({ email: z.email(), password: z.string().min(12).max(128) })
      .parse(await req.json());
    const { data, error } = await db.auth.admin.createUser({
      email: c.email.toLowerCase(),
      password: c.password,
      email_confirm: true,
    });
    if (error)
      throw new StudioError(
        409,
        "Account could not be created. It may already exist. Existing users keep their password.",
      );
    return NextResponse.json({
      id: data.user.id,
      message:
        "Auth account created. Assign its Studio profiles explicitly in People. No email was sent.",
    });
  } catch (e) {
    return failure(e);
  }
}
