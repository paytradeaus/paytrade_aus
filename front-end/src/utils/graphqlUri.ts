export const getGraphQLUri = (): string => {
  if (typeof window !== 'undefined') {
    return '/graphql';
  }
  return process.env.NEXT_PUBLIC_GRAPHQL_URI || 'http://127.0.0.1:3001/graphql';
};
