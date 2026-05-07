"use client";
import { useTokenDetails } from "@/hooks";
import { getCookie } from "cookies-next";
import GuestNavbar from "../GuestNavbar";
import MemberNavbar from "../MemberNavbar";
import { useEffect, useState } from "react";

export default function SiteHeader() {
  const { accessTokenId } = useTokenDetails();
  const [authVerification, setAuthVerification] = useState<
    string | undefined
  >();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAuthVerification(getCookie("accessVerification") as string | undefined);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <GuestNavbar />;
  }

  const isLoggedIn = Boolean(accessTokenId && authVerification);
  return isLoggedIn ? <MemberNavbar /> : <GuestNavbar />;
}
