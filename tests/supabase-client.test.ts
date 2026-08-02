import { describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.hoisted(() => vi.fn(() => ({ id: "browser-client" })));

vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

import { createClient } from "@/lib/supabase/client";

describe("createClient", () => {
  it("reuses one browser client for the lifetime of the module", () => {
    const first = createClient();
    const second = createClient();

    expect(first).toBe(second);
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
  });
});
