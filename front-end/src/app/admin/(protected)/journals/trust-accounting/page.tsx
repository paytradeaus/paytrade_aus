import TrustAccounting from "@/modules/user/TrustAccounting";
import React, { Suspense } from "react";

export default function TrustAccountingPage() {
  return (
    // <Suspense>
    <TrustAccounting isFromAdmin />
    // </Suspense>
  );
}
