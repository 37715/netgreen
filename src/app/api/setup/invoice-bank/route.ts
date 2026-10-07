import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

const setupTokenHash = Buffer.from(
  "a113690d1ad85b426e649b992d187c65471a8d6c1c8e6a7edf2f46b5f421a5a5",
  "hex"
);

function hasValidSetupToken(request: Request): boolean {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const candidateHash = createHash("sha256").update(token).digest();

  return (
    candidateHash.length === setupTokenHash.length &&
    timingSafeEqual(candidateHash, setupTokenHash)
  );
}

export async function POST(request: Request) {
  if (!hasValidSetupToken(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    bankName?: unknown;
    accountNumber?: unknown;
    sortCode?: unknown;
  };
  const bankName = String(body.bankName || "").trim();
  const accountNumber = String(body.accountNumber || "").trim();
  const sortCode = String(body.sortCode || "").trim();

  if (!bankName || !/^\d{8}$/.test(accountNumber) || !/^\d{2}-\d{2}-\d{2}$/.test(sortCode)) {
    return Response.json({ error: "Invalid bank details" }, { status: 400 });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      invoiceBankName: bankName,
      invoiceAccountNumber: accountNumber,
      invoiceSortCode: sortCode,
    },
    create: {
      id: 1,
      invoiceBankName: bankName,
      invoiceAccountNumber: accountNumber,
      invoiceSortCode: sortCode,
    },
  });

  return Response.json({ ok: true });
}
