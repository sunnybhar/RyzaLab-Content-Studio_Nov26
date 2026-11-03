import { NextResponse } from "next/server";
import { StudioError } from "./permissions";
import { ZodError } from "zod";
export function failure(error: unknown,trace=crypto.randomUUID()) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Invalid request fields. Check required values and limits.",
        trace,
      },
      { status: 400 },
    );
  if (error instanceof StudioError)
    return NextResponse.json(
      { error: error.message, trace },
      { status: error.code },
    );
  console.error("Studio operation failed", {
    trace,
    type: error instanceof Error ? error.name : "unknown",
  });
  return NextResponse.json(
    {
      error: `Studio operation failed. Reference ${trace}. No provider operation was automatically retried.`,
      trace,
    },
    { status: 500 },
  );
}
