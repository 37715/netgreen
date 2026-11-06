export type JobStatusValue = "SCHEDULED" | "DONE" | "SKIPPED";

export type JobStatusToggleInput = {
  id: number;
  expectedStatus: JobStatusValue;
  expectedVersion: number;
};

/**
 * Build a compare-and-swap status mutation. The `where` fields are deliberately
 * copied from the rendered row so an old page cannot overwrite a newer change.
 */
export function buildJobStatusToggle(
  input: JobStatusToggleInput,
  changedAt = new Date()
) {
  const toStatus: JobStatusValue =
    input.expectedStatus === "DONE" ? "SCHEDULED" : "DONE";

  return {
    where: {
      id: input.id,
      status: input.expectedStatus,
      statusVersion: input.expectedVersion,
    },
    data:
      toStatus === "DONE"
        ? {
            status: toStatus,
            statusVersion: { increment: 1 as const },
            completedAt: changedAt,
          }
        : {
            status: toStatus,
            statusVersion: { increment: 1 as const },
            completedAt: null,
            paidAt: null,
            paymentMethod: null,
          },
    event: {
      jobId: input.id,
      fromStatus: input.expectedStatus,
      toStatus,
    },
  };
}

export function isJobStatus(value: string): value is JobStatusValue {
  return value === "SCHEDULED" || value === "DONE" || value === "SKIPPED";
}
