import React from "react";
import { BusinessProfileContextProvider } from "./BusinessProfileContext";
import BusinessProfile from "./BusinessProfile";

export default function BusinessWrapper({ isEditable }: any) {
  return (
    <BusinessProfileContextProvider>
      <BusinessProfile isEditable={isEditable} />
    </BusinessProfileContextProvider>
  );
}
