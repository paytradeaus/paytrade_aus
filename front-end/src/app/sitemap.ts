import { getList } from "@/modules/admin/AdminCommunity/community.functions";
import { listAllPublishedBlogResources } from "@/modules/general/Blogs/Blogs.functions";
import { slugifyString } from "@/utils";
import { type MetadataRoute } from "next";

async function getBlog() {
  const data = await listAllPublishedBlogResources({
    listBlogResourceInput: {
      contentType: "Blog",
    },
  });
  return data?.blogResources || [];
}

async function getResource() {
  const data = await listAllPublishedBlogResources({
    listBlogResourceInput: {
      contentType: "Resource",
    },
  });
  return data?.blogResources || [];
}

async function getHowToGuides() {
  const data = await listAllPublishedBlogResources({
    listBlogResourceInput: {
      contentType: "howToGuide",
    },
  });
  return data?.blogResources || [];
}

async function getDiscussion() {
  const data = await getList({
    listDiscussionIdeasInput: {
      cmtyContentType: "Discussion",
    },
  });
  return data?.discussionIdeas || [];
}
async function getProductIdea() {
  const data = await getList({
    listDiscussionIdeasInput: {
      cmtyContentType: "Idea",
    },
  });
  return data?.discussionIdeas || [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_DEPLOYED_URL;
  const blogList = await getBlog();
  const resourceList = await getResource();
  const howToGuidesList = await getHowToGuides();
  const discussionList = await getDiscussion();
  const productIdeaList = await getProductIdea();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}principals`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}bookkeepers`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}headcontractors`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}auditors`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}subcontractors`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}legal-practitioners`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}accountants`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}features`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}get-support`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}how-to-guides`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}faq`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}blog`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}community`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}articles`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}user/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 1,
    },
    {
      url: `${baseUrl}community/discussions`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}community/discussions`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${baseUrl}community/product-ideas`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];

  // Get all blog categories and their routes
  let uniqueCategories: any = [];
  blogList.forEach((post: any) => {
    if (!uniqueCategories.includes(post.category.value)) {
      uniqueCategories.push(post.category.value);
    }
  });
  const blogCategoryRoutes = uniqueCategories.map((category: any) => ({
    url: `${baseUrl}blog/${category}`,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));
  const blogRoutes = blogList.map((blog: any) => ({
    url: `${baseUrl}blog/${slugifyString(blog.category.value)}/${slugifyString(
      blog.title
    )}/${blog.id}`,
    lastModified: blog?.published_on || new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));

  // Get all resources and their routes
  let uniqueResource: any = [];
  resourceList.forEach((post: any) => {
    if (!uniqueResource.includes(post.category.value)) {
      uniqueResource.push(post.category.value);
    }
  });
  const resourceCategoryRoutes = uniqueResource.map((category: any) => ({
    url: `${baseUrl}articles/${slugifyString(category)}`,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));
  const resourceRoutes = resourceList.map((blog: any) => ({
    url: `${baseUrl}articles/${slugifyString(
      blog.category.value
    )}/${slugifyString(blog.title)}/${blog.id}`,
    lastModified: blog?.published_on || new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));

  // Get all how to guides and their routes
  let uniqueHowToGuides: any = [];
  howToGuidesList.forEach((post: any) => {
    if (!uniqueHowToGuides.includes(post.category.value)) {
      uniqueHowToGuides.push(post.category.value);
    }
  });
  const howToGuidesCategoryRoutes = uniqueHowToGuides.map((category: any) => ({
    url: `${baseUrl}how-to-guides/${slugifyString(category)}`,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));
  const howToGuidesRoutes = howToGuidesList.map((blog: any) => ({
    url: `${baseUrl}how-to-guides/${slugifyString(
      blog.category.value
    )}/${slugifyString(blog.title)}/${blog.id}`,
    lastModified: blog?.published_on || new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));

  // Get all discussion categories and their routes
  let uniqueDiscussion: any = [];
  discussionList.forEach((post: any) => {
    if (!uniqueDiscussion.includes(post.category.value)) {
      uniqueDiscussion.push(post.category.value);
    }
  });
  const discussionCategoryRoutes = uniqueDiscussion.map((category: any) => ({
    url: `${baseUrl}community/discussions/${slugifyString(category || "All")}`,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));
  const discussionRoutes = discussionList.map((val: any) => ({
    url: `${baseUrl}community/discussions/${slugifyString(
      val?.category?.value || "All"
    )}/${slugifyString(val.title)}/${val.id}`,
    lastModified: val?.created_on || new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));

  // Get all product idea categories and their routes
  let uniqueProductIdea: any = [];
  productIdeaList.forEach((post: any) => {
    if (!uniqueProductIdea.includes(post.category.value)) {
      uniqueProductIdea.push(post.category.value);
    }
  });
  const productIdeaCategoryRoutes = uniqueProductIdea.map((category: any) => ({
    url: `${baseUrl}community/product-ideas/${slugifyString(
      category || "All"
    )}`,
    changeFrequency: "hourly",
    lastModified: new Date(),
    priority: 1,
  }));
  const productIdeaRoutes = productIdeaList.map((val: any) => ({
    url: `${baseUrl}community/product-ideas/${slugifyString(
      val?.category?.value || "All"
    )}/${slugifyString(val.title)}/${val.id}`,
    changeFrequency: "hourly",
    lastModified: val?.created_on || new Date(),
    priority: 1,
  }));

  const totalRoutes = [
    ...staticRoutes,
    ...blogCategoryRoutes,
    ...blogRoutes,
    ...resourceCategoryRoutes,
    ...resourceRoutes,
    ...howToGuidesCategoryRoutes,
    ...howToGuidesRoutes,
    ...discussionCategoryRoutes,
    ...discussionRoutes,
    ...productIdeaCategoryRoutes,
    ...productIdeaRoutes,
  ];
  console.log(totalRoutes);
  return totalRoutes;
}
