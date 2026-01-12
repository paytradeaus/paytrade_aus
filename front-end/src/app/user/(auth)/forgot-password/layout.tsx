import AuthLayout from "@/modules/auth/AuthLayout";
import React from "react";

export default function page({ children }: any) {
  return <AuthLayout>{children}</AuthLayout>;
}
