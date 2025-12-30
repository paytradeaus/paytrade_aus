//default imports
"use client";

import React, { useState } from "react";
//import from reactstrap components
//import from customized components
import PersonalInfo from "@/container/personalInfo/personalInfo";
import EditPersonalInfo from "@/container/editPersonalInfo/editPersonalInfo";
//import customized styles
//import from external libraries
//import from constants, interfaces ,functions and services
//module level constants and interfaces

export default function PersonalInfoPage() {
  //useState and useEffect Management
  const [enableEditMode, setEnableEditMode] = useState(false);
  //other Hooks

  //Formik Handling

  //functions

  //render Template
  return enableEditMode ? (
    <EditPersonalInfo onClose={() => setEnableEditMode(false)} />
  ) : (
    <PersonalInfo onEdit={() => setEnableEditMode(true)} />
  );
}
