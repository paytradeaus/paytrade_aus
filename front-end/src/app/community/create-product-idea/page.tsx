"use client";
import Home from "@/app/page";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Paytrade - Create product idea",
  description: "Suggest new products and features to be added to PayTrade",
};

export default function Page() {
  return <Home screen={"CREATE-PRODUCT-IDEAS"} />;
}
