"use client";

import React, { useState } from "react";
import EditPersonalInfo from "./editPersonalInfo/editPersonalInfo";
import PersonalInfo from "./personalInfo/personalInfo";
import { useTokenDetails } from "@/common/commonHooks";

export default function PersonalInfoPage() {
  const [enableEditMode, setEnableEditMode] = useState(false);
  const { decodeTokenData } = useTokenDetails();

  return enableEditMode ? (
    <EditPersonalInfo
      onClose={() => setEnableEditMode(false)}
      adminUUID={decodeTokenData?.id}
    />
  ) : (
    <PersonalInfo
      onEdit={() => setEnableEditMode(true)}
      adminUUID={decodeTokenData?.id}
    />
  );
}
