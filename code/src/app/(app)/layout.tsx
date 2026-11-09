import { AgentWelcome } from "@/components/layout/agent-panel";
import { AppShell } from "@/components/layout/app-shell";

// Every product screen lives in this group and gets the shared frame.
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  // Placeholder user until sign-in is built; fictional per CLAUDE.md.
  return (
    <AppShell user={{ name: "Linh Tran", email: "linh@northwind-ceramics.com", avatar: "/avatars/linh-tran.svg" }} agentContent={<AgentWelcome />}>
      {children}
    </AppShell>
  );
}
