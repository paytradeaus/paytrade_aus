import axios from "axios";
import { gql } from "@apollo/client";
import apolloClient from "@/network/apolloClient";
import { SUCCESS } from "@/app/message";

export interface MarketingImageItem {
  name: string;
  url: string;
}

export interface UploadMarketingImageResult {
  status: string;
  message: string;
  url?: string;
}

export const uploadMarketingImage = async (
  file: File
): Promise<UploadMarketingImageResult> => {
  const formData = new FormData();
  formData.append(
    "operations",
    JSON.stringify({
      query:
        "mutation UploadMarketingImage($file: Upload!) { uploadMarketingImage(file: $file) { status message url } }",
      variables: { file: null },
    })
  );
  formData.append("map", '{"0":["variables.file"]}');
  formData.append("0", file);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || ""
      : "";

  try {
    const response: any = await axios.post("/graphql", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "apollo-require-preflight": true,
        authorization: "Bearer " + token,
      },
    });
    return (
      response?.data?.data?.uploadMarketingImage || {
        status: "ERROR",
        message:
          response?.data?.errors?.[0]?.message || "Could not upload image.",
      }
    );
  } catch (err: any) {
    return { status: "ERROR", message: err?.message || "Could not upload image." };
  }
};

export const deleteMarketingImage = async (
  name: string
): Promise<{ status: string; message: string }> => {
  try {
    const response = await apolloClient.mutate({
      mutation: gql`
        mutation DeleteMarketingImage($name: String!) {
          deleteMarketingImage(name: $name) {
            status
            message
          }
        }
      `,
      variables: { name },
    });
    return (
      response?.data?.deleteMarketingImage || {
        status: "ERROR",
        message: "Could not delete image.",
      }
    );
  } catch (err: any) {
    return { status: "ERROR", message: err?.message || "Could not delete image." };
  }
};

export const listMarketingImages = async (): Promise<MarketingImageItem[]> => {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListMarketingImages {
          listMarketingImages {
            status
            message
            data {
              name
              url
            }
          }
        }
      `,
      fetchPolicy: "no-cache",
    });
    if (response?.data?.listMarketingImages?.status === SUCCESS) {
      return response?.data?.listMarketingImages?.data || [];
    }
    return [];
  } catch {
    return [];
  }
};
