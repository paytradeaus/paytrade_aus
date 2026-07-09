//default imports
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

//import from constants, interfaces ,functions and services
// import { UN_AUTHORIZED_URLS, AppRoutes } from "./common/applicationURLS";
import CryptoJS from "crypto-js";
import { AdminRoles, UserRoles } from "@/shared/constant/role";
import { AppRoutes, UN_AUTHORIZED_URLS } from "@/shared/constant/appRoutes";

/**
 * Middleware function to handle authentication and authorization.
 *
 * @param request - The incoming Next.js request object.
 * @returns The Next.js response object or void.
 */

// Object to store flags
let middlewareExecuted: Record<string, boolean> = {};
export function middleware(request: NextRequest) {
  // Extract the authentication token from cookies
  // const authToken = request.cookies.get("accessToken")?.value ?? "";
  const authTokenVerification =
    request.cookies.get("accessVerification")?.value ?? "";

  const decryptedVerificationData = CryptoJS.AES.decrypt(
    authTokenVerification,
    "token-verification"
  ).toString(CryptoJS.enc.Utf8);
  let parsedVerificationData;

  try {
    // Attempt to parse decrypted data
    parsedVerificationData = JSON.parse(decryptedVerificationData);
  } catch (error) {
    // console.log(parsedVerificationData, "decryptedVerificationData");
    // Handle invalid JSON or decryption failure here, return or continue based on your logic
    //  return NextResponse.redirect(new URL(AppRoutes.HOME, request.url)); // Or another appropriate fallback
  }
  // Decrypt the authentication token
  // const decryptedToken: any = authToken ? jwtDecode(authToken) : "";

  const isAdminLoginPath = request.nextUrl.pathname === "/admin/login";
  const isUserLoginPath = request.nextUrl.pathname === "/user/login";

  // Check if the middleware has already been executed
  if (middlewareExecuted[request.url]) {
    return NextResponse.next();
  }

  if (
    (isAdminLoginPath || isUserLoginPath) &&
    middlewareExecuted[request.url]
  ) {
    return NextResponse.next();
  }

  // // Set a flag to indicate that the middleware has been executed
  isAdminLoginPath || isUserLoginPath
    ? (middlewareExecuted[request.url] = true)
    : null;

  let unAuthorizedPaths = UN_AUTHORIZED_URLS.some(
    (path: string) => path === request.nextUrl.pathname
  );

  const isAdminPath = request.nextUrl.pathname.startsWith("/admin/");
  const isUserPath = request.nextUrl.pathname.startsWith("/user/");

  const isAdminsRole = AdminRoles.includes(parsedVerificationData?.role);
  const isUsersRole = UserRoles.includes(parsedVerificationData?.role);

  // Check if route contains the "screen=import" query parameter
  const searchParams = new URLSearchParams(request.nextUrl.search);
  const isImportScreen = searchParams.get("screen") === "import";

  // Dynamically get the base path (scheme + host + port)
  const basePath = request.nextUrl.origin;
  if (isImportScreen) {
    const fullRoute = `${process.env.NEXT_PUBLIC_DEPLOYED_URL}${
      request.nextUrl.pathname
    }?${searchParams.toString()}`;
    const responseWithCookie = NextResponse.next();
    responseWithCookie.cookies.set("redirectAfterLogin", fullRoute, {
      path: "/",
      secure: false,
      httpOnly: false,
      sameSite: "strict",
    });
    if (!parsedVerificationData) {
      if (unAuthorizedPaths) {
        return responseWithCookie;
      } else {
        const redirectResponse = NextResponse.redirect(
          new URL(AppRoutes.USER_LOGIN, request.url)
        );
        redirectResponse.cookies.set("redirectAfterLogin", fullRoute, {
          path: "/",
          secure: false,
          httpOnly: false,
          sameSite: "strict",
        });
        return redirectResponse;
      }
    }
    return responseWithCookie;
  }

  if (!parsedVerificationData) {
    if (unAuthorizedPaths) {
      return NextResponse.next();
    }
    // Session missing/expired: send the visitor to the matching login page
    // instead of the homepage so they can sign back in and continue.
    if (
      request.nextUrl.pathname === "/admin" ||
      request.nextUrl.pathname.startsWith("/admin/")
    ) {
      return NextResponse.redirect(new URL(AppRoutes.ADMIN_LOGIN, request.url));
    }
    if (
      request.nextUrl.pathname === "/user" ||
      request.nextUrl.pathname.startsWith("/user/")
    ) {
      return NextResponse.redirect(new URL(AppRoutes.USER_LOGIN, request.url));
    }
    return NextResponse.redirect(new URL(AppRoutes.HOME, request.url));
  }

  if (isAdminLoginPath) {
    return isAdminsRole
      ? NextResponse.redirect(new URL(AppRoutes.ADMIN_DASHBOARD, request.url))
      : NextResponse.redirect(new URL(AppRoutes.ADMIN_LOGIN, request.url));
  }

  if (isUserLoginPath) {
    return isUsersRole
      ? NextResponse.redirect(new URL(AppRoutes.USER_DASHBOARD, request.url))
      : NextResponse.redirect(new URL(AppRoutes.USER_LOGIN, request.url));
  }
  if (unAuthorizedPaths) {
    return NextResponse.next();
  }
  if (isAdminPath && !isAdminsRole) {
    return NextResponse.redirect(new URL(AppRoutes.ADMIN_LOGIN, request.url));
  }

  if (isUserPath && !isUsersRole) {
    return NextResponse.redirect(new URL(AppRoutes.USER_LOGIN, request.url));
  }
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/admin/:path*", "/user/:path*"],
};
