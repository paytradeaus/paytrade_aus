import { gql } from "@apollo/client";
import { toast } from "@/app/Toaster";
import { client } from "@/app/api/adminAPIs/adminAPIs";

export const triggerActivityLogWhileSwitchingBusinessProfile = async (
  payload: any,
  setLoading?: Function
): Promise<boolean | null> => {
  try {
    const response = await client.mutate({
      mutation: gql`
        mutation TriggerActivityLogWhileSwitchingBusinessProfile(
          $payload: TriggerActivityLogWhileSwitchingBusinessProfileInput!
        ) {
          triggerActivityLogWhileSwitchingBusinessProfile(payload: $payload) {
            data
            message
            status
          }
        }
      `,
      variables: {
        payload,
      },
      fetchPolicy: "no-cache",
    });

    if (
      response?.data?.triggerActivityLogWhileSwitchingBusinessProfile
        ?.status === "SUCCESS"
    ) {
      return true;
    }

    if (
      response?.data?.triggerActivityLogWhileSwitchingBusinessProfile
        ?.status === "ERROR"
    ) {
      console.error(
        response?.data?.triggerActivityLogWhileSwitchingBusinessProfile?.message
      );
      return false;
    }

    return false;
  } catch (error: any) {
    toast.error(error.message || "Something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
