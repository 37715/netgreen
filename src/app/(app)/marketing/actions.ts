"use server";

import { auth, isAuthEnabled } from "@/auth";
import { updateTag } from "next/cache";

export async function refreshMarketing() {
  if (isAuthEnabled()) {
    const session = await auth();
    if (!session?.user) return;
  }
  updateTag("marketing-sheets");
}
