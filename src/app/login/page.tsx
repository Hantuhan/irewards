import { Suspense } from "react";
import { LoginForm } from "@/components/merchant/LoginForm";

export default function MerchantLoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
