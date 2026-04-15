import { redirect } from "next/navigation";

// /dashboard → /dashboard/recipes (My Collections is now the landing page after login)
export default function DashboardPage() {
  redirect("/dashboard/recipes");
}
