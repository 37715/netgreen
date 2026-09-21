import Link from "next/link";
import { createLead } from "@/app/actions/leads";
import { LeadForm } from "@/components/LeadForm";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Quote book</div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-900">
            Add a lead
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Name and contact first. The rest can be filled in as the quote moves.
          </p>
        </div>
        <Link href="/leads" className="btn-secondary shrink-0">
          Cancel
        </Link>
      </div>

      <LeadForm action={createLead} submitLabel="Add to pipeline" />
    </div>
  );
}
