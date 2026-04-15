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

    router.push("/dashboard/recipes");
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
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/dashboard/recipes")}`,
      },
    });

    setGoogleLoading(false);

    if (oauthError) setError(oauthError.message);
  }

  const inputClassName =
    "w-full rounded-lg border border-amber-200 bg-white/80 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition-[border-color,box-shadow] placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 backdrop-blur-sm";

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: `
          radial-gradient(at 20% 30%, rgba(253, 230, 138, 0.45) 0px, transparent 50%),
          radial-gradient(at 80% 20%, rgba(254, 215, 170, 0.5) 0px, transparent 55%),
          radial-gradient(at 70% 90%, rgba(252, 211, 77, 0.35) 0px, transparent 50%),
          radial-gradient(at 10% 90%, rgba(254, 202, 202, 0.35) 0px, transparent 55%),
          linear-gradient(135deg, #fffaf0 0%, #fff7ed 100%)
        `,
      }}
    >
      {/* Decorative floating food icons */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute left-[8%] top-[12%] text-5xl opacity-20 sm:text-6xl">🍅</span>
        <span className="absolute right-[10%] top-[18%] text-5xl opacity-20 sm:text-7xl">🥖</span>
        <span className="absolute left-[6%] bottom-[14%] text-4xl opacity-20 sm:text-6xl">🥕</span>
        <span className="absolute right-[8%] bottom-[10%] text-5xl opacity-20 sm:text-7xl">🍳</span>
        <span className="absolute left-[45%] top-[6%] text-4xl opacity-15 sm:text-5xl">🌿</span>
        <span className="absolute right-[40%] bottom-[6%] text-4xl opacity-15 sm:text-5xl">🧄</span>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-12 sm:py-20 lg:flex-row lg:items-center lg:gap-16">
        {/* Left: Hero copy */}
        <div className="mb-10 max-w-xl text-center lg:mb-0 lg:flex-1 lg:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-white/60 px-3 py-1 text-xs font-medium text-amber-900 backdrop-blur-sm">
            <span>👨‍👩‍👧‍👦</span> For our family &amp; close friends
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
            Our Family{" "}
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Kitchen
            </span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-stone-700 sm:text-xl">
            A warm little corner for the recipes we love. Save family favorites, plan the week&apos;s
            meals, and whip up a grocery list in seconds.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FeatureCard icon="📖" title="Recipe Book" desc="All your favorites in one place" />
            <FeatureCard icon="📅" title="Meal Plans" desc="Plan a week in minutes" />
            <FeatureCard icon="🛒" title="Grocery Lists" desc="Auto-generated, ready to shop" />
          </div>
        </div>

        {/* Right: Login card */}
        <div className="w-full max-w-md lg:flex-shrink-0">
          <div className="rounded-2xl border border-amber-100 bg-white/90 p-7 shadow-xl backdrop-blur-md">
            <div className="mb-5 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">
                Welcome Home
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Sign in to access your recipes
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
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
                  className="mb-1.5 block text-sm font-medium text-stone-700"
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
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-amber-700 hover:to-orange-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-stone-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
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

            <p className="mt-5 text-center text-sm text-stone-600">
              New here?{" "}
              <Link
                href="/signup"
                className="font-semibold text-amber-700 underline-offset-4 hover:underline"
              >
                Request an invite
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-stone-500">
            This is a private app for family &amp; close friends.
            <br />
            New accounts need admin approval.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-white/60 p-3 text-center backdrop-blur-sm sm:text-left">
      <div className="text-2xl">{icon}</div>
      <p className="mt-1 text-sm font-semibold text-stone-900">{title}</p>
      <p className="text-xs text-stone-600">{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-amber-50">
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
