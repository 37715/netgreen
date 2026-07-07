"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/calendar" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
