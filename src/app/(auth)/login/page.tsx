import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginScreen } from "./_components/login-screen";

export const metadata: Metadata = { title: "Sign in · Saella" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
