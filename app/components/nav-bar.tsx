"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/language-context";
import { useAuth } from "@/lib/auth/auth-context";
import { CreateMenu } from "@/app/components/create-menu";
import { getPrimaryNavigation, type PrimaryNavigationKey } from "@/lib/navigation";

const LABEL_KEYS: Record<PrimaryNavigationKey, "nav.home" | "nav.discover" | "nav.create" | "nav.plans" | "nav.cart"> = {
  home: "nav.home",
  discover: "nav.discover",
  create: "nav.create",
  plans: "nav.plans",
  cart: "nav.cart",
};

function PrimaryNavIcon({ icon }: { icon: Exclude<PrimaryNavigationKey, "create"> }) {
  let paths;

  switch (icon) {
    case "home":
      paths = (
        <>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h5v-6h4v6h5V10" />
        </>
      );
      break;
    case "discover":
      paths = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      );
      break;
    case "plans":
      paths = (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18M8 15h3M8 18h6" />
        </>
      );
      break;
    case "cart":
      paths = (
        <>
          <path d="M3 3h2l2.4 11.5a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6" />
          <circle cx="10" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </>
      );
      break;
  }

  return (
    <svg
      data-testid={`mobile-nav-icon-${icon}`}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      {paths}
    </svg>
  );
}

interface ProfileMenuProps {
  userId: string;
  displayName: string;
  onLogout: () => Promise<void>;
  loggingOut: boolean;
}

function ProfileMenu({ userId, displayName, onLogout, loggingOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("nav.profile")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu"
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-semibold text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      >
        {(displayName?.[0] ?? "U").toUpperCase()}
      </button>

      {open && (
        <div
          id="profile-menu"
          role="menu"
          aria-label={t("nav.profile")}
          className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-48 overflow-hidden rounded-2xl border border-orange-100 bg-white p-1.5 shadow-[0_16px_45px_rgba(62,37,16,0.2)] dark:border-stone-700 dark:bg-stone-900"
        >
          <Link
            href={`/user/${userId}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-orange-300"
          >
            {t("nav.my_profile")}
          </Link>
          <Link
            href="/dashboard/saved-recipes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-orange-300"
          >
            {t("nav.saved_recipes")}
          </Link>
          <Link
            href="/dashboard/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-orange-300"
          >
            {t("nav.edit_profile")}
          </Link>
          <div className="my-1 border-t border-orange-100 dark:border-stone-700" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            disabled={loggingOut}
            className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {loggingOut ? t("nav.logging_out") : t("nav.log_out")}
          </button>
        </div>
      )}
    </div>
  );
}

function CartComingSoonButton({ mobile = false }: { mobile?: boolean }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function showMessage() {
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 2800);
  }

  return (
    <div className={mobile ? "relative flex min-h-12 items-center justify-center" : "relative"}>
      <button
        type="button"
        aria-label={t("nav.cart")}
        aria-expanded={open}
        title={t("nav.cart_coming_soon")}
        onClick={showMessage}
        className={mobile
          ? "flex min-h-12 flex-col items-center justify-center gap-1 py-1 font-semibold text-emerald-700 opacity-65 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:text-emerald-300"
          : "hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-emerald-700 opacity-65 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:inline-flex dark:text-emerald-300"}
      >
        {mobile ? <PrimaryNavIcon icon="cart" /> : <span aria-hidden="true">⌑</span>}
        <span className={mobile ? "text-xs leading-none" : undefined} data-testid={mobile ? "mobile-nav-label-cart" : undefined}>
          {t("nav.cart")}
        </span>
      </button>
      {open && (
        <div
          role="status"
          aria-live="polite"
          className={mobile
            ? "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900 px-3 py-2 text-xs font-semibold text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"
            : "absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-full bg-stone-900 px-3 py-2 text-xs font-semibold text-white shadow-lg dark:bg-stone-100 dark:text-stone-900"}
        >
          {t("nav.coming_soon")}
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, displayName } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();
  const { locale, setLocale, t } = useLanguage();
  const navigation = getPrimaryNavigation(pathname);
  const desktopLinks = navigation.filter((item) => item.href && item.key !== "create" && item.key !== "cart");

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function toggleLocale() {
    setLocale(locale === "en" ? "zh" : "en");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-orange-100/90 bg-[#fffaf4]/90 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            href={user ? "/market" : "/"}
            className="shrink-0 font-bold tracking-[-0.03em] text-stone-950 dark:text-stone-50"
          >
            Chef HideOut <span className="text-orange-600">私厨</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 rounded-full bg-orange-50/80 p-1 md:flex dark:bg-stone-900">
            {desktopLinks.map((item) => (
              <Link
                key={item.key}
                href={item.href ?? "/market"}
                aria-current={item.active ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-white text-orange-700 shadow-sm dark:bg-stone-800 dark:text-orange-300"
                    : "text-stone-600 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100"
                }`}
              >
                {t(LABEL_KEYS[item.key])}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <CreateMenu className="hidden sm:inline-flex" />
            <CartComingSoonButton />

            {isAdmin && (
              <Link
                href="/admin/users"
                className="hidden rounded-full px-3 py-2 text-xs font-medium text-stone-600 hover:bg-orange-50 hover:text-orange-700 sm:inline-flex dark:text-stone-300 dark:hover:bg-stone-800"
              >
                {t("nav.admin")}
              </Link>
            )}

            <button
              type="button"
              onClick={toggleLocale}
              className="rounded-full border border-orange-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-orange-200 hover:bg-orange-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              title={locale === "en" ? "切换中文" : "Switch to English"}
            >
              {locale === "en" ? "中文" : "EN"}
            </button>

            {user ? (
              <ProfileMenu
                userId={user.id}
                displayName={displayName}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-700 dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                {t("nav.sign_in")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-orange-100 bg-[#fffaf4]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden dark:border-stone-800 dark:bg-stone-950/95"
      >
        {navigation.map((item) => {
          if (item.key === "create") {
            return (
              <div key={item.key} className="-mt-7 flex justify-center">
                <CreateMenu className="inline-flex min-h-12 rounded-full px-4 shadow-lg" />
              </div>
            );
          }

          if (item.key === "cart") {
            return (
              <CartComingSoonButton
                key={item.key}
                mobile
              />
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href ?? "/market"}
              aria-current={item.active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 py-1 font-semibold transition-colors ${
                item.active
                  ? "text-orange-700 dark:text-orange-300"
                  : "text-stone-500 dark:text-stone-400"
              }`}
            >
              <PrimaryNavIcon icon={item.key} />
              <span data-testid={`mobile-nav-label-${item.key}`} className="text-xs leading-none">
                {t(LABEL_KEYS[item.key])}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
