import { notFound } from "next/navigation";
import AmazonAdminClient from "./AmazonAdminClient";
import { requireSuperAdmin } from "@/lib/server-auth";

export default async function AdminAmazonPage() {
  const account = await requireSuperAdmin();
  if (!account || account.username !== "Kopernikus") {
    notFound();
  }

  return <AmazonAdminClient />;
}