"use client";
import { useIsClient } from "@/hooks";
import AdminLoginForm from "@/modules/admin/AdminLoginForm";
import AuthLayout from "@/modules/auth/AuthLayout";
import { Suspense } from "react";

export default function Home() {
  const { isClient }: any = useIsClient();

  if (!isClient) return null; // Avoid mismatches during hydration

  return (
    <Suspense>
      <AuthLayout>
        <div className="pt_box_transparent">
          <div className="grid">
            <AdminLoginForm />
          </div>
        </div>
      </AuthLayout>
    </Suspense>
  );
}
