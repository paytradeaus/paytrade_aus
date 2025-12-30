"use client";

import { FullPageLoader } from "@/components/Loader/fullPageLoader";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return <FullPageLoader setLoading={true} />;
}
