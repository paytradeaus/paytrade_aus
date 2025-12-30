"use client";

import "bootstrap/dist/css/bootstrap.css";

import ClientSuppliersStoreProvider from "@/redux/ClientSupplierStoreProvider";

export default function RegisteredDashBoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientSuppliersStoreProvider>{children}</ClientSuppliersStoreProvider>
  );
}
