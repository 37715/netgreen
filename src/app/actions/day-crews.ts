"use server";

import { fromDateInput } from "@/lib/dates";
import {
  addCrewToDayRecord,
  removeCrewFromDayRecord,
} from "@/lib/day-crews";
import { revalidatePath } from "next/cache";

export async function addCrewToDay(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  const crewId = Number(formData.get("crewId"));
  if (!dateStr || !crewId) return;

  await addCrewToDayRecord(fromDateInput(dateStr), crewId);
  revalidatePath("/calendar");
}

export async function removeCrewFromDay(formData: FormData) {
  const dateStr = String(formData.get("date") || "");
  const crewId = Number(formData.get("crewId"));
  if (!dateStr || !crewId) return;

  await removeCrewFromDayRecord(fromDateInput(dateStr), crewId);
  revalidatePath("/calendar");
}
