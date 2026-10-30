import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { DictationPresenter } from "@/components/dictation/presenter";

export const dynamic = "force-dynamic";

export default async function PresentPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { listId } = await params;
  return <DictationPresenter listId={listId} />;
}
