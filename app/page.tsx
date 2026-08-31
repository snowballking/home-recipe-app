"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const urlError = searchParams.get("error");

  useEffect(() => {
    if (urlError) setError(urlError);
  }, [urlError]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/market");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/market")}`,
      },
    });

    setGoogleLoading(false);

    if (oauthError) setError(oauthError.message);
  }

  const inputClassName =
    "h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition-[border-color,box-shadow] placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15";

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-background text-stone-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-14rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-orange-200/40 blur-3xl sm:left-[18%] sm:h-[34rem] sm:w-[34rem]"
      />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-6">
        <div
          aria-label="Chef HideOut 私厨"
          className="text-center text-lg font-bold tracking-[-0.04em] text-stone-950 sm:text-left"
        >
          Chef HideOut <span className="text-orange-600">私厨</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-3 sm:py-4">
          <section
            aria-labelledby="login-heading"
            className="w-full max-w-sm rounded-[2rem] border border-orange-100 bg-white/95 p-6 shadow-[0_24px_70px_rgba(86,52,30,0.10)] backdrop-blur"
          >
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">
                Your cooking community
              </p>
              <h1
                id="login-heading"
                className="mt-3 text-3xl font-bold tracking-[-0.045em] text-stone-950"
              >
                Welcome back.
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Recipes, meal plans, and the people you cook with—all in one place.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-sm font-semibold text-stone-700"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-sm font-semibold text-stone-700"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p
                  className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex h-11 w-full items-center justify-center rounded-full bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="relative my-4" aria-hidden="true">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[10px] font-semibold tracking-[0.12em] text-stone-400">
                  Or
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 transition-colors hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            <p className="mt-4 text-center text-sm text-stone-600">
              New here?{" "}
              <Link
                href="/signup"
                className="font-semibold text-orange-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Request an invite
              </Link>
            </p>
          </section>

          <p className="mt-4 text-center text-xs font-semibold text-stone-600">
            Discover recipes <span aria-hidden="true">·</span> Share variations{" "}
            <span aria-hidden="true">·</span> Plan together
          </p>
          <p className="mt-1.5 text-center text-[11px] text-stone-500">
            This is a private community. New accounts need admin approval.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
