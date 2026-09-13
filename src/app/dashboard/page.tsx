import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    // useSearchParams() inside DashboardClient (needed to read ?tab=&property=
    // for the "View Inquiries" deep-link) requires a Suspense boundary around
    // any usage during static export.
    <Suspense fallback={null}>
      <DashboardClient
        email={user.email ?? ""}
        userId={user.id}
        fullName={user.user_metadata?.full_name ?? ""}
        accountType={user.user_metadata?.account_type ?? "Individual"}
      />
    </Suspense>
  );
}
