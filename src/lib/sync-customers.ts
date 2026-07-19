import { prisma } from "@/lib/db";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Titles that are calendar noise, not people/rounds to put on the customer list. */
function isJunkTitle(title: string): boolean {
  const t = normalizeName(title);
  if (!t || t === "(no title)") return true;
  if (t.startsWith("free ")) return true;
  if (t.includes("viewing")) return true;
  if (t.includes("discovery call")) return true;
  if (t === "rubbish dump") return true;
  return false;
}

/**
 * Create Customer rows for calendar job titles that were never linked
 * (ICS import left customerId null), and attach those jobs.
 * Also links orphan jobs onto existing customers when the name matches.
 */
export async function syncCustomersFromCalendarJobs(): Promise<{
  created: number;
  linked: number;
  skippedJunk: number;
}> {
  const orphanJobs = await prisma.scheduledJob.findMany({
    where: { customerId: null },
    select: { id: true, title: true },
  });

  const existing = await prisma.customer.findMany({
    select: { id: true, name: true },
  });
  const byNorm = new Map<string, number>();
  for (const c of existing) {
    byNorm.set(normalizeName(c.name), c.id);
  }

  let created = 0;
  let linked = 0;
  let skippedJunk = 0;

  // Group orphan job ids by normalized title (keep a display name).
  const groups = new Map<string, { display: string; ids: number[] }>();
  for (const j of orphanJobs) {
    if (isJunkTitle(j.title)) {
      skippedJunk += 1;
      continue;
    }
    const norm = normalizeName(j.title);
    const cur = groups.get(norm);
    if (cur) cur.ids.push(j.id);
    else groups.set(norm, { display: j.title.trim().replace(/\s+/g, " "), ids: [j.id] });
  }

  for (const [norm, group] of groups) {
    let customerId = byNorm.get(norm);
    if (customerId == null) {
      const customer = await prisma.customer.create({
        data: {
          name: group.display,
          recurrence: "NONE",
        },
      });
      customerId = customer.id;
      byNorm.set(norm, customerId);
      created += 1;
    }

    const result = await prisma.scheduledJob.updateMany({
      where: { id: { in: group.ids }, customerId: null },
      data: { customerId },
    });
    linked += result.count;
  }

  return { created, linked, skippedJunk };
}
