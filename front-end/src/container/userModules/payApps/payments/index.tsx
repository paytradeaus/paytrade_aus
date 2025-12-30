import { PaymentsProvider } from "./paymentsContext";
import Payments from "./payments";

export default function PaymentsContainer() {
  return (
    <PaymentsProvider>
      <Payments />
    </PaymentsProvider>
  );
}
