"use client";
import React, { Fragment, useState } from "react";
import SyncLogDetailsBasic from "./basic";
import SyncLogDetailsInvoice from "./invoice";

export default function SyncLogDetails() {
  return (
    <>
      <SyncLogDetailsBasic />
      {/* <SyncLogDetailsInvoice /> */}
    </>
  );
}
