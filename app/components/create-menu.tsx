"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/i18n/language-context";

interface CreateMenuProps {
  className?: string;
  iconOnly?: boolean;
}

export function CreateMenu({ className = "", iconOnly = false }: CreateMenuProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? t("nav.create") : undefined}
        className={`${iconOnly
          ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 p-0 text-xl font-semibold leading-none text-white shadow-sm transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          : "items-center justify-center gap-1.5 rounded-full bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"} ${className}`}
      >
        <span aria-hidden>＋</span>
        {!iconOnly && t("nav.create")}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end bg-stone-950/35 p-3 sm:items-center sm:justify-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-menu-title"
            className="w-full max-w-md rounded-3xl bg-background p-5 shadow-2xl dark:bg-stone-950"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="create-menu-title" className="text-lg font-bold text-stone-950 dark:text-stone-50">
                {t("create.title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                aria-label={t("common.close")}
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href="/dashboard/recipes/new"
                aria-label={t("create.add_recipe")}
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-orange-600 p-4 text-white transition-colors hover:bg-orange-700"
              >
                <p className="font-semibold">{t("create.add_recipe")}</p>
                <p className="mt-1 text-sm text-orange-50">{t("create.add_recipe_description")}</p>
              </Link>
              <Link
                href="/dashboard/plans/new"
                aria-label={t("create.start_plan")}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-stone-200 bg-white p-4 text-stone-900 transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-orange-900 dark:hover:bg-orange-950/30"
              >
                <p className="font-semibold">{t("create.start_plan")}</p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("create.start_plan_description")}</p>
              </Link>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
