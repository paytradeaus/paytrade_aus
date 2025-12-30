"use client";
import React, { useState } from "react";
import ChangeEmail from "./changeEmail/changeEmail";
import AuthenticateEmail from "./authenticateEmail/authenticateEmail";
const AuthenticateEmailHome = () => {
  const [viewScreenType, setViewScreenType] = useState("emailScreen");
  const [newEmailId, setNewEmailId] = useState("");

  switch (viewScreenType) {
    case "emailScreen":
      return (
        <ChangeEmail
          setNewEmailId={setNewEmailId}
          setViewScreenType={setViewScreenType}
        />
      );
    case "codeScreen":
      return (
        <AuthenticateEmail
          setViewScreenType={setViewScreenType}
          newEmailID={newEmailId}
        />
      );
    default:
      return <div>Invalid Screen Type</div>;
  }
};
export default AuthenticateEmailHome;
