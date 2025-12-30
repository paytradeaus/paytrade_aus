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

interface Attachment {
  attachment_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  id: string;
}

interface Category {
  id: string;
  value: string;
}

export interface Author {
  email_id: string;
  first_name: string;
  id: string;
  last_name: string;
}
