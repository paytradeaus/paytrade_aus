"use client";
import Home from "@/app/page";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Paytrade - Edit discussion",
  description:
    "Ask questions and share your knowledge with other PayTrade users",
};

export default function Page() {
  return <Home screen={"EDIT-DISCUSSION"} />;
}
