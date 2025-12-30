"use client";
import React from "react";
import BankAccountOverview from "./BankAccountOverview";
import { BankAccountOverviewContextProvider } from "./BankAccountOverviewContext";

export default function BankAccountOverviewWrapper() {
  return (
    <BankAccountOverviewContextProvider>
      <BankAccountOverview />
    </BankAccountOverviewContextProvider>
  );
}
