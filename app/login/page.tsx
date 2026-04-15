import { redirect } from "next/navigation";

// The login form now lives on the home page ("/").
// This route exists as a permanent redirect so any old links keep working.
interface PageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function LoginRedirect({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.error) params.set("error", sp.error);
  if (sp.next) params.set("next", sp.next);
  const qs = params.toString();
  redirect(qs ? `/?${qs}` : "/");
}
