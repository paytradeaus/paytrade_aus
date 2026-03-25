"use client";
import React, { useEffect, useState } from "react";
import TitleSection from "../../../components/TitleSection";
import Link from "next/link";
import withBlogBox from "@/components/BlogBox";
import {
  listAllCategory,
  listAllPublishedBlogResources,
} from "./Blogs.functions";
import DefaultImage from "../../../../public/images/blogimage1.png";
import { slugifyString } from "@/utils";
import { useParams, useRouter } from "next/navigation"; // Import useRouter
import BlogPagination from "@/components/BlogPagination";

// Create a placeholder component to wrap with the HOC
const BlogContent = () => null;

// Wrap the placeholder component with the HOC
const BlogBox = withBlogBox(BlogContent);

function extractFirstImage(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function ensureLeadingSlash(path: string | undefined | null): string | null {
  if (!path) return null;
  return path.startsWith('/') ? path : `/${path}`;
}

export default function BlogsPage({
  contentType,
  title,
  subtitle,
  route,
}: any) {
  const [blogData, setBlogData] = useState<any[]>([]);
  const [categoryList, setCategoryList] = useState<any[]>([]);
  const [noDataMessage, setNoDataMessage] = useState("");
  const [categoryLabel, setCategoryLabel] = useState<string>("Latest articles");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const params = useParams();
  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    getBlogData();
  }, [params?.category, currentPage]); // Re-fetch data when the category changes

  const getBlogData = async () => {
    const categoryPostData = { contentType };
    const categoryData = await listAllCategory({
      listBlogResourceInput: categoryPostData,
    });

    const newCategoryList = [
      { label: "Latest articles", slug: "latest-articles" },
      ...(categoryData || []).map((val: any) => ({
        label: val,
        slug: slugifyString(val),
      })),
    ];

    setCategoryList(newCategoryList);

    // Set the current category label based on the URL
    const category = params?.category;
    const selectedCategory =
      newCategoryList.find((val) => val.slug === category)?.label ||
      "Latest articles";
    setCategoryLabel(selectedCategory);

    // Fetch blog data for the selected category
    const postData = {
      contentType,
      category: selectedCategory === "Latest articles" ? "" : selectedCategory,
      page: currentPage,
      perPage: 6,
    };
    const data = await listAllPublishedBlogResources({
      listBlogResourceInput: postData,
    });
    setBlogData(data?.blogResources || []);
    setTotalRecords(data?.totalCount);
    setNoDataMessage(
      data?.blogResources?.length ? "" : `No ${contentType}s to display!`
    );
  };

  const handleCategoryClick = (slug: string) => {
    router.push(`/${route}/${slug}`);
  };

  return (
    <main>
      <TitleSection title={title} subtitle={subtitle} description="" />

      <div className="pt_blog">
        <div className="container-fluid">
          <div className="bloggrid">
            <div className="pt_blogleft">
              <h4>Categories</h4>
              <ul>
                {categoryList?.map((categoryItem: any) => (
                  <li key={categoryItem.label}>
                    <Link
                      href={`/${route?.toLowerCase()}/${categoryItem.slug}`}
                      onClick={(e) => {
                        e.preventDefault(); // Prevent default navigation
                        handleCategoryClick(categoryItem.slug); // Use router.push
                      }}
                    >
                      {categoryItem.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt_blogright">
              <div className="pt_bloginner">
                <div className="container-fluid">
                  <h4>{categoryLabel}</h4>
                  <div className="grid blogposts">
                    {blogData?.length > 0 ? (
                      blogData?.map((blog: any) => (
                        <BlogBox
                          key={blog?.id}
                          href={
                            `/${route?.toLowerCase()}/` +
                            slugifyString(blog?.category?.value) +
                            "/" +
                            slugifyString(blog?.title) +
                            "/" +
                            blog?.id
                          }
                          imageSrc={ensureLeadingSlash(blog?.banner?.file_path) || extractFirstImage(blog?.content) || DefaultImage}
                          title={blog?.title}
                          description={
                            blog?.category?.value || "No description"
                          }
                        />
                      ))
                    ) : (
                      <p>{noDataMessage}</p>
                    )}
                  </div>
                  {totalRecords > 6 && (
                    <BlogPagination
                      totalRecords={totalRecords}
                      currentPage={currentPage}
                      pageSize={6}
                      onPageChange={(page: number) => setCurrentPage(page)}
                    ></BlogPagination>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
