"use client";
import {refreshGate} from "./refresh-policy";
import {clearRecovery} from "./draft-recovery";
import {StudioResponseError, readStudioResponse} from "./response";
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
  Job,
} from "./types";
import { generationInput } from "./generation";
import { initialState, DEMO_ACTOR } from "./seed";
import { applyCommand } from "./engine";
import { requirePermission } from "./permissions";
const browserStorageKey = "ryzalab-studio-v2";
const localEndpoint = "/api/studio/local";
type LocalSnapshot = { state: StudioState; revision: number };

function readBrowserWorkspace(): StudioState | null {
  try {
    return JSON.parse(localStorage.getItem(browserStorageKey) || "null");
  } catch {
    return null;
  }
}

async function saveLocalWorkspace(state: StudioState, revision: number | null) {
  const response = await fetch(localEndpoint, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ state, revision }),
  });
  return readStudioResponse<{ revision: number }>(response);
}

async function loadLocalWorkspace(): Promise<LocalSnapshot> {
  const read = async () => readStudioResponse<Partial<LocalSnapshot>>(
    await fetch(localEndpoint, { cache: "no-store", signal: AbortSignal.timeout(12000) }),
  );
  const existing = await read();
  if (existing.state && existing.revision !== undefined)
    return { state: existing.state, revision: existing.revision };

  const saved = readBrowserWorkspace();
  const state = saved ?? initialState(DEMO_ACTOR);
  if (!saved) state.members[0].roles = ["founder", "administrator"];
  try {
    return { state, ...await saveLocalWorkspace(state, null) };
  } catch (error) {
    if (!(error instanceof StudioResponseError) || error.status !== 409) throw error;
    const concurrent = await read();
    if (concurrent.state && concurrent.revision !== undefined)
      return { state: concurrent.state, revision: concurrent.revision };
    throw error;
  }
}

export function useStudio() {
  const [state, setState] = useState<StudioState | null>(null),
    [actor, setActor] = useState<Actor | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const pathname = usePathname();
  const local = process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_STUDIO_LOCAL === "1" && pathname === "/studio";
  const localRevision = useRef(0);
  const mode: "live" | "demo" =
      local || pathname === "/preview" || !configured ? "demo" : "live",
    latest = useRef<StudioState | null>(null);
  const pendingRefresh=useRef<Promise<void>|null>(null);
  const refreshPolicy=useRef(refreshGate());
  const cachedActorId=useRef<string|null>(null);
  const update = (s: StudioState) => {
    if(s&&latest.current&&s.version<latest.current.version)return;
    latest.current = s;
    setState(s);
  };
  const refresh = useCallback(
    async (background = false) => {
      if(pendingRefresh.current){try{return await pendingRefresh.current;}catch(error){if(background)throw error;setError((error as Error).message);return;}}
      if(!refreshPolicy.current.allow(background,typeof document!=="undefined"&&document.hidden))return;
      const work=(async()=>{
      try {
        if (!background) setError("");
        if (mode === "demo") {
          if (local) {
            const snapshot = await loadLocalWorkspace();
            if (snapshot.revision >= localRevision.current) {
              localRevision.current = snapshot.revision;
              update(snapshot.state);
            }
          } else {
            update(readBrowserWorkspace() || initialState(DEMO_ACTOR, true));
          }
          setActor(DEMO_ACTOR);
          return;
        }
        const { data } = await supabase!.auth.getSession();
        if (!data.session) {
          setActor(null);
          update(null as unknown as StudioState);
          return;
        }
        if(cachedActorId.current!==data.session.user.id){latest.current=null;cachedActorId.current=data.session.user.id;}
        const r = await fetch("/api/studio", {
            headers: { authorization: `Bearer ${data.session.access_token}`, ...(latest.current?{"X-Studio-Version":String(latest.current.version)}:{}) },
            cache: "no-store",
          });
        if(r.status===304)return;
        const result = await readStudioResponse<StudioResponse>(r);

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
    [local, mode],
  );
  useEffect(() => {
    refresh();
    if (!supabase || mode === "demo") return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if(event==="SIGNED_OUT"){try{clearRecovery(localStorage);}catch{} latest.current=null;cachedActorId.current=null;refreshPolicy.current.reset();setState(null);setActor(null);}
      setTimeout(() => refresh(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  async function requestLocalAI<T>(command: Command) {
    try {
      const { archivePdf, ...metadata } = command;
      const payload = { revision: localRevision.current, command: metadata };
      let body: string | FormData = JSON.stringify(payload);
      if (archivePdf instanceof Blob) {
        body = new FormData();
        body.set("payload", JSON.stringify(payload));
        body.set("pdf", archivePdf, "post.pdf");
      }
      const response = await fetch(localEndpoint, {
        method: "POST",
        ...(typeof body === "string" ? { headers: { "content-type": "application/json" } } : {}),
        body,
        signal: AbortSignal.timeout(170000),
      });
      return await readStudioResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError")
        throw new Error("Studio stopped waiting for a response. Check the saved request in Generation activity before trying again.");
      throw error;
    }
  }

  async function send(command: Command) {
    try {
      setError("");
      if (local && ["package.approve", "connection.save", "connection.validate", "connection.disconnect", "connection.delete", "content.generate", "idea.generate", "research.retrieve", "agentVoice.create", "media.generate", "media.check"].includes(command.type)) {
        try {
          const result = await requestLocalAI<LocalSnapshot & { job?: Job }>(command);
          if (result.revision >= localRevision.current) {
            localRevision.current = result.revision;
            update(result.state);
          }
          if (result.job?.state === "unknown" || result.job?.state === "failed" ||
              (result.job?.state === "succeeded" && result.job.kind === "text" && !result.job.appliedAt) ||
              result.job?.outputStatus === "invalid" || result.job?.outputStatus === "conflict" ||
              (result.job?.outputStatus === "incomplete" && !result.job.appliedAt))
            throw new Error(result.job.error || "Generation did not update the draft. Check Generation activity.");
          return { state: result.state, actor: DEMO_ACTOR, mode: "demo" as const };
        } catch (error) {
          if (error instanceof StudioResponseError && error.status === 409) await refresh();
          throw error;
        }
      }
      if (mode === "demo") {
        const previous = latest.current;
        const expectedRevision = localRevision.current;
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
        if (local) {
          try {
            const saved = await saveLocalWorkspace(next, expectedRevision);
            if (saved.revision >= localRevision.current) {
              localRevision.current = saved.revision;
              update(next);
            }
          } catch (error) {
            if (error instanceof StudioResponseError && error.status === 409) await refresh();
            throw error;
          }
        } else {
          localStorage.setItem(browserStorageKey, JSON.stringify(next));
          update(next);
        }
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
    if (local) return;
    try{clearRecovery(localStorage,actor?.id);}catch{}
    if (supabase && mode === "live") await supabase.auth.signOut();
    else {
      latest.current=null;
      localStorage.removeItem(browserStorageKey);
      await refresh();
    }
  }
  return { state, actor, mode, local, loading, error, send, refresh, signOut, requestLocalAI };
}
