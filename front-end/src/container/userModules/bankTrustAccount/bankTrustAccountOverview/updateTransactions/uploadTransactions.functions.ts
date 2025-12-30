import { client } from "@/app/api/apolloClientServices";
import { toast } from "@/app/Toaster";
import { ERROR, SUCCESS } from "@/common/constants/messages";
import { gql } from "@apollo/client";

export async function ProcessUploadedTransactionsCsv(
  data: any,
  setErrorMessage?: any
): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation ProcessUploadedTransactionsCsv(
          $bankAccountId: Float!
          $filePath: String!
        ) {
          processUploadedTransactionsCsv(
            bank_account_id: $bankAccountId
            filePath: $filePath
          ) {
            data {
              balance
              description
              id
              is_similar
              txn_amount
              txn_date
            }
            message
            status
          }
        }
      `,
      variables: data,
    });

    if (
      response?.data?.processUploadedTransactionsCsv?.status === SUCCESS &&
      response?.data?.processUploadedTransactionsCsv?.data !== null
    ) {
      toast.success(response?.data?.processUploadedTransactionsCsv?.message);

      return response?.data?.processUploadedTransactionsCsv?.data || [];
    } else {
      // toast.error(response?.data?.processUploadedTransactionsCsv?.message);
      setErrorMessage(response?.data?.processUploadedTransactionsCsv?.message);
      return [];
    }
  } catch (error: any) {
    return [];
  }
}
export async function AddSelectedTransactionsFromCsv(data: any): Promise<any> {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation AddSelectedTransactionsFromCsv(
          $balanceManual: Float
          $bankAccountId: Float!
          $companyId: Float!
          $confirm: Boolean!
          $selectedIds: [String!]!
        ) {
          addSelectedTransactionsFromCsv(
            balance_manual: $balanceManual
            bank_account_id: $bankAccountId
            company_id: $companyId
            confirm: $confirm
            selected_ids: $selectedIds
          ) {
            message
            status
          }
        }
      `,
      variables: data,
    });

    if (response?.data?.addSelectedTransactionsFromCsv?.status === SUCCESS) {
      // toast.success(response?.data?.addSelectedTransactionsFromCsv?.message);
      return response?.data?.addSelectedTransactionsFromCsv;
    } else {
      toast.error(response?.data?.addSelectedTransactionsFromCsv?.message);
      return false;
    }
  } catch (error: any) {
    return false;
  }
}

export async function DownloadTransactionUploadCsvTemplate(
  postData: any
): Promise<any> {
  try {
    const response = await client.query({
      query: gql`
        query DownloadTransactionUploadCsvTemplate(
          $financialInstitutionId: String!
        ) {
          downloadTransactionUploadCsvTemplate(
            financialInstitutionId: $financialInstitutionId
          ) {
            data {
              file_name
              file_path
              id
              file
            }
            message
            status
          }
        }
      `,
      variables: postData,
    });

    if (
      response?.data?.downloadTransactionUploadCsvTemplate?.status === SUCCESS
    ) {
      return response?.data?.downloadTransactionUploadCsvTemplate?.data;
    }
    if (
      response?.data?.downloadTransactionUploadCsvTemplate?.status === ERROR
    ) {
      console.error(
        response?.data?.downloadTransactionUploadCsvTemplate?.message
      );
      toast.error(
        response?.data?.downloadTransactionUploadCsvTemplate?.message
      );
      return {};
    }
  } catch (error: any) {
    return {};
  }
}
