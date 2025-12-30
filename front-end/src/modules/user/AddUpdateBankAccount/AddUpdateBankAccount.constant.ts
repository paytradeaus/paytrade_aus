import { QUICK_ADD_RECORD_VALUE } from "@/shared/constant/general";

const bankAccountTypes = [
  { value: "Cash Account", label: "Cash Account" },
  { value: "Project Trust Account", label: "Project Trust Account" },
  { value: "Retention Trust Account", label: "Retention Trust Account" },
];

const auditAccounts = [bankAccountTypes[1], bankAccountTypes[2]];
const bankProjectGridHeaders = [
  { title: "Project Name", restrictSorting: true },
  { title: "ID", restrictSorting: true },
];
const projectRenderData = [{ key: "label" }, { key: "value" }];

const trusteeWarningMessage = {
  ON_NO_MATCHES:
    "Account name doesn't include the 'Trustee name' even partially. Please try and use at least one word in the account name to match trustee. ",
  ON_PARTIAL_MATCHES:
    "Trust account name needs to include your business name and the word trust. The account name entered does not match with the business name. Do you still want to continue to save?",
};

const quickAddOnRoute = {
  CASH_ACC: "cashacc",
  BANK: "bank",
  PTA: "pta",
};

function AddNewRecordOpt(renderKey?: string, valueKey?: string) {
  return {
    [renderKey ?? "label"]: "+ Add new",
    [valueKey ?? "value"]: QUICK_ADD_RECORD_VALUE,
  };
}

export {
  bankAccountTypes,
  bankProjectGridHeaders,
  projectRenderData,
  trusteeWarningMessage,
  quickAddOnRoute,
  AddNewRecordOpt,
  auditAccounts,
};
