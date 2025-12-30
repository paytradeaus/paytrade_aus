import ArticlesRecommendedPage from "@/container/userModules/blogAndResources/articlesRecommended/articlesRecommended";
import { setMetadata } from "@/container/userModules/blogAndResources/blogAndResources.function";
import { Metadata } from "next";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const postData: any = {
    slugOrId: params?.selectedArticle[1],
  };

  const response = await setMetadata(postData);

  return {
    title: response?.blogResource?.category?.value,
    description: response?.blogResource?.title,
    icons: {
      icon: "/favicon.png",
    },
    openGraph: {
      type: "website",
      title: response?.blogResource?.category?.value,
      description: response?.blogResource?.title,
      images: [
        {
          url: response?.blogResource?.banner?.file_path,
        },
      ],
    },
  };
}

export default function ArticlesRecommended() {
  return <ArticlesRecommendedPage></ArticlesRecommendedPage>;
}
