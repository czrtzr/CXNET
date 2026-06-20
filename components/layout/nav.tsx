// Shared navigation model, used by both the desktop sidebar and the mobile bar
// so the two never drift apart.

import {
  DashboardIcon,
  IncomeIcon,
  ExpensesIcon,
  InvestmentsIcon,
  SavingsIcon,
} from "@/components/svg/icons";
import type { ReactElement, SVGProps } from "react";

export type NavItem = {
  href: string;
  label: string;
  Icon: (props: SVGProps<SVGSVGElement> & { size?: number }) => ReactElement;
};

// The five primary destinations. Mobile shows exactly these as bottom tabs.
export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/income", label: "Income", Icon: IncomeIcon },
  { href: "/expenses", label: "Expenses", Icon: ExpensesIcon },
  { href: "/investments", label: "Investments", Icon: InvestmentsIcon },
  { href: "/accounts", label: "Accounts", Icon: SavingsIcon },
];
