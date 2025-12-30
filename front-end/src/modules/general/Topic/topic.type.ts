export type GET_DISCUSSION_DETAILS_ID = {
  vote_count: number;
  view_count: number;
  title: string;
  like_count: number;
  editable: boolean;
  discussion_idea_attachment: Array<{
    file_name: string;
    file_path: string;
  }>;
  admin_author: {
    author_image_base64: any;
    first_name: string;
    last_name: string;
  };
  author: {
    author_image_base64: any;
    first_name: string;
    last_name: string;
  };
  category: {
    value: string;
  };
  cmty_content_type: string;
  content: string;
  created_on: string;
  answer_comment_count: number;
  id: string;
  discussion_idea_id: number;
  your_disc_idea_response: "Vote" | "Like" | "Flag" | "None" | null;
  answerComment: DISCUSSION_COMMENTS;
};

export type DISCUSSION_COMMENTS = Array<{
  answer_comment_attachment: Array<{
    file_path: string;
    file_name: string;
    id: string;
  }>;
  answer_comment_by: string;
  answer_comment_id: number;
  answer_comment_owner_image_base64: any;
  answer_comment_owner_name: string;
  created_on: string;
  like_count: any;
  answer_comment: string;
  your_response: "Vote" | "Like" | "Flag" | "None" | null;
  id: string;
  comment_editable: boolean;
}>;

export type COMMENT = {
  answer_comment_attachment: Array<{
    file_path: string;
    file_name: string;
  }>;
  answer_comment_by: string;
  answer_comment_id: number;
  answer_comment_owner_image_base64: any;
  answer_comment_owner_name: string;
  created_on: string;
  like_count: any;
  answer_comment: string;
  your_response: "Vote" | "Like" | "Flag" | "None" | null;
};
