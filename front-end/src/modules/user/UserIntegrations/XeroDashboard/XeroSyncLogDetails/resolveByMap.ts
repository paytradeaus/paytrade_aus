import { convertPositiveDecimalTwoDigit, formatDate } from "@/utils";
import {
  getXeroBankAccountsListsForCompany,
  unMappingBankAccounts,
  unMappingProject,
  getXeroProjectListsForCompany,
  unMappingContact,
  getXeroContactListsForCompany,
  unMappingContract,
  getXeroContractsListsForCompany,
  CreateBankAccountsInXero,
  CreateContactInXero,
  CreateContractInXero,
  CreateProjectInXero,
  manualMappingBankAccounts,
  manualMappingContact,
  manualMappingContract,
  manualMappingProject,
  unMappingBills,
  getXeroBillsListsForCompany,
  manualMappingBills,
  unMappingInvoices,
  getXeroInvoicesListsForCompany,
  getPaytradeContactListsForCompany,
  getPaytradeContractListsForCompany,
  GetPaytradeProjectListsForCompany,
  GetPaytradeBillsListsForCompany,
  GetPaytradePaymentsListsForCompany,
  manualMappingPayments,
  getXeroPaymentsListsForCompany,
  GetPaytradeBankAccountsListsForCompany,
  unMappingPayments,
  syncAllBankAccountsByCompanyId,
} from "../../integration.functions";
import {
  EditAccountInXero,
  DeleteAccountInXero,
  DeleteProjectInXero,
  EditContactInXero,
  DeleteContactInXero,
  DeleteContractInXero,
  CreateInvoiceOrBillInXero,
  EditInvoiceOrBillInXero,
  DeleteInvoiceOrBillInXero,
  CreateBillsInPaytrade,
  CreateInvoiceOrBillInPaytradeRetention,
  CreateClaimInPaytrade,
  CreatePaymentInXero,
  CreateOverPaymentRefundInXero,
  CreateOverPaymentInXero,
  DeletePaymentInXero,
  CreateCreditNotesInXero,
  DeleteCreditNotesInXero,
  DeleteOverPaymentInXero,
  DeleteOverPaymentRefundInXero,
  checkAndCreateOverPaymentAndRefunds,
} from "./syncLog.functions";
import { fetchAllRetentionInPaymentsList } from "@/modules/user/RetentionList/retentionList.functions";
import { fetchSubContractorClaimsByHeadContractor } from "@/modules/user/AddUpdateClaims/AddUpdateClaims.function";
import {
  createContactInPaytradeFromXeroData,
  createContactInPaytradeThroughWebhookFromXeroData,
} from "@/modules/user/ClientsAndSuppliers/AddClientsAndSuppliers/AddClientsAndSuppliers.functions";
import { createProjectInPaytradeFromXeroData } from "@/modules/user/Projects/ProjectList/projects.functions";
import { createContractInPaytradeFromXeroData } from "@/modules/user/Contracts/contracts.functions";

const companyId = +(localStorage.getItem("companyId") || 0);
export const handleResolveByErrorCodeMap = async (
  viewLogData: any,
  setModelConfigSelect: React.Dispatch<React.SetStateAction<any>>,
  setShowManualMapping: React.Dispatch<React.SetStateAction<boolean>>
) => {
  switch (viewLogData.error_code) {
    case "EDIT_BANK_NOT_MAPPED": {
      const data = await getXeroBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${viewLogData?.paytrade_details?.account_name}</b> to:`,
        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "WH_OVERPAYMENT_ACCOUNT_NOT_FOUND":
    case "WH_OVERPAYMENT_ACCOUNT_NOT_MAPPED": {
      await syncAllBankAccountsByCompanyId({
        companyId,
      });
      const data = await GetPaytradeBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });

      const account =
        viewLogData?.xero_records?.[0]?.accountDetails?.name ||
        viewLogData?.xero_records?.[0].xeroBankAccountDetails.account_name;
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${account}</b> to:`,
        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "ADD_BANK_ALREADY_MAPPED_TO_XERO": {
      await unMappingBankAccounts({
        accountId: viewLogData?.api_payload?.account_id,
      });
      const data = await getXeroBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${viewLogData?.paytrade_details?.account_name}</b> to:`,
        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "DELETE_BANK_NOT_MAPPED": {
      const data = await getXeroBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${viewLogData?.paytrade_details?.account_name}</b> to:`,
        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "ADD_PROJECT_ALREADY_MAPPED_TO_XERO": {
      await unMappingProject({
        projectId: viewLogData?.api_payload?.project_id,
      });
      const data = await getXeroProjectListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Project mapping",
        placeHolder: "Select project",
        renderKey: "project_name",
        valueKey: "project_id",
        description: `Map <b>${viewLogData?.paytrade_details?.project_name}</b> to:`,
        options: data?.project_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "DELETE_PROJECT_NOT_MAPPED":
    case "ADD_BILL_PROJECT_NOT_MAPPED":
    case "ADD_INVOICE_PROJECT_NOT_MAPPED":
    case "EDIT_BILL_PROJECT_NOT_MAPPED":
    case "EDIT_INVOICE_PROJECT_NOT_MAPPED":
    case "PD_PROJECT_NOT_MAPPED": {
      const project_name =
        viewLogData?.paytrade_details?.project_name ||
        viewLogData?.paytrade_records?.[0]?.projectDetails?.project_name;
      const data = await getXeroProjectListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Project mapping",
        placeHolder: "Select project",
        renderKey: "project_name",
        valueKey: "project_id",
        description: `Map <b>${project_name}</b> to:`,
        options: data?.project_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "CONTACT_NAME_EXISTS_BUT_UNMAPPED":
    case "CONTACT_NAME_EXISTS_AND_MAPPED": {
      if (viewLogData?.error_code === "CONTACT_NAME_EXISTS_AND_MAPPED") {
        await unMappingContact({
          contactId: viewLogData?.api_payload?.unmapping_contact_id,
        });
      }
      const data = await getPaytradeContactListsForCompany({
        payload: { company_id: companyId },
      });
      let client_supplier_name = viewLogData?.xero_details?.contact_name;
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${client_supplier_name}</b> to:`,
        options: data || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "WH_CONTACT_NAME_EXISTS_AND_MAPPED":
    case "WH_CONTACT_NAME_EXISTS_BUT_UNMAPPED": {
      if (viewLogData?.error_code === "WH_CONTACT_NAME_EXISTS_AND_MAPPED") {
        await unMappingContact({
          contactId: viewLogData?.api_payload?.unmapping_contact_id,
        });
      }
      const data = await getPaytradeContactListsForCompany({
        payload: { company_id: companyId },
      });
      let client_supplier_name = viewLogData?.api_payload?.client_supplier_name;
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${client_supplier_name}</b> to:`,
        options: data || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "ADD_CONTACT_ALREADY_MAPPED_TO_XERO": {
      await unMappingContact({
        contactId: viewLogData?.api_payload?.contact_id,
      });
      const data = await getXeroContactListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${viewLogData?.paytrade_details?.client_supplier_name}</b> to:`,
        options: data?.contact_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "EDIT_CONTACT_NOT_MAPPED":
    case "ADD_BILL_CLIENT_SUPPLIER_NOT_MAPPED":
    case "ADD_INVOICE_CLIENT_SUPPLIER_NOT_MAPPED":
    case "EDIT_BILL_CLIENT_SUPPLIER_NOT_MAPPED":
    case "EDIT_INVOICE_CLIENT_SUPPLIER_NOT_MAPPED":
    case "PD_CLIENT_SUPPLIER_NOT_MAPPED": {
      const data = await getXeroContactListsForCompany({
        payload: { company_id: companyId },
      });
      const client_supplier_name =
        viewLogData?.paytrade_details?.client_supplier_name ||
        viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
          ?.client_supplier_name;
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${client_supplier_name}</b> to:`,
        options: data?.contact_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "XP_ADD_BILL_CLIENT_SUPPLIER_NOT_MAPPED":
    case "XP_ADD_INVOICE_CLIENT_SUPPLIER_NOT_MAPPED":
    case "WH_CONTACT_NOT_MAPPED": {
      const data = await getPaytradeContactListsForCompany({
        payload: { company_id: companyId },
      });
      const client_supplier_name =
        Array.isArray(viewLogData?.xero_records) &&
        typeof viewLogData?.xero_records[0] === "object"
          ? viewLogData?.xero_records[0]?.contact?.name
          : "";
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${client_supplier_name}</b> to:`,
        options: data || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "XP_ADD_BILL_CONTRACT_NOT_MAPPED":
    case "XP_ADD_INVOICE_CONTRACT_NOT_MAPPED":
    case "WH_CONTRACT_NOT_MAPPED":
    case "CONTRACT_NAME_EXISTS_BUT_UNMAPPED":
    case "CONTRACT_NAME_EXISTS_AND_MAPPED": {
      let contract_name =
        Array.isArray(viewLogData?.xero_records) &&
        typeof viewLogData?.xero_records[0] === "object"
          ? viewLogData?.xero_records[0]?.lineItems?.[0]?.tracking?.find(
              (t: any) => t?.name === "Contract"
            )?.option || ""
          : "";
      contract_name =
        contract_name ||
        viewLogData?.paytrade_records?.[0]?.contract_name ||
        "";
      const data = await getPaytradeContractListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Contract mapping",
        placeHolder: "Select contracts",
        renderKey: "contract_name",
        valueKey: "contract_id",
        description: `Map <b>${contract_name}</b> to:`,
        options: data?.contract_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "XP_ADD_INVOICE_PROJECT_NOT_MAPPED":
    case "XP_ADD_BILL_PROJECT_NOT_MAPPED":
    case "WH_PROJECT_NOT_MAPPED":
    case "PROJECT_NAME_EXISTS_BUT_UNMAPPED":
    case "PROJECT_NAME_EXISTS_AND_MAPPED": {
      let project_name =
        Array.isArray(viewLogData?.xero_records) &&
        typeof viewLogData?.xero_records[0] === "object"
          ? viewLogData?.xero_records[0]?.lineItems?.[0]?.tracking?.find(
              (t: any) => t?.name === "Project"
            )?.option || ""
          : "";
      project_name =
        project_name || viewLogData?.paytrade_records?.[0]?.project_name || "";
      const data = await GetPaytradeProjectListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Project mapping",
        placeHolder: "Select project",
        renderKey: "project_name",
        valueKey: "project_id",
        description: `Map <b>${project_name}</b> to:`,
        options: data?.project_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "DELETE_CONTACT_NOT_MAPPED": {
      const data = await getXeroContactListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${viewLogData?.paytrade_details?.client_supplier_name}</b> to:`,
        options: data?.contact_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "ADD_CONTRACT_ALREADY_MAPPED_TO_XERO": {
      await unMappingContract({
        contractId: viewLogData?.api_payload?.contract_id,
      });
      const data = await getXeroContractsListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Contract mapping",
        placeHolder: "Select contracts",
        renderKey: "contract_name",
        valueKey: "contract_id",
        description: `Map <b>${viewLogData?.paytrade_details?.contract_name}</b> to:`,
        options: data?.contract_list || [],
      });
      setShowManualMapping(true);
      break;
    }

    case "DELETE_CONTRACT_NOT_MAPPED":
    case "ADD_BILL_CONTRACT_NOT_MAPPED":
    case "ADD_INVOICE_CONTRACT_NOT_MAPPED":
    case "EDIT_BILL_CONTRACT_NOT_MAPPED":
    case "EDIT_INVOICE_CONTRACT_NOT_MAPPED":
    case "PD_CONTRACT_NOT_MAPPED": {
      const contract_name =
        viewLogData?.paytrade_details?.contract_name ||
        viewLogData?.paytrade_records[0]?.contractDetails?.contract_name;
      const data = await getXeroContractsListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Contract mapping",
        placeHolder: "Select contracts",
        renderKey: "contract_name",
        valueKey: "contract_id",
        description: `Map <b>${contract_name}</b> to:`,
        options: data?.contract_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "DELETE_BILL_NOT_MAPPED":
    case "DELETE_INVOICE_NOT_MAPPED":
    case "EDIT_BILL_NOT_MAPPED":
    case "EDIT_INVOICE_NOT_MAPPED":
    case "PD_CLAIM_NOT_MAPPED": {
      const total_amount = viewLogData?.paytrade_records?.[0]?.claim_amount;
      const dueDate = viewLogData?.paytrade_records?.[0]?.due_date;
      const client_supplier_name =
        viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
          ?.client_supplier_name;
      const data = await getXeroBillsListsForCompany({
        payload: {
          company_id: companyId,
          type: viewLogData?.sync_type == "Bills" ? "bill" : "invoice",
          mapped_status: "Unmapped",
        },
      });
      setModelConfigSelect({
        title:
          viewLogData?.sync_type == "Bills"
            ? "Bill mapping"
            : "Invoice mapping",
        placeHolder:
          viewLogData?.sync_type == "Bills" ? "Select Bill" : "Select Invoice",
        renderKey: "label",
        valueKey: "invoice_id",
        description: `<div class="text_center">
                    Do you wish to map the below ${
                      viewLogData?.sync_type == "Bills" ? "bill" : "invoice"
                    }?
                    <div style="margin-top: 10px;">
                      ${
                        total_amount
                          ? `<b>Total Amount:</b>&nbsp;${total_amount}<br />`
                          : ""
                      }
                      ${
                        client_supplier_name
                          ? `<b>Contact Name:</b>&nbsp;${client_supplier_name}<br />`
                          : ""
                      }
                      ${
                        dueDate
                          ? `<b>Due date:</b>&nbsp;${formatDate(dueDate)}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options:
          data?.invoice_list.map((val: any) => {
            return {
              ...val,
              label: `Invoice Id : ${val.invoice_id} Due Date: ${formatDate(
                val?.due_date
              )} 
                    Total Amount : ${
                      val?.total_amount
                        ? Number(val?.total_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"
                    } Contact :  ${val?.contact_name}`,
            };
          }) || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "OP_CLAIM_NOT_MAPPED":
    case "OPR_CLAIM_NOT_MAPPED":
    case "PD_CLAIM_NOT_AUTHORIZED":
    case "DELETE_PD_CLAIM_NOT_MAPPED":
    case "DELETE_OP_CLAIM_NOT_MAPPED":
    case "DELETE_OPR_CLAIM_NOT_MAPPED": {
      const total_amount = viewLogData?.paytrade_records?.[0]?.total_amount;
      const dueDate =
        viewLogData?.paytrade_records?.[0]?.paymentClaims.due_date;
      const client_supplier_name =
        viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
          ?.client_supplier_name;
      const type =
        viewLogData?.paytrade_records?.[0]?.paymentClaims?.claim_type ==
        "Billable"
          ? "Bills"
          : "Invoices";
      const data = await getXeroBillsListsForCompany({
        payload: {
          company_id: companyId,

          mapped_status: "Unmapped",
        },
      });
      setModelConfigSelect({
        title: type == "Bills" ? "Bill mapping" : "Invoice mapping",
        placeHolder: type == "Bills" ? "Select Bill" : "Select Invoice",
        renderKey: "label",
        valueKey: "invoice_id",
        description: `<div class="text_center">
                    Do you wish to map the below bill?
                    <div style="margin-top: 10px;">
                      ${
                        total_amount
                          ? `<b>Total Amount:</b>&nbsp;$${total_amount}<br />`
                          : ""
                      }
                      ${
                        client_supplier_name
                          ? `<b>Contact Name:</b>&nbsp;${client_supplier_name}<br />`
                          : ""
                      }
                      ${
                        dueDate
                          ? `<b>Due date:</b>&nbsp;${formatDate(dueDate)}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options:
          data?.invoice_list.map((val: any) => {
            return {
              ...val,
              label: ` 
    <strong>Invoice Id:</strong> ${val.invoice_id}  
    <strong>Due Date:</strong> ${formatDate(val?.due_date)}  
    <strong>Total Amount:</strong> $${
      val?.total_amount
        ? Number(val?.total_amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "0.00"
    } 
    <strong>Contact:</strong> ${val?.contact_name}
  `,
            };
          }) || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "CN_CLAIM_NOT_MAPPED":
    case "DELETE_CN_CLAIM_NOT_MAPPED": {
      const total_amount = viewLogData?.paytrade_records?.[0]?.total_amount;
      const dueDate =
        viewLogData?.paytrade_records?.[0]?.paymentClaims.due_date;
      const client_supplier_name =
        viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
          ?.client_supplier_name;
      const type =
        viewLogData?.paytrade_records?.[0]?.paymentClaims?.claim_type ==
        "Billable"
          ? "Bills"
          : "Invoices";
      const data = await getXeroBillsListsForCompany({
        payload: {
          company_id: companyId,

          mapped_status: "Unmapped",
        },
      });
      setModelConfigSelect({
        title: type == "Bills" ? "Bill mapping" : "Invoice mapping",
        placeHolder: type == "Bills" ? "Select Bill" : "Select Invoice",
        renderKey: "label",
        valueKey: "invoice_id",
        description: `<div class="text_center">
                    Do you wish to map the below bill?
                    <div style="margin-top: 10px;">
                      ${
                        total_amount
                          ? `<b>Total Amount:</b>&nbsp;${total_amount}<br />`
                          : ""
                      }
                      ${
                        client_supplier_name
                          ? `<b>Contact Name:</b>&nbsp;${client_supplier_name}<br />`
                          : ""
                      }
                      ${
                        dueDate
                          ? `<b>Due date:</b>&nbsp;${formatDate(dueDate)}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options:
          data?.invoice_list.map((val: any) => {
            return {
              ...val,
              label: `<strong>Invoice Id:</strong> ${
                val.invoice_id
              } <strong>Due Date:</strong> ${formatDate(val?.due_date)}
    <strong>Total Amount:</strong> ${
      val?.total_amount
        ? Number(val?.total_amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "0.00"
    }
    <strong>Contact:</strong> ${val?.contact_name}`,
            };
          }) || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "CN_CLIENT_SUPPLIER_NOT_MAPPED":
    case "DELETE_OP_CLIENT_SUPPLIER_NOT_MAPPED":
    case "OP_CLIENT_SUPPLIER_NOT_MAPPED": {
      const data = await getXeroContactListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${viewLogData.paytrade_records?.[0]?.clientSupplierDetails?.client_supplier_name}</b> to:`,
        options: data?.contact_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "ADD_BILL_MAPPED_TO_XERO": {
      await unMappingBills({
        invoiceId: viewLogData?.api_payload?.invoice_id,
      });
      const data = await getXeroBillsListsForCompany({
        payload: {
          company_id: companyId,
          type: viewLogData?.sync_type == "Bills" ? "bill" : "invoice",
          mapped_status: "Unmapped",
        },
      });
      setModelConfigSelect({
        title: "Bill mapping",
        placeHolder: "Select Bill",
        renderKey: "label",
        valueKey: "invoice_id",
        description: `<div class="text_center">
                    Do you wish to map the below bill?
                    <div style="margin-top: 10px;">
                      ${
                        viewLogData?.paytrade_details?.total_amount
                          ? `<b>Total Amount:</b>&nbsp;${viewLogData?.paytrade_details?.total_amount}<br />`
                          : ""
                      }
                      ${
                        viewLogData?.paytrade_details?.contact_name
                          ? `<b>Contact Name:</b>&nbsp;${viewLogData?.paytrade_details?.contact_name}<br />`
                          : ""
                      }
                      ${
                        viewLogData?.paytrade_details?.due_date
                          ? `<b>Due date:</b>&nbsp;${formatDate(
                              viewLogData?.paytrade_details?.due_date
                            )}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options:
          data?.invoice_list.map((val: any) => {
            return {
              ...val,
              label: `Invoice Id : ${val.invoice_id} Due Date: ${formatDate(
                val?.due_date
              )} 
                    Total Amount : ${
                      val?.total_amount
                        ? Number(val?.total_amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"
                    } Contact :  ${val?.contact_name}`,
            };
          }) || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "XP_ADD_BILL_ALREADY_MAPPED_TO_PAYTRADE":
    case "XP_ADD_INVOICE_ALREADY_MAPPED_TO_PAYTRADE": {
      await unMappingBills({
        invoiceId: viewLogData?.api_payload?.invoice_id,
      });
      const data = await GetPaytradeBillsListsForCompany({
        payload: {
          company_id: companyId,
          type: viewLogData?.sync_type == "Bills" ? "bill" : "invoice",
          mapped_status: "Unmapped",
        },
      });
      const total_amount = viewLogData?.xero_records[0].total;
      const contact = viewLogData?.xero_records[0]?.contact?.name;
      const dueDate = viewLogData.xero_records[0].dueDate;
      setModelConfigSelect({
        title: "Bill mapping",
        placeHolder: "Select Bill",
        renderKey: "label",
        valueKey: "invoice_id",
        description: `<div class="text_center">
                    Do you wish to map the below bill?
                    <div style="margin-top: 10px;">
                      ${
                        total_amount
                          ? `<b>Total Amount:</b>&nbsp;${total_amount}<br />`
                          : ""
                      }
                      ${
                        contact
                          ? `<b>Contact Name:</b>&nbsp;${contact}<br />`
                          : ""
                      }
                      ${
                        dueDate
                          ? `<b>Due date:</b>&nbsp;${formatDate(dueDate)}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options:
          data?.invoice_list.map((val: any) => {
            return {
              ...val,
              label: `Invoice Id : ${val.invoice_id} Due Date: ${formatDate(
                val?.due_date
              )} \n 
              Total Amount : ${
                val?.total_amount
                  ? Number(val?.total_amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "0.00"
              } \n Contact :  ${val?.contact_name}`,
            };
          }) || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "ADD_INVOICE_MAPPED_TO_XERO": {
      await unMappingInvoices({
        invoiceId: viewLogData?.api_payload?.invoice_id,
      });
      const data = await getXeroInvoicesListsForCompany({
        payload: {
          company_id: companyId,
          type: viewLogData?.sync_type == "Bills" ? "bill" : "invoice",
          mapped_status: "Unmapped",
        },
      });
      setModelConfigSelect({
        title: "Invoice mapping",
        placeHolder: "Select Invoice",
        renderKey: "label",
        valueKey: "invoice_id",
        description: `<div class="text_center">
                    Do you wish to map the below bill?
                    <div style="margin-top: 10px;">
                      ${
                        viewLogData?.paytrade_details?.total_amount
                          ? `<b>Total Amount:</b>&nbsp;${viewLogData?.paytrade_details?.total_amount}<br />`
                          : ""
                      }
                      ${
                        viewLogData?.paytrade_details?.contact_name
                          ? `<b>Contact Name:</b>&nbsp;${viewLogData?.paytrade_details?.contact_name}<br />`
                          : ""
                      }
                      ${
                        viewLogData?.paytrade_details?.due_date
                          ? `<b>Due date:</b>&nbsp;${formatDate(
                              viewLogData?.paytrade_details?.due_date
                            )}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options:
          data?.invoice_list.map((val: any) => {
            return {
              ...val,
              label: `Invoice Id : ${val.invoice_id} Due Date: ${formatDate(
                val?.due_date
              )} 
                          Total Amount : ${
                            val?.total_amount
                              ? Number(val?.total_amount).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )
                              : "0.00"
                          }  Contact :  ${val?.contact_name}`,
            };
          }) || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "XP_ADD_BILL_RETENTION_LIST_UNIDENTIFIED":
    case "XP_ADD_INVOICE_RETENTION_LIST_UNIDENTIFIED":
    case "XP_ADD_BILL_MULTIPLE_RETENTIONS_IDENTIFIED":
    case "XP_ADD_INVOICE_MULTIPLE_RETENTIONS_IDENTIFIED":
    case "WH_RETENTION_LIST_UNIDENTIFIED":
    case "WH_MUTIPLE_RETENTIONS_IDENTIFIED": {
      const retentionList = await fetchAllRetentionInPaymentsList({
        company_id: companyId,
        project_id: viewLogData?.api_payload?.project_id,
        contract_id: viewLogData?.api_payload?.contract_id,
        page_number: 1,
      });
      const retentionListMod = retentionList.data.map((user: any) => {
        return {
          ...user,
          retention_list_id: user?.retention_list_id || "",
          project_name: user?.project_name || "",
          contract_name: user?.contract_name || "",
          claim_type: user?.claim_type || "",
          retention_trust_account_name:
            user?.retention_trust_account_name || "",
          retained_amount: user?.retained_amount
            ? `$ ${convertPositiveDecimalTwoDigit(user?.retained_amount, true)}`
            : "$ 0.00",
          render:
            "<strong>Retention Type:</strong> " +
            user?.claim_type +
            " <strong>Retention Trust Account:</strong> " +
            user?.retention_trust_account_name +
            "<br/> <strong>Retained AMT:</strong> " +
            (user?.retained_amount
              ? ` $ ${convertPositiveDecimalTwoDigit(
                  user?.retained_amount,
                  true
                )}`
              : " $ 0.00") +
            " <strong>Beneficiary:</strong> " +
            user?.contract_name,
          value: user?.retention_list_id + "," + user?.sub_payment_id,
        };
      });
      setModelConfigSelect({
        title: "Retention list",
        placeHolder: "Select retention",
        renderKey: "render",
        valueKey: "value",
        description: "Select a retention option:",
        options: retentionListMod || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "PD_ACCOUNT_NOT_MAPPED":
    case "OP_ACCOUNT_NOT_MAPPED": {
      const data = await getXeroBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });
      const account_name =
        viewLogData?.paytrade_records?.[0]?.paymentClaims?.claim_type ==
        "Billable"
          ? viewLogData?.paytrade_records?.[0]?.paymentFromAccount?.account_name
          : viewLogData?.paytrade_records?.[0]?.paymentToAccount?.account_name;
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${account_name}</b> to:`,

        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "PD_RETENTION_ACCOUNT_NOT_MAPPED":
    case "DELETE_PD_RETENTION_ACCOUNT_NOT_MAPPED": {
      const data = await getXeroBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });
      const account_name =
        viewLogData?.paytrade_records?.[0]?.retentionAccount?.account_name;
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${account_name}</b> to:`,

        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "OPR_OVERPAYMENT_NOT_MAPPED":
    case "DELETE_OP_STATUS_UNAUTHORISED":
    case "DELETE_OPR_REFUND_NOT_MAPPED": {
      const data = await getXeroPaymentsListsForCompany({
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      });
      const contact_name =
        viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
          ?.client_supplier_name;
      const total_amount = viewLogData?.paytrade_records?.[0]?.total_amount;
      const dueDate =
        viewLogData?.paytrade_records?.[0]?.paymentClaims?.due_date;
      setModelConfigSelect({
        title: "Payment mapping",
        placeHolder: "Select account",
        renderKey: "label",
        valueKey: "label",
        description: `<div class="text_center">
                    Do you wish to map the below payment?
                    <div style="margin-top: 10px;">
                      ${
                        total_amount
                          ? `<b>Total Amount:</b>&nbsp;$${total_amount}<br />`
                          : ""
                      }
                      ${
                        contact_name
                          ? `<b>Contact Name:</b>&nbsp;${contact_name}<br />`
                          : ""
                      }
                      ${
                        dueDate
                          ? `<b>Due date:</b>&nbsp;${formatDate(dueDate)}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options: data?.payment_list.map((val: any) => {
          return {
            ...val,
            label: `<strong>Payment date:</strong> ${
              val?.payment_date ? formatDate(val?.payment_date) : "N/A"
            } 
            <strong>Total Amount:</strong> ${
              val?.payment_amount
                ? "$" +
                  Number(val?.payment_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            } 
            <strong>Contact:</strong> ${val?.contact_name || "N/A"}
            <strong>Payment Id:</strong> ${val?.payment_id}`,
          };
        }),
      });
      setShowManualMapping(true);
      break;
    }

    case "DELETE_OPR_OVERPAYMENT_NOT_MAPPED": {
      const data = await GetPaytradePaymentsListsForCompany({
        payload: {
          company_id: +(localStorage.getItem("companyId") || 0),
        },
      });
      const contact_name =
        viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
          ?.client_supplier_name;
      const total_amount = viewLogData?.paytrade_records?.[0]?.total_amount;
      const dueDate =
        viewLogData?.paytrade_records?.[0]?.paymentClaims?.due_date;
      setModelConfigSelect({
        title: "Payment mapping",
        placeHolder: "Select account",
        renderKey: "label",
        valueKey: "label",
        description: `<div class="text_center">
                    Do you wish to map the below payment?
                    <div style="margin-top: 10px;">
                      ${
                        total_amount
                          ? `<b>Total Amount:</b>&nbsp;$${total_amount}<br />`
                          : ""
                      }
                      ${
                        contact_name
                          ? `<b>Contact Name:</b>&nbsp;${contact_name}<br />`
                          : ""
                      }
                      ${
                        dueDate
                          ? `<b>Due date:</b>&nbsp;${formatDate(dueDate)}`
                          : ""
                      }
                    </div>
                    to:
                  </div>`,
        options: data?.payment_list.map((val: any) => {
          return {
            ...val,
            label: `<strong>Payment date:</strong> ${
              val?.payment_date ? formatDate(val?.payment_date) : "N/A"
            } 
            <strong>Total Amount:</strong> ${
              val?.payment_amount
                ? "$" +
                  Number(val?.payment_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            } 
            <strong>Contact:</strong> ${val?.contact_name || "N/A"}
            <strong>Payment Id:</strong> ${val?.payment_id}`,
          };
        }),
      });
      setShowManualMapping(true);
      break;
    }
    case "OPR_ACCOUNT_NOT_MAPPED":
    case "DELETE_OP_ACCOUNT_NOT_MAPPED": {
      const data = await GetPaytradeBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });
      let account_name =
        viewLogData?.paytrade_records?.[0]?.paymentClaims?.claim_type ==
        "Billable"
          ? viewLogData?.paytrade_records?.[0]?.paymentFromAccount?.account_name
          : viewLogData?.paytrade_records?.[0]?.paymentToAccount?.account_name;
      if (!account_name) {
        account_name =
          viewLogData?.paytrade_records?.[0]?.paymentFromAccount
            ?.account_name ||
          viewLogData?.paytrade_records?.[0]?.paymentToAccount?.account_name;
      }
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${account_name}</b> to:`,

        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "OPR_CLIENT_SUPPLIER_NOT_MAPPED": {
      const data = await getXeroContactListsForCompany({
        payload: { company_id: companyId },
      });
      setModelConfigSelect({
        title: "Contact mapping",
        placeHolder: "Select Contact",
        renderKey: "contact_name",
        valueKey: "contact_id",
        description: `Map <b>${viewLogData?.paytrade_records?.[0]?.clientSupplierDetails?.client_supplier_name}</b> to:`,
        options: data?.contact_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    case "WH_PAYMENT_ACCOUNT_NOT_MAPPED":
    case "WH_RETENTION_ACCOUNT_NOT_MAPPED": {
      const data = await GetPaytradeBankAccountsListsForCompany({
        payload: { company_id: companyId },
      });
      let account_name =
        viewLogData?.xero_records?.[0]?.xeroBankAccountDetails?.account_name;
      setModelConfigSelect({
        title: "Account mapping",
        placeHolder: "Select account",
        renderKey: "account_name",
        valueKey: "account_id",
        description: `Map <b>${account_name}</b> to:`,

        options: data?.account_list || [],
      });
      setShowManualMapping(true);
      break;
    }
    default:
      break;
  }
};

export const handleManualMappingLogic = async (
  viewLogData: any,
  manualMapData: any
): Promise<void> => {
  try {
    switch (viewLogData.error_code) {
      case "WH_OVERPAYMENT_ACCOUNT_NOT_FOUND":
      case "WH_OVERPAYMENT_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: viewLogData?.api_payload?.account_id,
            pt_bank_account_id: +manualMapData?.account_id,
          },
        });
        if (response) {
          await checkAndCreateOverPaymentAndRefunds({
            contactId: viewLogData?.api_payload?.contact_id ?? null,
            tenantId: viewLogData?.api_payload?.tenant_id ?? null,
            associatedOverpaymentId: null,
            associatedPaymentId: null,
            overpaymentId: viewLogData?.api_payload?.overpayment_id ?? null,
            paymentClaimId: null,
            projectId: null,
            syncId: viewLogData?.id ?? null,
          });
        }
        break;
      }
      case "EDIT_BANK_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: manualMapData?.account_id,
            pt_bank_account_id: +viewLogData?.paytrade_details?.bank_account_id,
          },
        });
        if (response) {
          await EditAccountInXero({
            bankAccountId: +viewLogData?.api_payload?.bank_account_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "ADD_BANK_ALREADY_MAPPED_TO_XERO": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: manualMapData?.account_id,
            pt_bank_account_id: +viewLogData?.paytrade_details?.bank_account_id,
          },
        });
        if (response) {
          await CreateBankAccountsInXero({
            bankAccountId: +viewLogData?.api_payload?.bank_account_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "DELETE_BANK_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: manualMapData?.account_id,
            pt_bank_account_id: +viewLogData?.paytrade_details?.bank_account_id,
          },
        });
        if (response) {
          await DeleteAccountInXero({
            bankAccountId: +viewLogData?.api_payload?.bank_account_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "ADD_PROJECT_ALREADY_MAPPED_TO_XERO": {
        const response = await manualMappingProject({
          payload: {
            project_id: manualMapData?.project_id,
            pt_project_id: viewLogData?.api_payload?.pt_project_id,
          },
        });
        if (response) {
          await CreateProjectInXero({
            projectId: viewLogData?.api_payload?.pt_project_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "DELETE_PROJECT_NOT_MAPPED": {
        const response = await manualMappingProject({
          payload: {
            project_id: manualMapData?.project_id,
            pt_project_id: viewLogData?.api_payload?.project_id,
          },
        });
        if (response) {
          await DeleteProjectInXero({
            projectId: +viewLogData?.api_payload?.project_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "ADD_BILL_PROJECT_NOT_MAPPED":
      case "ADD_INVOICE_PROJECT_NOT_MAPPED": {
        const response = await manualMappingProject({
          payload: {
            project_id: manualMapData?.project_id,
            pt_project_id: viewLogData?.api_payload?.project_id,
          },
        });
        if (response) {
          await CreateInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "EDIT_BILL_PROJECT_NOT_MAPPED":
      case "EDIT_INVOICE_PROJECT_NOT_MAPPED": {
        const project_id =
          viewLogData?.api_payload?.project_id ||
          viewLogData?.paytrade_records?.[0]?.project_id;
        const response = await manualMappingProject({
          payload: {
            project_id: manualMapData?.project_id,
            pt_project_id: project_id,
          },
        });
        if (response) {
          await EditInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "PD_PROJECT_NOT_MAPPED": {
        const project_id =
          viewLogData?.api_payload?.project_id ||
          viewLogData?.paytrade_records?.[0]?.project_id;
        const response = await manualMappingProject({
          payload: {
            project_id: manualMapData?.project_id,
            pt_project_id: project_id,
          },
        });
        if (response) {
          await CreatePaymentInXero({
            payload: {
              amount: viewLogData?.api_payload?.amount ?? null,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
              payment_date: viewLogData?.api_payload?.payment_date ?? null,
              payment_id: viewLogData?.api_payload?.payment_id ?? null,
              retention_account:
                +viewLogData?.api_payload?.retention_account || null,
              retention_amount: +viewLogData?.api_payload?.retention_amount,
              sync_id: viewLogData?.id ?? null,
            },
          });
        }
        break;
      }
      case "ADD_CONTACT_ALREADY_MAPPED_TO_XERO": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id: viewLogData?.api_payload?.client_supplier_id,
          },
        });
        if (response) {
          await CreateContactInXero({
            clientSupplierId: +viewLogData?.api_payload?.client_supplier_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "EDIT_CONTACT_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id: viewLogData?.api_payload?.client_supplier_id,
          },
        });
        if (response) {
          await EditContactInXero({
            clientSupplierId: +viewLogData?.api_payload?.client_supplier_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "ADD_BILL_CLIENT_SUPPLIER_NOT_MAPPED":
      case "ADD_INVOICE_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id: viewLogData?.api_payload?.client_supplier_id,
          },
        });
        if (response) {
          await CreateInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "DELETE_CONTACT_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id: viewLogData?.api_payload?.client_supplier_id,
          },
        });
        if (response) {
          await DeleteContactInXero({
            clientSupplierId: +viewLogData?.api_payload?.client_supplier_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "EDIT_BILL_CLIENT_SUPPLIER_NOT_MAPPED":
      case "EDIT_INVOICE_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id:
              viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
                ?.client_supplier_id,
          },
        });
        if (response) {
          await EditInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "XP_ADD_BILL_CLIENT_SUPPLIER_NOT_MAPPED":
      case "XP_ADD_INVOICE_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            pt_contact_id: manualMapData?.contact_id,
            contact_id: viewLogData?.api_payload?.contact_id,
          },
        });
        if (response) {
          await CreateBillsInPaytrade({
            companyId: +(localStorage.getItem("companyId") || 0),
            invoiceId: viewLogData?.api_payload?.invoice_id,
          });
        }
        break;
      }
      case "CONTACT_NAME_EXISTS_BUT_UNMAPPED":
      case "CONTACT_NAME_EXISTS_AND_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            pt_contact_id: manualMapData?.contact_id,
            contact_id: viewLogData?.api_payload?.contact_id,
          },
        });
        if (response) {
          const {
            id,
            is_deleted,
            client_supplier_id,
            contact_name,
            notice_generated,
            updated_by,
            updated_group,
            updated_on,
            account_details = [],
            ...rest
          } = viewLogData?.paytrade_records[0];
          await createContactInPaytradeFromXeroData(
            {
              payload: {
                ...rest,
                account_details,
              },
              syncId: viewLogData?.id,
              companyId: Number(localStorage.getItem("companyId")),
              contactId: viewLogData?.api_payload?.contact_id,
            },
            true
          );
        }
        break;
      }
      case "WH_CONTACT_NAME_EXISTS_AND_MAPPED":
      case "WH_CONTACT_NAME_EXISTS_BUT_UNMAPPED": {
        const response = await manualMappingContact({
          payload: {
            pt_contact_id: manualMapData?.contact_id,
            contact_id: viewLogData?.api_payload?.contact_id,
          },
        });
        if (response) {
          const {
            id,
            is_deleted,
            client_supplier_id,
            contact_name,
            notice_generated,
            updated_by,
            updated_group,
            updated_on,
            account_details = [],
            unmapContactDetails,
            ...rest
          } = viewLogData?.paytrade_records[0];
          await createContactInPaytradeThroughWebhookFromXeroData(
            {
              payload: {
                ...rest,
                account_details,
              },
              syncId: viewLogData?.id,
              companyId: Number(localStorage.getItem("companyId")),
              contactId: viewLogData?.api_payload?.contact_id,
              tenantId: viewLogData?.api_payload?.tenant_id,
            },
            true
          );
        }
        break;
      }
      case "WH_CONTACT_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            pt_contact_id: manualMapData?.contact_id,
            contact_id: viewLogData?.api_payload?.contact_id,
          },
        });
        if (response) {
          await CreateClaimInPaytrade({
            associatedRetentionSubPaymentId: null,
            retentionId: null,
            invoiceId: viewLogData?.api_payload?.invoice_id || null,
            tenantId: viewLogData?.api_payload?.tenant_id || null,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "XP_ADD_BILL_CONTRACT_NOT_MAPPED":
      case "XP_ADD_INVOICE_CONTRACT_NOT_MAPPED": {
        const response = await manualMappingContract({
          payload: {
            pt_contract_id: manualMapData?.contract_id,
            contract_id: viewLogData?.api_payload?.contract_id,
          },
        });
        if (response) {
          await CreateBillsInPaytrade({
            companyId: +(localStorage.getItem("companyId") || 0),
            invoiceId: viewLogData?.api_payload?.invoice_id,
          });
        }
        break;
      }
      case "WH_CONTRACT_NOT_MAPPED": {
        const response = await manualMappingContract({
          payload: {
            pt_contract_id: manualMapData?.contract_id,
            contract_id: viewLogData?.api_payload?.contract_id,
          },
        });
        if (response) {
          await CreateClaimInPaytrade({
            associatedRetentionSubPaymentId: null,
            retentionId: null,
            invoiceId: viewLogData?.api_payload?.invoice_id || null,
            tenantId: viewLogData?.api_payload?.tenant_id || null,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "XP_ADD_INVOICE_PROJECT_NOT_MAPPED":
      case "XP_ADD_BILL_PROJECT_NOT_MAPPED": {
        const project_id = viewLogData?.api_payload?.project_id;
        const response = await manualMappingProject({
          payload: {
            pt_project_id: manualMapData?.project_id,
            project_id: project_id,
          },
        });
        if (response) {
          await CreateBillsInPaytrade({
            companyId: +(localStorage.getItem("companyId") || 0),
            invoiceId: viewLogData?.api_payload?.invoice_id,
          });
        }
        break;
      }
      case "WH_PROJECT_NOT_MAPPED": {
        const project_id = viewLogData?.api_payload?.project_id;
        const response = await manualMappingProject({
          payload: {
            pt_project_id: manualMapData?.project_id,
            project_id: project_id,
          },
        });
        if (response) {
          await CreateClaimInPaytrade({
            associatedRetentionSubPaymentId: null,
            retentionId: null,
            invoiceId: viewLogData?.api_payload?.invoice_id || null,
            tenantId: viewLogData?.api_payload?.tenant_id || null,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "PROJECT_NAME_EXISTS_BUT_UNMAPPED": {
        const project_id = viewLogData?.api_payload?.project_id;
        const response = await manualMappingProject({
          payload: {
            pt_project_id: manualMapData?.project_id,
            project_id: project_id,
          },
        });
        if (response) {
          const { unmapProjectDetails, id, ...rest } =
            viewLogData?.paytrade_records?.[0];
          await createProjectInPaytradeFromXeroData({
            ...rest,
            company_id: companyId,
            project_id: viewLogData?.api_payload?.project_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "PROJECT_NAME_EXISTS_AND_MAPPED": {
        await unMappingProject({
          projectId: viewLogData?.api_payload?.unmapping_project_id,
        });
        const project_id = viewLogData?.api_payload?.project_id;
        const response = await manualMappingProject({
          payload: {
            pt_project_id: manualMapData?.project_id,
            project_id: project_id,
          },
        });
        if (response) {
          const { unmapProjectDetails, id, ...rest } =
            viewLogData?.paytrade_records?.[0];
          await createProjectInPaytradeFromXeroData({
            ...rest,
            company_id: companyId,
            project_id: viewLogData?.api_payload?.project_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "ADD_CONTRACT_ALREADY_MAPPED_TO_XERO": {
        const response = await manualMappingContract({
          payload: {
            contract_id: manualMapData?.contract_id,
            pt_contract_id: viewLogData?.api_payload?.contract_id,
          },
        });
        if (response) {
          await CreateContractInXero({
            contractId: +viewLogData?.api_payload?.contract_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "CONTRACT_NAME_EXISTS_BUT_UNMAPPED": {
        const response = await manualMappingContract({
          payload: {
            contract_id: viewLogData?.api_payload?.contract_id,
            pt_contract_id: manualMapData?.contract_id,
          },
        });
        if (response) {
          const { id, contract_id, ...rest } =
            viewLogData?.paytrade_records?.[0];
          let payload = {
            companyId,
            contractId: viewLogData?.api_payload?.contract_id,
            syncId: viewLogData?.id,
            payload: rest,
          };
          await createContractInPaytradeFromXeroData(payload);
        }
        break;
      }
      case "CONTRACT_NAME_EXISTS_AND_MAPPED": {
        await unMappingContract({
          contractId: viewLogData?.api_payload?.unmapping_contract_id,
        });
        const response = await manualMappingContract({
          payload: {
            contract_id: viewLogData?.api_payload?.unmapping_contract_id,
            pt_contract_id: manualMapData?.contract_id,
          },
        });
        if (response) {
          const { id, contract_id, unmapContractDetails, ...rest } =
            viewLogData?.paytrade_records?.[0];
          let payload = {
            companyId,
            contractId: viewLogData?.api_payload?.contract_id,
            syncId: viewLogData?.id,
            payload: rest,
          };
          await createContractInPaytradeFromXeroData(payload);
        }
        break;
      }
      case "EDIT_BILL_CONTRACT_NOT_MAPPED":
      case "EDIT_INVOICE_CONTRACT_NOT_MAPPED": {
        const contract_id =
          viewLogData?.api_payload?.contract_id ||
          viewLogData?.paytrade_records[0]?.contractDetails?.contract_name;
        const response = await manualMappingContract({
          payload: {
            contract_id: manualMapData?.contract_id,
            pt_contract_id: contract_id,
          },
        });
        if (response) {
          await EditInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "ADD_BILL_CONTRACT_NOT_MAPPED":
      case "ADD_INVOICE_CONTRACT_NOT_MAPPED": {
        const response = await manualMappingContract({
          payload: {
            contract_id: manualMapData?.contract_id,
            pt_contract_id: viewLogData?.api_payload?.contract_id,
          },
        });
        if (response) {
          await CreateInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "DELETE_CONTRACT_NOT_MAPPED": {
        const response = await manualMappingContract({
          payload: {
            contract_id: manualMapData?.contract_id,
            pt_contract_id: viewLogData?.api_payload?.contract_id,
          },
        });
        if (response) {
          await DeleteContractInXero({
            contractId: +viewLogData?.api_payload?.contract_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "ADD_BILL_MAPPED_TO_XERO":
      case "ADD_INVOICE_MAPPED_TO_XERO": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id,
            pt_claim_id: viewLogData?.api_payload?.invoice_id,
          },
        });
        if (response) {
          await CreateInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "XP_ADD_BILL_ALREADY_MAPPED_TO_PAYTRADE":
      case "XP_ADD_INVOICE_ALREADY_MAPPED_TO_PAYTRADE": {
        const response = await manualMappingBills({
          payload: {
            pt_claim_id: manualMapData?.invoice_id,
            invoice_id: viewLogData?.api_payload?.invoice_id,
          },
        });
        if (response) {
          await CreateBillsInPaytrade({
            companyId: +(localStorage.getItem("companyId") || 0),
            invoiceId: viewLogData?.api_payload?.invoice_id,
          });
        }
        break;
      }
      case "EDIT_BILL_NOT_MAPPED":
      case "EDIT_INVOICE_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id,
            pt_claim_id: +viewLogData?.api_payload?.payment_claim_id,
          },
        });
        if (response) {
          await EditInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "PD_CLAIM_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id,
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await CreatePaymentInXero({
            payload: {
              amount: viewLogData?.api_payload?.amount ?? null,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
              payment_date: viewLogData?.api_payload?.payment_date ?? null,
              payment_id: viewLogData?.api_payload?.payment_id ?? null,
              retention_account:
                +viewLogData?.api_payload?.retention_account || null,
              retention_amount: +viewLogData?.api_payload?.retention_amount,
              sync_id: viewLogData?.id ?? null,
            },
          });
        }
        break;
      }
      case "DELETE_BILL_NOT_MAPPED":
      case "DELETE_INVOICE_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id,
            pt_claim_id: +viewLogData?.api_payload?.payment_claim_id,
          },
        });
        if (response) {
          await DeleteInvoiceOrBillInXero({
            paymentClaimId: +viewLogData?.api_payload?.payment_claim_id,
            syncId: viewLogData?.id,
          });
        }
        break;
      }
      case "XP_ADD_BILL_RETENTION_LIST_UNIDENTIFIED":
      case "XP_ADD_INVOICE_RETENTION_LIST_UNIDENTIFIED":
      case "XP_ADD_BILL_MULTIPLE_RETENTIONS_IDENTIFIED":
      case "XP_ADD_INVOICE_MULTIPLE_RETENTIONS_IDENTIFIED": {
        await CreateInvoiceOrBillInPaytradeRetention({
          companyId: companyId,
          invoiceId: viewLogData?.api_payload?.invoice_id,
          syncId: viewLogData?.id,
          associatedRetentionSubPaymentId: manualMapData?.sub_payment_id,
          retentionId: manualMapData?.retention_list_id,
        });
        break;
      }
      case "WH_RETENTION_LIST_UNIDENTIFIED":
      case "WH_MUTIPLE_RETENTIONS_IDENTIFIED": {
        await CreateClaimInPaytrade({
          associatedRetentionSubPaymentId:
            manualMapData?.sub_payment_id || null,
          retentionId: manualMapData?.retention_list_id || null,
          invoiceId: viewLogData?.api_payload?.invoice_id || null,
          tenantId: viewLogData?.api_payload?.tenant_id || null,
          syncId: viewLogData?.id,
        });
        break;
      }
      case "OP_CLAIM_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id?.toString(),
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await CreateOverPaymentInXero({
            payload: {
              amount: +viewLogData?.api_payload?.amount,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              payment_date: viewLogData?.api_payload?.payment_date,
              payment_id: +viewLogData?.api_payload?.payment_id,
              sync_id: viewLogData?.id,
            },
          });
        }
        break;
      }

      case "PD_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: manualMapData?.account_id,
            pt_bank_account_id: +viewLogData?.api_payload?.bank_account_id,
          },
        });
        if (response) {
          await CreatePaymentInXero({
            payload: {
              amount: viewLogData?.api_payload?.amount ?? null,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
              payment_date: viewLogData?.api_payload?.payment_date ?? null,
              payment_id: viewLogData?.api_payload?.payment_id ?? null,
              retention_account:
                +viewLogData?.api_payload?.retention_account || null,
              retention_amount: +viewLogData?.api_payload?.retention_amount,
              sync_id: viewLogData?.id ?? null,
            },
          });
        }
        break;
      }
      case "PD_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id:
              viewLogData?.paytrade_details?.client_supplier_name ||
              viewLogData?.paytrade_records?.[0]?.clientSupplierDetails
                ?.client_supplier_name,
          },
        });
        if (response) {
          await CreatePaymentInXero({
            payload: {
              amount: viewLogData?.api_payload?.amount ?? null,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
              payment_date: viewLogData?.api_payload?.payment_date ?? null,
              payment_id: viewLogData?.api_payload?.payment_id ?? null,
              retention_account:
                +viewLogData?.api_payload?.retention_account || null,
              retention_amount: +viewLogData?.api_payload?.retention_amount,
              sync_id: viewLogData?.id ?? null,
            },
          });
        }
        break;
      }
      case "PD_CONTRACT_NOT_MAPPED": {
        const contract_id =
          viewLogData?.api_payload?.contract_id ||
          viewLogData?.paytrade_records[0]?.contractDetails?.contract_name;
        const response = await manualMappingContract({
          payload: {
            contract_id: manualMapData?.contract_id,
            pt_contract_id: contract_id,
          },
        });
        if (response) {
          await CreatePaymentInXero({
            payload: {
              amount: viewLogData?.api_payload?.amount ?? null,
              bank_account_id:
                viewLogData?.api_payload?.bank_account_id ?? null,
              cash_retention: viewLogData?.api_payload?.cash_retention,
              payment_date: viewLogData?.api_payload?.payment_date ?? null,
              payment_id: viewLogData?.api_payload?.payment_id ?? null,
              retention_account:
                viewLogData?.api_payload?.retention_account ?? null,
              retention_amount:
                viewLogData?.api_payload?.retention_amount ?? null,
              sync_id: viewLogData?.id ?? null,
            },
          });
        }
        break;
      }
      case "OPR_OVERPAYMENT_NOT_MAPPED": {
        await manualMappingPayments({
          payload: {
            payment_id: manualMapData?.payment_id?.toString(),
            pt_payment_id: +viewLogData?.api_payload?.mapping_payment_id,
          },
        });
        await CreateOverPaymentRefundInXero({
          payload: {
            overpayment_id: +viewLogData?.api_payload?.overpayment_id,
            payment_id: +viewLogData?.api_payload?.payment_id,
            sync_id: viewLogData?.id,
          },
        });
        break;
      }
      case "DELETE_OPR_OVERPAYMENT_NOT_MAPPED": {
        await manualMappingPayments({
          payload: {
            payment_id: viewLogData?.api_payload?.mapping_payment_id,
            pt_payment_id: manualMapData?.payment_id,
          },
        });
        await DeleteOverPaymentRefundInXero({
          payload: {
            sync_id: viewLogData?.id,
            payment_id: +viewLogData?.api_payload?.payment_id,
          },
        });
        break;
      }
      case "DELETE_PD_CLAIM_NOT_MAPPED": {
        await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id?.toString(),
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        await DeletePaymentInXero({
          payload: {
            bank_account_id: +viewLogData?.api_payload?.bank_account_id,
            cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
            payment_id: viewLogData?.api_payload?.payment_id ?? null,
            retention_account:
              +viewLogData?.api_payload?.retention_account || null,
            retention_amount: +viewLogData?.api_payload?.retention_amount,
            sync_id: viewLogData?.id ?? null,
          },
        });
        break;
      }
      case "OPR_CLAIM_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id,
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await CreateOverPaymentRefundInXero({
            payload: {
              overpayment_id: +viewLogData?.api_payload?.overpayment_id,
              payment_id: +viewLogData?.api_payload?.payment_id,
              sync_id: viewLogData?.id,
            },
          });
        }
        break;
      }
      case "PD_CLAIM_NOT_AUTHORIZED": {
        await unMappingBills({
          invoiceId: viewLogData?.api_payload?.unmapping_invoice_id,
        });
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id,
            pt_claim_id: +viewLogData?.paytrade_records?.[0]?.payment_claim_id,
          },
        });
        if (response) {
          await CreatePaymentInXero({
            payload: {
              amount: viewLogData?.api_payload?.amount ?? null,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
              payment_date: viewLogData?.api_payload?.payment_date ?? null,
              payment_id: viewLogData?.api_payload?.payment_id
                ? +viewLogData?.api_payload?.payment_id
                : null,
              retention_account:
                +viewLogData?.api_payload?.retention_account || null,
              retention_amount: +viewLogData?.api_payload?.retention_amount,
              sync_id: viewLogData?.id ?? null,
            },
          });
        }
        break;
      }
      case "OPR_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id,
            pt_claim_id: viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await CreateOverPaymentRefundInXero({
            payload: {
              overpayment_id: +viewLogData?.api_payload?.overpayment_id,
              payment_id: +viewLogData?.api_payload?.payment_id,
              sync_id: viewLogData?.id,
            },
          });
        }
        break;
      }
      case "CN_CLAIM_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id?.toString(),
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await CreateCreditNotesInXero({
            payload: {
              client_supplier_id: +viewLogData?.api_payload?.client_supplier_id,
              company_id: +viewLogData?.api_payload?.company_id,
              sync_id: viewLogData?.id,
              retained_amount: +viewLogData?.api_payload?.retained_amount,
              pt_payment_id: +viewLogData?.api_payload?.pt_payment_id,
              payment_id: viewLogData?.api_payload?.payment_id,
              payment_claim_id: +viewLogData?.api_payload?.payment_claim_id,
              is_gst_optional: viewLogData?.api_payload?.is_gst_optional,
              description: viewLogData?.api_payload?.description,
            },
          });
        }
        break;
      }
      case "DELETE_CN_CLAIM_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id?.toString(),
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await DeleteCreditNotesInXero({
            payload: {
              payment_id: +viewLogData?.api_payload?.payment_id,
              sync_id: viewLogData?.id,
            },
          });
        }
        break;
      }
      case "CN_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id:
              +viewLogData?.api_payload?.mapping_client_supplier_id,
          },
        });
        if (response) {
          await CreateCreditNotesInXero({
            payload: {
              client_supplier_id: +viewLogData?.api_payload?.client_supplier_id,
              company_id: +viewLogData?.api_payload?.company_id,
              sync_id: viewLogData?.id,
              retained_amount: +viewLogData?.api_payload?.retained_amount,
              pt_payment_id: +viewLogData?.api_payload?.pt_payment_id,
              payment_id: viewLogData?.api_payload?.payment_id,
              payment_claim_id: +viewLogData?.api_payload?.payment_claim_id,
              is_gst_optional: viewLogData?.api_payload?.is_gst_optional,
              description: viewLogData?.api_payload?.description,
            },
          });
        }
        break;
      }
      case "DELETE_OP_STATUS_UNAUTHORISED": {
        const unmapResponse = await unMappingPayments({
          paymentId: viewLogData?.api_payload?.payment_id,
        });
        if (unmapResponse) {
          const mappingResp = await manualMappingPayments({
            payload: {
              payment_id: manualMapData?.payment_id?.toString(),
              pt_payment_id: +viewLogData?.api_payload?.mapping_payment_id,
            },
          });
          if (mappingResp) {
            await DeleteOverPaymentInXero({
              payload: {
                sync_id: viewLogData?.id,
                payment_id: +viewLogData?.api_payload?.payment_id,
              },
            });
          }
        }
        break;
      }
      case "OPR_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id: viewLogData?.api_payload?.mapping_client_supplier_id,
          },
        });
        if (response) {
          await CreateOverPaymentRefundInXero({
            payload: {
              overpayment_id: +viewLogData?.api_payload?.overpayment_id,
              payment_id: +viewLogData?.api_payload?.payment_id,
              sync_id: viewLogData?.id,
            },
          });
        }
        break;
      }
      case "DELETE_OP_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id: viewLogData?.api_payload?.mapping_client_supplier_id,
          },
        });
        if (response) {
          await DeleteOverPaymentInXero({
            payload: {
              sync_id: viewLogData?.id,
              payment_id: +viewLogData?.api_payload?.payment_id,
            },
          });
        }
        break;
      }
      case "DELETE_OP_CLAIM_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id?.toString(),
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await DeleteOverPaymentInXero({
            payload: {
              sync_id: viewLogData?.id,
              payment_id: +viewLogData?.api_payload?.payment_id,
            },
          });
        }
        break;
      }
      case "DELETE_OPR_CLAIM_NOT_MAPPED": {
        const response = await manualMappingBills({
          payload: {
            invoice_id: manualMapData?.invoice_id?.toString(),
            pt_claim_id: +viewLogData?.api_payload?.mapping_payment_claim_id,
          },
        });
        if (response) {
          await DeleteOverPaymentRefundInXero({
            payload: {
              sync_id: viewLogData?.id,
              payment_id: +viewLogData?.api_payload?.payment_id,
            },
          });
        }
        break;
      }
      case "OP_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: manualMapData?.account_id,
            pt_bank_account_id: +viewLogData?.api_payload?.bank_account_id,
          },
        });
        if (response) {
          await CreateOverPaymentInXero({
            payload: {
              amount: +viewLogData?.api_payload?.amount,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              payment_date: viewLogData?.api_payload?.payment_date,
              payment_id: +viewLogData?.api_payload?.payment_id,
              sync_id: viewLogData?.id,
            },
          });
        }
        break;
      }
      case "OP_CLIENT_SUPPLIER_NOT_MAPPED": {
        const response = await manualMappingContact({
          payload: {
            contact_id: manualMapData?.contact_id,
            pt_contact_id: viewLogData?.api_payload?.mapping_client_supplier_id,
          },
        });
        if (response) {
          await CreateOverPaymentInXero({
            payload: {
              amount: +viewLogData?.api_payload?.amount,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              payment_date: viewLogData?.api_payload?.payment_date,
              payment_id: +viewLogData?.api_payload?.payment_id,
              sync_id: viewLogData?.id,
            },
          });
        }
        break;
      }
      case "PD_RETENTION_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: manualMapData?.account_id,
            pt_bank_account_id:
              +viewLogData?.api_payload?.mapping_retention_account,
          },
        });
        if (response) {
          await CreatePaymentInXero({
            payload: {
              amount: viewLogData?.api_payload?.amount ?? null,
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
              payment_date: viewLogData?.api_payload?.payment_date ?? null,
              payment_id: +viewLogData?.api_payload?.payment_id,
              retention_account:
                +viewLogData?.api_payload?.retention_account || null,
              retention_amount: +viewLogData?.api_payload?.retention_amount,
              sync_id: viewLogData?.id ?? null,
            },
          });
        }
        break;
      }
      case "DELETE_PD_RETENTION_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            account_id: manualMapData?.account_id,
            pt_bank_account_id:
              +viewLogData?.api_payload?.mapping_retention_account,
          },
        });
        if (response)
          await DeletePaymentInXero({
            payload: {
              bank_account_id: +viewLogData?.api_payload?.bank_account_id,
              cash_retention: viewLogData?.api_payload?.cash_retention ?? null,
              payment_id: viewLogData?.api_payload?.payment_id ?? null,
              retention_account:
                +viewLogData?.api_payload?.retention_account || null,
              retention_amount: +viewLogData?.api_payload?.retention_amount,
              sync_id: viewLogData?.id ?? null,
            },
          });
        break;
      }
      case "DELETE_OPR_REFUND_NOT_MAPPED": {
        const response = await manualMappingPayments({
          payload: {
            payment_id: manualMapData?.payment_id?.toString(),
            pt_payment_id: +viewLogData?.api_payload?.mapping_payment_id,
          },
        });
        if (response)
          await DeleteOverPaymentRefundInXero({
            payload: {
              sync_id: viewLogData?.id,
              payment_id: +viewLogData?.api_payload?.payment_id,
            },
          });
        break;
      }
      case "DELETE_OP_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            pt_bank_account_id: +manualMapData?.account_id,
            account_id: viewLogData?.api_payload?.mapping_account_id,
          },
        });
        if (response)
          await DeleteOverPaymentInXero({
            payload: {
              sync_id: viewLogData?.id,
              payment_id: +viewLogData?.api_payload?.payment_id,
            },
          });
        break;
      }
      case "WH_PAYMENT_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            pt_bank_account_id: +manualMapData?.account_id,
            account_id: viewLogData?.api_payload?.account_id,
          },
        });
        if (response)
          await CreateClaimInPaytrade({
            associatedRetentionSubPaymentId: null,
            retentionId: null,
            invoiceId: viewLogData?.api_payload?.invoice_id || null,
            tenantId: viewLogData?.api_payload?.tenant_id || null,
            syncId: viewLogData?.id,
          });
        break;
      }
      case "WH_RETENTION_ACCOUNT_NOT_MAPPED": {
        const response = await manualMappingBankAccounts({
          payload: {
            pt_bank_account_id: +manualMapData?.account_id,
            account_id: viewLogData?.api_payload?.retention_account_id,
          },
        });
        if (response)
          await CreateClaimInPaytrade({
            associatedRetentionSubPaymentId: null,
            retentionId: null,
            invoiceId: viewLogData?.api_payload?.invoice_id || null,
            tenantId: viewLogData?.api_payload?.tenant_id || null,
            syncId: viewLogData?.id,
          });
        break;
      }
      default: {
        break;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const commentsTableResolve = async (
  viewLogData: any,
  setGenerateClaimData: any,
  setGenerateClaimCount: any,
  setOpenGeneratedClaimModel: any
) => {
  switch (viewLogData?.error_code) {
    case "WH_MISSING_NON_PAID_REASONS":
    case "XP_ADD_INVOICE_MISSING_NON_PAID_REASONS": {
      const responseData = await fetchSubContractorClaimsByHeadContractor({
        project_id: viewLogData?.api_payload?.project_id,
      });
      const truncateText = (text: any, maxLength = 25) => {
        return text.length > maxLength
          ? `${text.slice(0, maxLength)}...`
          : text;
      };
      const parsedClaims = responseData?.payment_claims?.map(
        (claim: any, index: number) => {
          const unpaidAmountValue = claim?.unpaid_amount
            ? Number(claim.unpaid_amount.replace(/,/g, ""))
            : 0;
          return {
            cash_retention_type: claim?.cash_retention_type,
            claim_type: claim?.claim_type,
            client_supplier_name: claim?.client_supplier_name,
            project_name: claim?.project_name,
            contract_name: claim?.contract_name,
            claim_date: formatDate(claim?.claim_date),
            claim_amount: `$ ${
              claim?.claim_amount
                ? Number(claim.claim_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "0.00"
            }`,
            unpaid_amount: `$ ${unpaidAmountValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            unpaid_amount_sort: unpaidAmountValue,
            status: truncateText(claim?.list_status),
            payment_claim_id: claim?.payment_claim_id,
            user_input: "",
            __index__: index,
            user_input_error: "",
          };
        }
      );
      setGenerateClaimData(parsedClaims || []);
      setGenerateClaimCount(responseData?.total_count || 0);
      setOpenGeneratedClaimModel(true);
      break;
    }
    default:
      return false;
  }
};

export const uploadAttachment = async (
  viewLogData: any,
  setOpenAttachmentModel: any
) => {
  switch (viewLogData?.error_code) {
    case "WH_MISSING_SUPPORTING_ATTACHMENTS":
    case "XP_ADD_INVOICE_MISSING_SUPPORTING_ATTACHMENTS":
    case "WH_MISSING_SUPPORTING_ATTACHMENTS_PAYMENTS": {
      setOpenAttachmentModel(true);
      break;
    }
    default:
      return false;
  }
};

export const overpayment = async (
  viewLogData: any,
  setOpenOverpayment: any
) => {
  switch (viewLogData?.error_code) {
    case "WH_OVERPAYMENT_MISSING_FIELDS":
    case "WH_OVERPAYMENT_REFUND_MISSING_FIELDS": {
      setOpenOverpayment(true);
      break;
    }
    default:
      return false;
  }
};

export const textareaErrorCode = async (
  viewLogData: any,
  setOpenTextareaModel: any
) => {
  switch (viewLogData?.error_code) {
    case "WH_MISSING_WITHHOLD_REASON_PAYMENTS": {
      setOpenTextareaModel(true);
      break;
    }
    default:
      return false;
  }
};
