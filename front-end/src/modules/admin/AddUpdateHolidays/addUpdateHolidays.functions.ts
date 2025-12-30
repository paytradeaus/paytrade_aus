import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import { apolloClient } from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function AdminAddHolidayDetails(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminAddHolidayDetails(
          $addHolidayDetailsInput: AdminAddHolidayInput!
        ) {
          adminAddHolidayDetails(
            addHolidayDetailsInput: $addHolidayDetailsInput
          ) {
            data {
              created_on
              holiday_date
              holiday_name
              holiday_status
              id
              recurring_every_year
            }
            message
            status
          }
        }
      `,
      variables: data,

      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.adminAddHolidayDetails?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.adminAddHolidayDetails?.message);
      return true;
    }
    if (response?.data?.adminAddHolidayDetails?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.adminAddHolidayDetails?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
}

export async function AdminGetHolidayById(data: { id: any }): Promise<any> {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminGetHolidayById($id: String!) {
          adminGetHolidayById(Id: $id) {
            data {
              created_on
              holiday_date
              holiday_name
              holiday_status
              id
              recurring_every_year
            }
            message
            status
          }
        }
      `,
      variables: {
        id: data.id,
      },
      fetchPolicy: "no-cache",
    });

    if (response?.data?.adminGetHolidayById?.status === ApiResponse.SUCCESS) {
      return response?.data?.adminGetHolidayById?.data;
    } else if (
      response?.data?.adminGetHolidayById?.status === ApiResponse.ERROR
    ) {
      return null;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

export async function AdminUpdateHolidayDetails(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateHolidayDetails(
          $updateHolidayDetailsInput: AdminUpdateHolidayInput!
        ) {
          adminUpdateHolidayDetails(
            updateHolidayDetailsInput: $updateHolidayDetailsInput
          ) {
            data {
              created_on
              holiday_date
              holiday_name
              holiday_status
              id
              recurring_every_year
            }
            message
            status
          }
        }
      `,
      variables: data,

      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.adminUpdateHolidayDetails?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.adminUpdateHolidayDetails?.message);
      return true;
    }
    if (
      response?.data?.adminUpdateHolidayDetails?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.adminUpdateHolidayDetails?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
}
export async function updateWarningHolidayData(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation AdminUpdateHolidayDetails(
          $updateHolidayDetailsInput: AdminUpdateHolidayInput!
        ) {
          adminUpdateHolidayDetails(
            updateHolidayDetailsInput: $updateHolidayDetailsInput
          ) {
            data {
              created_on
              holiday_date
              holiday_name
              holiday_status
              id
              recurring_every_year
            }
            message
            status
          }
        }
      `,
      variables: data,

      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.adminUpdateHolidayDetails?.status === ApiResponse.SUCCESS
    ) {
      showSuccessToast(response?.data?.adminUpdateHolidayDetails?.message);
      return true;
    }
    if (
      response?.data?.adminUpdateHolidayDetails?.status === ApiResponse.ERROR
    ) {
      showErrorToast(response?.data?.adminUpdateHolidayDetails?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
}

export async function ImportHolidayDetail(data: any): Promise<any> {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation ImportHolidayDetail(
          $actionType: String!
          $attachmentId: String!
        ) {
          importHolidayDetail(
            actionType: $actionType
            attachmentId: $attachmentId
          ) {
            message
            status
          }
        }
      `,
      variables: data,

      fetchPolicy: "no-cache",
    });

    if (response?.data?.importHolidayDetail?.status === ApiResponse.SUCCESS) {
      showSuccessToast(response?.data?.importHolidayDetail?.message);
      return true;
    }
    if (response?.data?.importHolidayDetail?.status === ApiResponse.ERROR) {
      showErrorToast(response?.data?.importHolidayDetail?.message);
      return false;
    }
  } catch (error: any) {
    showErrorToast(error);

    return false;
  }
}
