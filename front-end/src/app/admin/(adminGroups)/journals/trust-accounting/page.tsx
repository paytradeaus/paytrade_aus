import TrustAccounting from "@/container/userModules/trustAccounting/trustAccounting";
import React, { Suspense } from "react";

export default function TrustAccountingPage() {
  return (
    <Suspense>
      <TrustAccounting isFromAdmin />
    </Suspense>
  );
}
