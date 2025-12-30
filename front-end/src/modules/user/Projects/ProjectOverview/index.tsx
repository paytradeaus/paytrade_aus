"use client";
import React from "react";
import { ProjectOverviewContextProvider } from "./ProjectOverviewContext";
import ProjectOverview from "./ProjectOverview";
export default function ProjectOverviewWrapper() {
  return (
    <ProjectOverviewContextProvider>
      <ProjectOverview />
    </ProjectOverviewContextProvider>
  );
}
