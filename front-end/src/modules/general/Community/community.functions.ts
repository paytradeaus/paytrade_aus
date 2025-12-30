import { showSuccessToast } from "@/components/Toaster";
import apolloClient from "@/network/apolloClient";
import { ApiResponse } from "@/shared/constant/messages";
import { gql } from "@apollo/client";

export async function searchCommunity(inputData: Object) {
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
              totalCount
              discussionIdeas {
                title
                content
                cmty_content_type
                category {
                  value
                }
                id
              }
            }
            message
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data.listAllDiscussionIdeas.status === ApiResponse.SUCCESS) {
      return response?.data.listAllDiscussionIdeas.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("listAllDiscussionIdeas ~ error:", error);
  }
}

export async function getTopData(inputData: Object) {
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
              totalCount
              discussionIdeas {
                title
                content
                category {
                  value
                }
                id
                created_on
              }
            }
            message
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data.listAllDiscussionIdeas.status === ApiResponse.SUCCESS) {
      return response?.data.listAllDiscussionIdeas.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("listAllDiscussionIdeas ~ error:", error);
  }
}

export async function addDiscussion(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AddDiscussionIdea(
          $addDiscussionIdeaInput: AddDiscussionIdeaInput!
        ) {
          addDiscussionIdea(addDiscussionIdeaInput: $addDiscussionIdeaInput) {
            status
            message
            data {
              id
              category {
                value
              }
              title
              discussion_idea_id
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (response?.data.addDiscussionIdea.status === ApiResponse.SUCCESS) {
      return response?.data.addDiscussionIdea.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("addDiscussionIdea ~ error:", error);
  }
}

export async function categoryDropDownData(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query AdminListAllMasterTypeDetails(
          $masterType: String
          $status: String
          $perPage: Int
          $page: Int
          $keyword: String
        ) {
          adminListAllMasterTypeDetails(
            MasterType: $masterType
            status: $status
            perPage: $perPage
            page: $page
            keyword: $keyword
          ) {
            message
            status
            data {
              MasterTypeDetails {
                value
                status
                id
                description
                master_type
              }
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data.adminListAllMasterTypeDetails.status ===
      ApiResponse.SUCCESS
    ) {
      return response?.data.adminListAllMasterTypeDetails?.data
        ?.MasterTypeDetails;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("adminListAllMasterTypeDetails ~ error:", error);
  }
}

export async function categoryListAndCount(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetCategoryWiseDiscIdeaCount($contentType: String!) {
          getCategoryWiseDiscIdeaCount(content_type: $contentType) {
            data {
              total_count
              categories {
                per_category_count
                master_value
                master_id
              }
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    // if (
    //   response?.data.getCategoryWiseDiscIdeaCount.status === ApiResponse.SUCCESS
    // ) {
    return response?.data.getCategoryWiseDiscIdeaCount?.data;
    // } else {
    // return [];
    // }
  } catch (error: any) {
    // Handle errors
    console.log("getCategoryWiseDiscIdeaCount ~ error:", error);
  }
}

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
                title
                category {
                  value
                  id
                }
                content
                id
                created_on
                vote_count
                view_count
                like_count
                discussion_idea_id
                answer_comment_count
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
    console.log("listAllDiscussionIdeas ~ error:", error);
  }
}

export async function getDiscussionIdeaById(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query GetDiscussionIdea($getDiscussionIdeaId: String!) {
          getDiscussionIdea(id: $getDiscussionIdeaId) {
            data {
              admin_author {
                first_name
                last_name
                author_image_base64
              }
              answerComment {
                answer_comment_attachment {
                  file_path
                  file_name
                  id
                }
                answer_comment_by
                answer_comment_id
                answer_comment_owner_image_base64
                answer_comment_owner_name
                created_on
                like_count
                answer_comment
                your_response
                comment_editable
                id
              }
              vote_count
              view_count
              title
              like_count
              discussion_idea_attachment {
                file_name
                file_path
                file_type
                id
              }
              author {
                author_image_base64
                first_name
                last_name
              }
              category {
                value
                id
              }
              cmty_content_type
              content
              created_on
              answer_comment_count
              id
              discussion_idea_id
              your_disc_idea_response
              editable
            }
            status
            message
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.getDiscussionIdea.status === ApiResponse.SUCCESS) {
      return response?.data.getDiscussionIdea?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("getDiscussionIdea ~ error:", error);
  }
}

export async function addComments(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation updateAnswerComment(
          $addAnswerCommentInput: AddAnswerCommentInput!
        ) {
          addAnswerComment(addAnswerCommentInput: $addAnswerCommentInput) {
            data {
              id
              answer_comment_id
            }
            status
            message
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.addAnswerComment.status === ApiResponse.SUCCESS) {
      return response?.data.addAnswerComment?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("addAnswerComment ~ error:", error);
  }
}

export async function updateComments(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UpdateAnswerComment(
          $updateAnswerCommentInput: UpdateAnswerCommentInput!
        ) {
          updateAnswerComment(
            updateAnswerCommentInput: $updateAnswerCommentInput
          ) {
            status
            message
            data {
              id
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.updateAnswerComment.status === ApiResponse.SUCCESS) {
      return response?.data.updateAnswerComment?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("updateAnswerComment ~ error:", error);
  }
}
export async function deleteComments(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UpdateAnswerComment(
          $updateAnswerCommentInput: UpdateAnswerCommentInput!
        ) {
          updateAnswerComment(
            updateAnswerCommentInput: $updateAnswerCommentInput
          ) {
            status
            message
            data {
              id
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.updateAnswerComment.status === ApiResponse.SUCCESS) {
      return response?.data.updateAnswerComment?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("updateAnswerComment ~ error:", error);
  }
}

export async function reportCommentAndDiscussionAndReport(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation AddUpdateVoteLikeFlag($voteLikeFlagInput: VoteLikeFlagInput!) {
          AddUpdateVoteLikeFlag(voteLikeFlagInput: $voteLikeFlagInput) {
            status
            message
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.AddUpdateVoteLikeFlag.status === ApiResponse.SUCCESS) {
      return response?.data.AddUpdateVoteLikeFlag?.status;
    } else {
      return null;
    }
  } catch (error: any) {
    console.log("AddUpdateVoteLikeFlag ~ error:", error);
  }
}

export async function getTopicComments(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        query ListAnswerComments($listAnsCmtInput: getAnsCommentInput!) {
          listAnswerComments(listAnsCmtInput: $listAnsCmtInput) {
            data {
              total_count
              comment {
                answer_comment
                answer_comment_attachment {
                  attachment_type
                  file_name
                  file_path
                  file_type
                  id
                }
                answer_comment_by
                answer_comment_id
                answer_comment_owner_image_base64
                answer_comment_owner_name
                answer_comment_status
                created_on
                flag_count
                id
                like_count
                your_response
                comment_editable
                flag_count
                flag_reason
              }
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
    if (response?.data.listAnswerComments.status === ApiResponse.SUCCESS) {
      return response?.data.listAnswerComments?.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("listAnswerComments ~ error:", error);
  }
}

export async function editDiscussion(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UpdateDiscussionIdeaInput(
          $updateContentInput: UpdateDiscussionIdeaInput!
        ) {
          updateDiscussionIdeaInput(updateContentInput: $updateContentInput) {
            status
            message
            data {
              id
              category {
                value
              }
              title
              discussion_idea_id
            }
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data.updateDiscussionIdeaInput.status === ApiResponse.SUCCESS
    ) {
      return response?.data.updateDiscussionIdeaInput.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("updateDiscussionIdeaInput ~ error:", error);
  }
}

export async function deleteTopic(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation UpdateDiscussionIdeaInput(
          $updateContentInput: UpdateDiscussionIdeaInput!
        ) {
          updateDiscussionIdeaInput(updateContentInput: $updateContentInput) {
            data {
              category {
                value
              }
              cmty_content_type
            }
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });

    if (
      response?.data.updateDiscussionIdeaInput.status === ApiResponse.SUCCESS
    ) {
      return response?.data.updateDiscussionIdeaInput.data;
    } else {
      return [];
    }
  } catch (error: any) {
    // Handle errors
    console.log("updateDiscussionIdeaInput ~ error:", error);
  }
}

export async function updateViewCount(inputData: any) {
  try {
    const response = await apolloClient.query({
      query: gql`
        mutation ViewCountUpdateDiscussionIdea(
          $viewCountUpdateDiscussionIdeaId: String!
        ) {
          viewCountUpdateDiscussionIdea(id: $viewCountUpdateDiscussionIdeaId) {
            message
            status
          }
        }
      `,
      variables: inputData,
      fetchPolicy: "no-cache",
    });
  } catch (error: any) {
    // Handle errors
    console.log("viewCountUpdateDiscussionIdea ~ error:", error);
  }
}
