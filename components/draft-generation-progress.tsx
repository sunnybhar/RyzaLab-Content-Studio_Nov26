"use client";

import { useEffect, useState } from "react";

export function DraftGenerationProgress({ label = "Generating draft…", startedAt }: { label?: string; startedAt?: number }) {
  const [mountedAt] = useState(Date.now);
  const start = startedAt ?? mountedAt;
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((Date.now() - start) / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [start]);
  const duration = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <section className="s-idea-run-progress s-draft-generation-progress" aria-label="Draft generation progress">
      <p role="status"><strong>{label}</strong></p>
      <progress aria-label="Draft generation in progress" />
      <p role="timer">Elapsed: {duration}</p>
    </section>
  );
}
