import Link from "next/link";
import {
  ChartIcon,
  HomeIcon,
  LeadsIcon,
  ProjectIcon,
  ReceiptIcon,
} from "@/components/icons";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const tools = [
  {
    href: "/leads",
    label: "Lead tracker",
    detail: "Enquiries, quotes and follow-ups.",
    Icon: LeadsIcon,
  },
  {
    href: "/marketing",
    label: "Marketing",
    detail: "Ads, website and Google profile.",
    Icon: ChartIcon,
  },
  {
    href: "/projects",
    label: "Projects",
    detail: "Bigger jobs, materials and margins.",
    Icon: ProjectIcon,
  },
  {
    href: "/overheads",
    label: "Costs",
    detail: "Regular overheads.",
    Icon: ReceiptIcon,
  },
  {
    href: "/",
    label: "Money",
    detail: "Takings, what's still owed, and the books.",
    Icon: HomeIcon,
  },
];

export default function ToolsPage() {
  return (
    <div>
      <PageHeader title="Tools" subtitle="Everything that isn't today's job list." />
      <ul className="grid gap-2">
        {tools.map(({ href, label, detail, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="card flex items-center gap-3 px-4 py-3.5 active:bg-stone-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-brand-900">{label}</span>
                <span className="mt-0.5 block text-sm text-stone-500">{detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
