"use client";

import "bootstrap/dist/css/bootstrap.css";

import SubscriptionStoreProvider from "@/redux/SubscriptionStoreProvider";

export default function RegisteredDashBoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SubscriptionStoreProvider>{children}</SubscriptionStoreProvider>;
}
