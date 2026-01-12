import { Metadata } from "next";
import seoMetadata from "@/utils/seoMetadata";
import FaqClientPage from "./FaqClientPage";

export const dynamic = 'force-dynamic';
export const metadata: Metadata = seoMetadata.faq;

export default function Page() {
  return <FaqClientPage />;
}
