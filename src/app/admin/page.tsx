import { redirect } from "next/navigation";

// The dashboard lives at /admin/dashboard; keep bare /admin working for old links and bookmarks.
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
