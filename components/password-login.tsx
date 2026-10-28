"use client";
import { useState } from "react";
import { Mail, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
export function PasswordLogin() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase!.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error)
        throw new Error(
          "Sign-in failed. Check your email, password and invited membership.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setError("");
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/studio" },
    });
    if (error)
      setError(
        "Google sign-in is not configured. Ask your administrator or use your password.",
      );
  }
  return (
    <main className="studio-v2 studio-login">
      <section>
        <p className="studio-wordmark">
          RyzaLab <span>CONTENT STUDIO</span>
        </p>
        <p className="studio-eyebrow">A VOICE THAT IS YOURS</p>
        <h1>
          Good ideas.
          <br />
          Thoughtfully made.
        </h1>
        <p>Your editorial desk, from first question to final human decision.</p>
      </section>
      <form onSubmit={submit}>
        <Mail size={28} />
        <h2>Welcome to the studio.</h2>
        <p>Invited members only. Sign in to your private workspace.</p>
        <label>
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="studio-primary" disabled={busy}>
          {busy ? (
            <Loader2 className="studio-spin" size={18} />
          ) : (
            <>
              Sign in <ArrowRight size={16} />
            </>
          )}
        </button>
        <button type="button" className="studio-secondary" onClick={google}>
          Continue with Google
        </button>
        {error && <p role="alert">{error}</p>}
        <small>
          <ShieldCheck size={14} /> Forgot your password? Ask a workspace
          administrator.
        </small>
      </form>
    </main>
  );
}
