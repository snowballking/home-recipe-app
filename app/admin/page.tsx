import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// /admin → /admin/users
export default function AdminIndex() {
  redirect("/admin/users");
}
