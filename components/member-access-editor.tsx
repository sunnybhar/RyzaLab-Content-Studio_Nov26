"use client";
import { useRef, useState } from "react";
import { ROLES, type Member, type Command } from "@/lib/studio/types";
export function MemberAccessEditor({
  member,
  disabled,
  send,
  onSaved,
}: {
  member: Member;
  disabled: boolean;
  send: (command: Command) => Promise<unknown>;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [grants, setGrants] = useState("[]");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="s-btn s-small-btn"
        disabled={disabled}
        onClick={() => {
          setRoles([...member.roles]);
          setGrants(JSON.stringify(member.grants, null, 2));
          setError("");
          dialog.current?.showModal();
        }}
      >
        Edit access
      </button>
      <dialog
        ref={dialog}
        className="s-review-dialog"
        aria-label={`Edit ${member.email}`}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header className="s-review-dialog-heading">
          <h2>Edit {member.email}</h2>
          <button
            className="s-btn"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Close
          </button>
        </header>
        <form
          className="s-review-dialog-body"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!roles.length) {
              setError("Select at least one role.");
              return;
            }
            setBusy(true);
            try {
              const parsed = JSON.parse(grants);
              if (!Array.isArray(parsed))
                throw Error("Scoped grants must be a JSON array.");
              await send({
                type: "member.save",
                email: member.email,
                roles,
                grants: parsed,
              });
              dialog.current?.close();
              onSaved();
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Could not save access.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset
            disabled={busy}
            style={{ display: "grid", gap: 12, border: 0, padding: 0 }}
          >
            <legend>Roles</legend>
            {ROLES.map((role) => (
              <label key={role}>
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={(e) =>
                    setRoles((current) =>
                      e.target.checked
                        ? [...current, role]
                        : current.filter((r) => r !== role),
                    )
                  }
                />{" "}
                {role}
                {role === "founder" ? " — includes all Studio permissions" : ""}
              </label>
            ))}
          </fieldset>
          <label className="s-field">
            Scoped grants (JSON array)
            <textarea
              value={grants}
              rows={5}
              disabled={busy}
              onChange={(e) => setGrants(e.target.value)}
            />
          </label>
          {error && (
            <p className="s-alert s-error" role="alert">
              {error}
            </p>
          )}
          <div className="s-actions">
            <button
              type="button"
              className="s-btn"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button className="s-btn s-primary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
