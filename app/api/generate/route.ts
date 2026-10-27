import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy generation endpoint is retired. Use the Studio generation queue and configured workflow.",
    },
    { status: 410 },
  );
}
