import { redirect } from "next/navigation";

// /admin → /admin/users
export default function AdminIndex() {
  redirect("/admin/users");
}
