"use client";
import TrustAccounting from "@/container/userModules/trustAccounting/trustAccounting";
import React, { Suspense } from "react";

export default function TrustAccountingPage() {
  return (
    <Suspense fallback={<>Loading...</>}>
      <TrustAccounting />
    </Suspense>
  );
}
