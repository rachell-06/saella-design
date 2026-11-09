import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "./_components/settings-nav";

// Settings frame: page header + sub-nav on the left, the chosen section on the right.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Sending, your organization, notifications, language and billing." />
      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside>
          <SettingsNav />
        </aside>
        <div className="flex min-w-0 max-w-5xl flex-col gap-8">{children}</div>
      </div>
    </>
  );
}
