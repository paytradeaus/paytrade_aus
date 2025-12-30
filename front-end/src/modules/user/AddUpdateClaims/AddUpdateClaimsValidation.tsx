import * as yup from "yup";

const initialValues = {
  paidDeclaration: false,
  isThirdPartyClaim: false,
  projectId: "",
  contractId: "",
  paymentTerms: "",
  supplier: "",
  address: "",
  receivedDate: "",
  sentDate: "",
  dueDate: "",
  claimReference: "",
  cashRetention: "No Retention",
  retentionAmount: "",
  retentionPercentage: "",
  memo: "",
  paymentToAccount: "",
  paymentFromAccount: "",
  paymentToAccountName: "",
  paymentToBSB: "",
  paymentToAccountNumber: "",
  cash_retention_type: "",
  claim_type: "",
  claimAmount: 0,
  isGstChecked: false,
  subTotal: 0,
  gstAmount: 0,
  totalAmount: 0,
  thirdPartySupplier: "",
  claimItems: [
    {
      description: "",
      quantity: "",
      unit_price: "",
      gst: "",
      total_amount_including_gst: "",
    },
  ],
};

const validationSchema = yup.object().shape({
  projectId: yup.string().required("Project is required"),
  // ContractId: yup.string().required("Contract is required"),
  contractId: yup.string().required("Contract is required"),
  retentionAmount: yup.string().when(["cashRetention"], (value: any) => {
    if (value[0] == "Retention") {
      return yup.string().required("Retention amount is required");
    }
    return yup.string().notRequired();
  }),
  retentionPercentage: yup.number().when(["cashRetention"], (value: any) => {
    if (value[0] == "Retention") {
      return yup.string().required("Retention percentage is required");
    }
    return yup.string().notRequired();
  }),
  sentDate: yup
    .string()
    .when(["claim_type", "cash_retention_type"], (otherFieldData: any) => {
      if (
        otherFieldData[0] == "Receivable" &&
        (otherFieldData[1] == "Retention claim" || otherFieldData[1] == "Claim")
      ) {
        return yup.string().required("Sent date is required");
      }
      return yup.string().notRequired();
    }),
  receivedDate: yup
    .string()
    .when(["claim_type", "cash_retention_type"], (otherFieldData: any) => {
      if (
        otherFieldData[0] == "Billable" &&
        (otherFieldData[1] == "Retention claim" || otherFieldData[1] == "Claim")
      ) {
        return yup.string().required("Received date is required");
      }
      return yup.string().notRequired();
    }),

  dueDate: yup.string().required("Due date is required"),
  claimItems: yup.array().of(
    yup.object().shape({
      description: yup.string().required("Description is required").nullable(),
      quantity: yup.string().required("Quantity is required").nullable(),
      unit_price: yup.string().required("Price is required").nullable(),
    })
  ),
  thirdPartySupplier: yup
    .string()
    .when(["claim_type", "isThirdPartyClaim"], (otherFieldData: any) => {
      if (otherFieldData[0] == "Billable" && otherFieldData[1]) {
        return yup.string().required("Supplier is required");
      }
      return yup.string().notRequired();
    }),
  paymentTerms: yup
    .string()
    .when(["isThirdPartyClaim"], (otherFieldData: any) => {
      if (otherFieldData[0]) {
        return yup.string().required("Payment terms is required");
      }
      return yup.string().notRequired();
    }),
  paymentToAccount: yup
    .string()
    .when(["claim_type", "isThirdPartyClaim"], (otherFieldData: any) => {
      if (otherFieldData[0] == "Billable" && otherFieldData[1]) {
        return yup.string().required("Supplier is required");
      }
      return yup.string().notRequired();
    }),
});

export { initialValues, validationSchema };
