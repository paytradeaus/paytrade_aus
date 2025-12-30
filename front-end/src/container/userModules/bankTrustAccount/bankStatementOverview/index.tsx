import { BankStatementContextProvider } from "./BankTrustOverviewContext";
import AddEditBankTrustAccount from "./addEditbankStatement";

export default function BankTrustAccountOverviewContainer() {
  return (
    <BankStatementContextProvider>
      <AddEditBankTrustAccount />
    </BankStatementContextProvider>
  );
}
