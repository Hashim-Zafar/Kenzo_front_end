import type { Metadata } from "next";
import { ConversationScreen } from "@/components/conversation/ConversationScreen";

export const metadata: Metadata = {
  title: "Qualification conversation",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return <ConversationScreen conversationId={conversationId} />;
}
