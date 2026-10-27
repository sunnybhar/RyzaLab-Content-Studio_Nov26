import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy image endpoint is retired. Use Studio AI connections and the generation queue.",
    },
    { status: 410 },
  );
}
