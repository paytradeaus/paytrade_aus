import { Metadata } from "next";
import Home from "../page";
import seoMetadata from "@/utils/seoMetadata";

export const metadata: Metadata = {
  title: "Help & AI Search | PayTrade",
  description:
    "Search PayTrade's knowledge base or ask PayTrade AI for help with project trust accounts, BIF Act, QBCC compliance, and more.",
};

export default function Page() {
  return <Home screen={"AI_SUPPORT"} />;
}
