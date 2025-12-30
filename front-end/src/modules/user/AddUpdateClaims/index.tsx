"use client";
import { AddUpdateClaimsContextProvider } from "./AddUpdateClaimsContext";
import AddUpdateClaims from "./AddUpdateClaims";

export default function AddUpdateClaimsWrapper({ editMode, viewMode }: any) {
  return (
    <AddUpdateClaimsContextProvider>
      <AddUpdateClaims editMode={editMode} viewMode={viewMode} />
    </AddUpdateClaimsContextProvider>
  );
}
