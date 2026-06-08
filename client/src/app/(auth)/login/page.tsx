import { Suspense } from "react";
import { LoginForm } from "@/modules/auth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

