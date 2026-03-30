"use client";
import AiHelpWidget from "@/components/AiHelpWidget/AiHelpWidget";

export default function XeroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AiHelpWidget context="Xero Integration" />
    </>
  );
}
