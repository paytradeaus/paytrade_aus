import { getList } from "@/modules/admin/AdminCommunity/community.functions";
import { listAllPublishedBlogResources } from "@/modules/general/Blogs/Blogs.functions";
import { getActiveSeoKeywords } from "@/modules/general/SeoKeywords/seo-keywords.functions";
import { slugifyString } from "@/utils";
import { type MetadataRoute } from "next";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  // Hardcoded to ensure correct URL - www subdomain is not supported
  const baseUrl = 'https://paytrade.app/';
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
      url: `${baseUrl}community/product-ideas`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];

  const validBlogList = blogList.filter((post: any) => post?.category?.value);
  let uniqueCategories: any = [];
  validBlogList.forEach((post: any) => {
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
  const blogRoutes = validBlogList.map((blog: any) => ({
    url: `${baseUrl}blog/${slugifyString(blog.category.value)}/${slugifyString(
      blog.title
    )}/${blog.id}`,
    lastModified: blog?.published_on || new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));

  const validResourceList = resourceList.filter((post: any) => post?.category?.value);
  let uniqueResource: any = [];
  validResourceList.forEach((post: any) => {
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
  const resourceRoutes = validResourceList.map((blog: any) => ({
    url: `${baseUrl}articles/${slugifyString(
      blog.category.value
    )}/${slugifyString(blog.title)}/${blog.id}`,
    lastModified: blog?.published_on || new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));

  const validHowToGuidesList = howToGuidesList.filter((post: any) => post?.category?.value);
  let uniqueHowToGuides: any = [];
  validHowToGuidesList.forEach((post: any) => {
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
  const howToGuidesRoutes = validHowToGuidesList.map((blog: any) => ({
    url: `${baseUrl}how-to-guides/${slugifyString(
      blog.category.value
    )}/${slugifyString(blog.title)}/${blog.id}`,
    lastModified: blog?.published_on || new Date(),
    changeFrequency: "hourly",
    priority: 1,
  }));

  let uniqueDiscussion: any = [];
  discussionList.forEach((post: any) => {
    const catVal = post?.category?.value;
    if (catVal && !uniqueDiscussion.includes(catVal)) {
      uniqueDiscussion.push(catVal);
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

  let uniqueProductIdea: any = [];
  productIdeaList.forEach((post: any) => {
    const catVal = post?.category?.value;
    if (catVal && !uniqueProductIdea.includes(catVal)) {
      uniqueProductIdea.push(catVal);
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

  let seoKeywordRoutes: MetadataRoute.Sitemap = [];
  try {
    const seoData = await getActiveSeoKeywords();
    if (seoData?.seoKeywords?.length > 0) {
      seoKeywordRoutes = seoData.seoKeywords
        .filter((kw: any) => !kw.redirect_url)
        .map((kw: any) => ({
        url: `${baseUrl}topics/${kw.slug}`,
        lastModified: kw.updated_on || new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch (e) {
    console.log('Error fetching SEO keywords for sitemap:', e);
  }

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
    ...seoKeywordRoutes,
  ];
  console.log(totalRoutes);
  return totalRoutes;
}
