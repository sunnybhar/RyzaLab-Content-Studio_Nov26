import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Use Studio review commands. Automated wording checks are not human release approval.",
    },
    { status: 410 },
  );
}
