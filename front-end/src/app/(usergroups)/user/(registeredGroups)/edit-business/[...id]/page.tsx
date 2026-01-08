"use client";

import EditBusinessDetails from "@/container/editBusinessDetails/editBusinessDetails";
import dynamic from "next/dynamic";
import React from "react";

const EditBusiness = () => {
  return (
    <div>
        <EditBusinessDetails isEdit={true}></EditBusinessDetails>
    </div>
  );
};

export default dynamic(() => Promise.resolve(EditBusiness), { ssr: false })
