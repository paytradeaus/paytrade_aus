export const tabOptionsList = [
  { label: "Discussions" },
  { label: "Product ideas" },
];

export const commentsTabOptionsList = [
  { label: "Current" },
  { label: "Archived" },
];

export const discussionsHeader = [
  { title: "Discussion title", dataKey: "title" },
  { title: "Created by", dataKey: "createdBy" },
  { title: "Created on", dataKey: "created_on" },
  { title: "Is Reported?", dataKey: "isReported" },
  { title: "Views", dataKey: "view_count" },
  { title: "Likes", dataKey: "like_count" },
  { title: "Answers", dataKey: "answer_comment_count" },
  { title: "Last updated", dataKey: "edited_on" },
  { title: "Actions", dataKey: "", restrictSorting: true },
];

export const productIdeaHeader = [
  { title: "Product Idea title", dataKey: "title" },
  { title: "Created by", dataKey: "createdBy" },
  { title: "Created on", dataKey: "created_on" },
  { title: "Is Reported?", dataKey: "isReported" },
  { title: "Views", dataKey: "view_count" },
  { title: "Upvotes", dataKey: "vote_count" },
  { title: "Comments", dataKey: "answer_comment_count" },
  { title: "Last updated", dataKey: "edited_on" },
  { title: "Actions", dataKey: "", restrictSorting: true },
];

export const discussionRenderData = [
  { key: "title" },
  { key: "createdBy" },
  { key: "created_on" },
  { key: "isReported", returnOnClickTableData: true },
  { key: "view_count" },
  { key: "like_count" },
  { key: "answer_comment_count", returnOnClickTableData: true },
  { key: "edited_on" },
];

export const productIdeaRenderData = [
  { key: "title" },
  { key: "createdBy" },
  { key: "created_on" },
  { key: "isReported", returnOnClickTableData: true },
  { key: "view_count" },
  { key: "vote_count" },
  { key: "answer_comment_count", returnOnClickTableData: true },
  { key: "edited_on" },
];
/*** */
export const commentsHeader = [
  { title: "Answered by", dataKey: "answer_comment_owner_name" },
  { title: "Added Date", dataKey: "created_on" },
  { title: "Is Reported?", dataKey: "flag_count" },
  { title: "Likes", dataKey: "like_count" },
  { title: "Answer", dataKey: "answer_comment" },
  { title: "Actions", dataKey: "", restrictSorting: true },
];

export const commentsHeaderData = [
  { key: "answer_comment_owner_name" },
  { key: "created_on" },
  { key: "flag_count", returnOnClickTableData: true },
  { key: "like_count" },
  { key: "answer_comment" },
];

export const commentsArchiveHeader = [
  { title: "Answered by", dataKey: "answer_comment_owner_name" },
  { title: "Added Date", dataKey: "created_on" },
  { title: "Is Reported?", dataKey: "flag_count" },
  { title: "Likes", dataKey: "like_count" },
  { title: "Answer", dataKey: "answer_comment" },
  { title: "Action", dataKey: "", restrictSorting: true },
];

export const productIdeaCommentsHeaderData = [
  { key: "answer_comment_owner_name" },
  { key: "created_on" },
  { key: "flag_count", returnOnClickTableData: true },
  { key: "vote_count" },
  { key: "answer_comment" },
];

export const productIdeaCommentsArchiveHeader = [
  { title: "Commented by", dataKey: "answer_comment_owner_name" },
  { title: "Added Date", dataKey: "created_on" },
  { title: "is Reported?", dataKey: "flag_count" },
  { title: "Likes", dataKey: "vote_count" },
  { title: "Comment", dataKey: "answer_comment" },
  { title: "Action", dataKey: "", restrictSorting: true },
];

export const productIdeaCommentsHeader = [
  { title: "Commented by", dataKey: "answer_comment_owner_name" },
  { title: "Added Date", dataKey: "created_on" },
  { title: "is Reported?", dataKey: "flag_count" },
  { title: "Likes", dataKey: "vote_count" },
  { title: "Comment", dataKey: "answer_comment" },
  { title: "Actions", dataKey: "", restrictSorting: true },
];

export const reportHeader = [
  { title: "Reported By", dataKey: "reportedBy" },
  { title: "Reported On", dataKey: "created_on" },
  { title: "Type", dataKey: "cmty_flag_type" },
  { title: "Message", dataKey: "flag_reason" },
];

export const reportRenderData = [
  { key: "reportedBy" },
  { key: "created_on" },
  { key: "cmty_flag_type" },
  { key: "flag_reason" },
];
