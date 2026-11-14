// Sign-in and onboarding: full-page screens without the app frame (PRD-01).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-background">{children}</div>;
}
