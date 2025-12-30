export interface Author {
  email_id: string;
  first_name: string;
  id: string;
  last_name: string;
}

interface Category {
  id: string;
  value: string;
}

interface Attachment {
  attachment_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  id: string;
}

interface Comment {
  comment: string;
  comment_by: string;
  comment_status: string;
  id: string;
  posted_on: string; // Consider using Date type if you parse it into a Date object
}

export interface BlogResource {
  blog_status: string;
  author: Author;
  category: Category;
  content: string;
  content_type: string;
  created_on: string; // Consider using Date type if you parse it into a Date object
  id: string;
  published_on: string | null; // Consider using Date type if you parse it into a Date object
  title: string;
  urlSlug: string;
  attachment: Attachment | null;
  banner: Attachment | null;
  comment: Comment[];
}

export interface BlogComment {
  blog: {
    blog_status: string | null;
    id: string;
    title: string;
  };
  comment: string;
  comment_by: string;
  comment_status: string;
  comment_owner_name: string;
  created_on: string; // Assuming this is a string representation of a date/time
  id: string;
  posted_on: string | null; // Assuming this is a string representation of a date/time or null
}
