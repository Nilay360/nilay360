import { redirect } from "next/navigation";

// The investment calculator is now part of the unified calculator suite.
// Preserve the old route by redirecting to the Affordability tab.
export default function InvestmentCalculatorPage() {
  redirect("/calculator?tab=affordability");
}
