import type { Metadata } from "next";
import { StartScreen } from "@/components/start/StartScreen";

export const metadata: Metadata = {
  title: "Start your conversation",
};

export default function ConversationStartPage() {
  return <StartScreen />;
}
