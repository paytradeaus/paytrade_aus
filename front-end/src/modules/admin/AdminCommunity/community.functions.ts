import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function getList(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAllDiscussionIdeas(
          $listDiscussionIdeasInput: ListDiscussionIdeaInput!
        ) {
          listAllDiscussionIdeas(
            listDiscussionIdeasInput: $listDiscussionIdeasInput
          ) {
            status
            data {
              discussionIdeas {
                admin_author {
                  first_name
                  last_name
                }
                editable
                title
                category {
                  value
                  id
                }
                id
                created_on
                vote_count
                view_count
                like_count
                discussion_idea_id
                answer_comment_count
                author {
                  first_name
                  last_name
                }
                flag_count
                flag_reason_discussion
                edited_on
              }
              totalCount
            }
            message
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.listAllDiscussionIdeas.status === ApiResponse.SUCCESS) {
      return response?.data.listAllDiscussionIdeas?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("getList ~ error:", error);
  }
}

export async function getReportedList(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListCommunityFlags(
          $listCommunityFlagsInput: ListCommunityFlagsInput!
        ) {
          AdminListCommunityFlags(
            listCommunityFlagsInput: $listCommunityFlagsInput
          ) {
            data {
              flagsList {
                title
                answer_comment
                admin_voter_liked_flagged {
                  first_name
                  last_name
                }
                cmty_flag_type
                created_on
                flag_reason
                voter_liked_flagged {
                  last_name
                  first_name
                }
              }
              total_count
            }
            status
            message
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.AdminListCommunityFlags.status === ApiResponse.SUCCESS) {
      return response?.data.AdminListCommunityFlags?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("AdminListCommunityFlags ~ error:", error);
  }
}
