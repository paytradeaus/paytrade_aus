import { ERROR, SOMETHING_WENT_WRONG, SUCCESS } from "@/app/message";
import { showErrorToast } from "@/components/Toaster";
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  gql,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getCookie } from "cookies-next";

// types.ts
export interface AdminLogInUserData {
  userId: number;
  id: string;
  userName: string;
  userFirstName: string;
  userLastName: string;
  emailId: string;
  isAdmin: boolean;
  role: string;
  status: string;
  iat: number;
  exp: number;
}

export interface IGroupsData {
  created_on: string;
  group_description: string;
  group_name: string;
  group_status: string;
  id: string;
}

export interface IAddAdminData {
  admin_status: string;
  created_by: string;
  created_on: string;
  email_id: string;
  first_name: string;
  group_ids: null;
  last_name: string;
  password: string;
}

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URI,
});

const authLink = setContext((_, { headers }) => {
  if (typeof window === "undefined") return { headers };

  const token = localStorage.getItem("accessToken") || "";
  let companyId =
    localStorage.getItem("companyId") || getCookie("companyId") || "";
  if (companyId === "undefined") {
    companyId = localStorage.getItem("UserCompanyId") || "";
  }
  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
      ...(companyId && { companyId }),
    },
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "no-cache",
      errorPolicy: "ignore",
    },
    query: {
      fetchPolicy: "no-cache",
      errorPolicy: "all",
    },
  },
});

export const checkAdminLogin = async (
  data: any,
  setLoading?: Function
): Promise<any> => {
  try {
    const response = await client.query({
      query: gql`
        query AdminLoginByEmailId(
          $emailId: String!
          $password: String!
          $userTimezone: String!
        ) {
          adminLoginByEmailId(
            email_id: $emailId
            password: $password
            user_timezone: $userTimezone
          ) {
            data {
              access_token
              refresh_token
            }
            message
            status
          }
        }
      `,
      variables: {
        emailId: data.Email, //"ays@ms.com",
        password: data.Password, //"Test",
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
    if (response?.data?.adminLoginByEmailId?.status === "SUCCESS") {
      return response.data;
    }
    if (response?.data?.adminLoginByEmailId?.status === "ERROR") {
      showErrorToast(
        response?.data?.adminLoginByEmailId?.message || SOMETHING_WENT_WRONG
      );
      return null;
    }
    return new Error("Invalid Credentials");
  } catch (error: any) {
    showErrorToast(error.message || SOMETHING_WENT_WRONG);
    console.error("GraphQL Error:", error);
    return error.message;
  } finally {
    setLoading && setLoading(false);
  }
};

export const listAllGroups = async (
  data?: any,
  setLoading?: Function
): Promise<{ groups: IGroupsData[]; totalCount: number } | any> => {
  try {
    const response = await client.query({
      query: gql`
        query ListAllGroups(
          $keyword: String
          $status: String
          $page: Int
          $perPage: Int
        ) {
          listAllGroups(
            keyword: $keyword
            status: $status
            page: $page
            perPage: $perPage
          ) {
            data {
              groups {
                created_on
                group_description
                group_name
                group_status
                id
              }
              totalCount
            }
            message
            status
          }
        }
      `,
      variables: {
        page: data?.page || null,
        perPage: data?.perPage || null,
        keyword: data?.keyWord || null,
        status: data?.status || null,
      },
      fetchPolicy: "no-cache",
    });
    if (response && response?.data?.listAllGroups?.status === SUCCESS) {
      return response?.data?.listAllGroups?.data;
    }
    if (response && response?.data?.listAllGroups?.status === ERROR) {
      console.error(response && response?.data?.listAllGroups?.message);
      return null;
    }
  } catch (error: any) {
    // toast.error(error?.message || "something went wrong in API");
    console.error("GraphQL Error:", error);
    return null;
  } finally {
    setLoading && setLoading(false);
  }
};
