"use client";
import {clearRecovery} from "./draft-recovery";
import {readStudioResponse} from "./response";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase, configured } from "../supabase";
import type {
  StudioState,
  Actor,
  Command,
  StudioResponse,
  FunctionKind,
  Connection,
} from "./types";
import { generationInput } from "./generation";
import { initialState, DEMO_ACTOR } from "./seed";
import { applyCommand } from "./engine";
import { requirePermission } from "./permissions";
export function useStudio() {
  const [state, setState] = useState<StudioState | null>(null),
    [actor, setActor] = useState<Actor | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const pathname = usePathname();
  const mode: "live" | "demo" =
      pathname === "/preview" || !configured ? "demo" : "live",
    latest = useRef<StudioState | null>(null);
  const pendingRefresh=useRef<Promise<void>|null>(null);
  const update = (s: StudioState) => {
    if(s&&latest.current&&s.version<latest.current.version)return;
    latest.current = s;
    setState(s);
  };
  const refresh = useCallback(
    async (background = false) => {
      if(pendingRefresh.current){try{return await pendingRefresh.current;}catch(error){if(background)throw error;setError((error as Error).message);return;}}
      const work=(async()=>{
      try {
        if (!background) setError("");
        if (mode === "demo") {
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
          result = await readStudioResponse<StudioResponse>(r);

        if (
          background &&
          latest.current &&
          result.state.version < latest.current.version
        )
          return;
        update(result.state);
        setActor(result.actor);
      } catch (e) {
        if (background) throw e;
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
      })();pendingRefresh.current=work;
      try{await work;}finally{if(pendingRefresh.current===work)pendingRefresh.current=null;}
    },
    [mode],
  );
  useEffect(() => {
    refresh();
    if (!supabase || mode === "demo") return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if(event==="SIGNED_OUT"){try{clearRecovery(localStorage);}catch{} latest.current=null;setState(null);setActor(null);}
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
          requirePermission(previous, DEMO_ACTOR, "connections.manage", {
            function: command.function as FunctionKind,
          });
          next = structuredClone(previous);
          const existing = command.id
            ? next.connections.find((c) => c.id === command.id)
            : undefined;
          if (
            command.id &&
            (!existing || existing.updatedAt !== command.expectedUpdatedAt)
          )
            throw new Error("Connection changed. Reopen before editing.");
          if (
            existing &&
            next.jobs.some(
              (j) =>
                j.connectionId === existing.id &&
                [
                  "queued",
                  "running",
                  "unknown",
                  "awaiting_confirmation",
                ].includes(j.state),
            )
          )
            throw new Error(
              "Resolve active or uncertain requests before editing this connection.",
            );
          if (existing && existing.function !== command.function)
            throw new Error("Keep the existing connection function.");
          const connection: Connection = {
            id: existing?.id || crypto.randomUUID(),
            title: String(command.title),
            provider: command.provider as Connection["provider"],
            function: command.function as FunctionKind,
            model: String(command.model),
            hasKey: false,
            status: "unverified",
            updatedAt: new Date().toISOString(),
          };
          if (existing) Object.assign(existing, connection);
          else next.connections.push(connection);
          next.version++;
          next.audit.push({
            id: crypto.randomUUID(),
            actor: DEMO_ACTOR.email,
            action: "connection.demo_metadata_only",
            target: connection.id,
            at: new Date().toISOString(),
          });
        } else
          next = applyCommand(
            previous,
            DEMO_ACTOR,
            command.type === "content.generate"
              ? generationInput(
                  previous,
                  DEMO_ACTOR,
                  command as unknown as Parameters<typeof generationInput>[2],
                )
              : command,
            {
              demo: true,
              canonicalGeneration: command.type === "content.generate",
            },
          );
        localStorage.setItem("ryzalab-studio-v2", JSON.stringify(next));
        update(next);
        return { state: next, actor: DEMO_ACTOR, mode: "demo" as const };
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
      const result = await readStudioResponse<StudioResponse>(response);

      update(result.state);
      setActor(result.actor);
      return result;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }
  async function signOut() {
    try{clearRecovery(localStorage,actor?.id);}catch{}
    if (supabase && mode === "live") await supabase.auth.signOut();
    else {
      latest.current=null;
      localStorage.removeItem("ryzalab-studio-v2");
      await refresh();
    }
  }
  return { state, actor, mode, loading, error, send, refresh, signOut };
}
