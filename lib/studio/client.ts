"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, configured } from "../supabase";
import type {
  StudioState,
  Actor,
  Command,
  StudioResponse,
  FunctionKind,
  Connection,
} from "./types";
import { initialState, DEMO_ACTOR } from "./seed";
import { applyCommand } from "./engine";
import { requirePermission } from "./permissions";
export function useStudio() {
  const [state, setState] = useState<StudioState | null>(null),
    [actor, setActor] = useState<Actor | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const mode: "live" | "demo" = configured ? "live" : "demo",
    latest = useRef<StudioState | null>(null);
  const update = (s: StudioState) => {
    latest.current = s;
    setState(s);
  };
  const refresh = useCallback(async () => {
    try {
      setError("");
      if (!configured) {
        let saved: StudioState | null = null;
        try {
          saved = JSON.parse(
            localStorage.getItem("ryzalab-studio-v2") || "null",
          );
        } catch {}
        const s = saved || initialState(DEMO_ACTOR, true);
        update(s);
        setActor(DEMO_ACTOR);
        return;
      }
      const { data } = await supabase!.auth.getSession();
      if (!data.session) {
        setActor(null);
        update(null as unknown as StudioState);
        return;
      }
      const r = await fetch("/api/studio", {
          headers: { authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store",
        }),
        result = await r.json();
      if (!r.ok) throw new Error(result.error || "Workspace could not load.");
      update(result.state);
      setActor(result.actor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => refresh(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  async function send(command: Command) {
    try {
      setError("");
      if (mode === "demo") {
        const previous = latest.current;
        if (!previous) throw new Error("Workspace is not loaded.");
        let next: StudioState;
        if (command.type === "connection.save") {
          requirePermission(previous, DEMO_ACTOR, "connections.manage");
          next = structuredClone(previous);
          const connection: Connection = {
            id: crypto.randomUUID(),
            title: String(command.title),
            provider: command.provider as Connection["provider"],
            function: command.function as FunctionKind,
            model: String(command.model),
            hasKey: false,
            status: "unverified",
            updatedAt: new Date().toISOString(),
          };
          next.connections.push(connection);
          next.version++;
          next.audit.push({
            id: crypto.randomUUID(),
            actor: DEMO_ACTOR.email,
            action: "connection.demo_metadata_only",
            target: connection.id,
            at: new Date().toISOString(),
          });
        } else
          next = applyCommand(previous, DEMO_ACTOR, command, { demo: true });
        localStorage.setItem("ryzalab-studio-v2", JSON.stringify(next));
        update(next);
        return;
      }
      const { data } = await supabase!.auth.getSession();
      if (!data.session) throw new Error("Sign in again.");
      const connection = command.type === "connection.save";
      const body = connection
        ? Object.fromEntries(
            Object.entries(command).filter(([key]) => key !== "type"),
          )
        : command;
      const response = await fetch(
        connection ? "/api/studio/connections" : "/api/studio",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json()) as StudioResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Operation failed.");
      update(result.state);
      setActor(result.actor);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    else {
      localStorage.removeItem("ryzalab-studio-v2");
      await refresh();
    }
  }
  return { state, actor, mode, loading, error, send, refresh, signOut };
}
