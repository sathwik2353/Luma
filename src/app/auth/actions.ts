
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LOGIN_PATH = "/app/login";
const DASHBOARD_PATH = "/";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

function getSiteUrl(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configuredUrl) {
    return null;
  }

  try {
    const url = new URL(configuredUrl);

    if (
      process.env.NODE_ENV === "production" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    if (
      process.env.NODE_ENV !== "production" &&
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export async function signIn(formData: FormData): Promise<void> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`${LOGIN_PATH}?error=invalid-input`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Avoid logging passwords or other authentication secrets.
    console.error("Luma sign-in failed:", error.code ?? "unknown");

    redirect(`${LOGIN_PATH}?error=sign-in-failed`);
  }

  redirect(DASHBOARD_PATH);
}

export async function signUp(formData: FormData): Promise<void> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`${LOGIN_PATH}?error=invalid-input`);
  }

  const siteUrl = getSiteUrl();

  if (!siteUrl) {
    console.error("Luma signup failed: invalid site URL configuration");
    redirect(`${LOGIN_PATH}?error=configuration-error`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    // Log only the error code; never log passwords or confirmation tokens.
    console.error(
      "Luma signup failed:",
      error.code ?? "unknown",
      error.message
    );

    redirect(`${LOGIN_PATH}?error=sign-up-failed`);
  }

  if (!data.session) {
    redirect(`${LOGIN_PATH}?message=check-email`);
  }

  redirect(DASHBOARD_PATH);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Luma sign-out failed:", error.code ?? "unknown");
    redirect(`${LOGIN_PATH}?error=sign-out-failed`);
  }

  redirect(LOGIN_PATH);
}
