"use client";
import React from "react";
import ContractOverview from "./ContractOverview";
import { ContractOverviewContextProvider } from "./ContractOverviewContext";

export default function ContractOverviewWrapper() {
  return (
    <ContractOverviewContextProvider>
      <ContractOverview />
    </ContractOverviewContextProvider>
  );
}
