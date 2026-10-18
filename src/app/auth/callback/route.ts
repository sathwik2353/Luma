
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorCode = requestUrl.searchParams.get("error_code");
  const oauthErrorDescription =
    requestUrl.searchParams.get("error_description");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;

  const loginUrl = new URL("/app/login", siteUrl);

  // Handle errors returned by the OAuth provider before code exchange.
  if (oauthError) {
    console.error("[OAuth callback] Provider returned an error:", {
      error: oauthError,
      errorCode: oauthErrorCode,
      description: oauthErrorDescription,
    });

    loginUrl.searchParams.set("error", "google-sign-in-failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    console.error(
      "[OAuth callback] No authorization code or provider error received."
    );

    loginUrl.searchParams.set("error", "missing-auth-code");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(
        "[OAuth callback] Session exchange failed:",
        error.message
      );

      loginUrl.searchParams.set("error", "session-exchange-failed");
      return NextResponse.redirect(loginUrl);
    }

    const next = requestUrl.searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/";

    return NextResponse.redirect(new URL(safeNext, siteUrl));
  } catch (error) {
    console.error(
      "[OAuth callback] Unexpected error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    loginUrl.searchParams.set("error", "callback-failed");
    return NextResponse.redirect(loginUrl);
  }
}
