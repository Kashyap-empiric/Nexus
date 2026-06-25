"use client";

import { useParams } from "next/navigation";
import { WorkspaceThreadsView } from "@/modules/threads/components/WorkspaceThreadsView";

export default function WorkspaceThreadsPage() {
  const params = useParams();
  const workspaceId = params?.slug as string;

  return <WorkspaceThreadsView workspaceId={workspaceId} />;
}
