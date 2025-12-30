"use client";
import AddUpdatePayments from "./AddUpdatePayment";
import { PaymentsProvider } from "./PaymentContextProvider";

export default function AddUpdatePaymentsWrapper({ editMode }: any) {
  return (
    <PaymentsProvider>
      <AddUpdatePayments />
    </PaymentsProvider>
  );
}
