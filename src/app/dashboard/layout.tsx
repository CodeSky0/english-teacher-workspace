import { redirect } from "next/navigation";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { getSession } from "@/server/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { populateDashboardQueries } from "@/server/prefetch-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const queryClient = new QueryClient();
  await populateDashboardQueries(queryClient, session.user.id);

  return (
    <AppShell userName={session.user.name}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {children}
      </HydrationBoundary>
    </AppShell>
  );
}
