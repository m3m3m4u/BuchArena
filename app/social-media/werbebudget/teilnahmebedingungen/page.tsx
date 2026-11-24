import { redirect } from "next/navigation";
import { AD_BUDGET_TERMS_PATH } from "@/lib/werbebudget-terms";

export default function CurrentAdBudgetTermsPage() {
  redirect(AD_BUDGET_TERMS_PATH);
}
