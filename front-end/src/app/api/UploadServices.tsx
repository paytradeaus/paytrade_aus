import {
  ApolloClient,
  gql,
  NormalizedCacheObject,
  createHttpLink,
  InMemoryCache,
} from "@apollo/client";

// Create a new Apollo Client instance with authentication headers
export const createAuthenticatedApolloClient = (
  token: string,
  userId: number
): ApolloClient<NormalizedCacheObject> => {
  const httpLink = createHttpLink({
    uri: "https://pg.claritazlabs.com:3027/graphql",
    headers: {
      Authorization: `Bearer ${token}`,
      "user-id": String(userId),
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
  });
};

export const insertFileUploadDetails = async (
  createFileUploadInput: any,
  file: any,
  token: string,
  userId: number
) => {
  try {
    // Create an authenticated Apollo Client instance
    const authenticatedClient = createAuthenticatedApolloClient(token, userId);

    const response = await authenticatedClient.mutate({
      mutation: gql`
        mutation Mutation(
          $createFileUploadInput: CreateFileUploadInput!
          $file: Upload!
        ) {
          fileUpload(
            createFileUploadInput: $createFileUploadInput
            file: $file
          ) {
            attachment_type
            file_path
            file_type
            id
            user_id
            company_id
          }
        }
      `,
      variables: {
        createFileUploadInput,
        file,
      },
    });
    return response.data;
  } catch (error) {
    // Handle errors
    console.error("Error in insertFileUploadDetails:", error);
    throw error;
  }
};
