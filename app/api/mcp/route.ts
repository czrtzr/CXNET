import { z } from "zod";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveToken } from "@/lib/mcp/tokens";
import * as q from "@/lib/mcp/queries";
import type { ToolResult } from "@/lib/mcp/queries";

// Remote MCP server: the user's own Claude connects here as a custom connector
// over Streamable HTTP. CXNET makes no model calls of its own. Every tool is
// scoped to the user id resolved from the bearer token (see withMcpAuth below),
// never to anything in the tool arguments, so data never crosses accounts.
export const runtime = "nodejs";

// Pull the verified user id out of the auth info the wrapper attached. The
// non-null assertions are safe: withMcpAuth runs with required:true, so a tool
// only executes once a token has resolved to a user.
function userIdOf(extra: { authInfo?: AuthInfo }): string {
  return extra.authInfo!.extra!.userId as string;
}

function present(result: ToolResult) {
  const text = result.ok
    ? JSON.stringify(result.data, null, 2)
    : result.error;
  return { content: [{ type: "text" as const, text }], isError: !result.ok };
}

const handler = createMcpHandler(
  (server) => {
    // --- Reads ---------------------------------------------------------------
    server.registerTool(
      "get_net_worth",
      {
        description:
          "Get the user's current net worth and its breakdown (accounts, investments, tangible assets, receivables, debts), in their base currency.",
        inputSchema: {},
      },
      async (_args, extra) =>
        present(await q.getNetWorth(createAdminClient(), userIdOf(extra))),
    );

    server.registerTool(
      "list_accounts",
      {
        description:
          "List the user's cash and savings accounts with balances, types, and institutions.",
        inputSchema: {},
      },
      async (_args, extra) =>
        present(await q.listAccounts(createAdminClient(), userIdOf(extra))),
    );

    server.registerTool(
      "recent_transactions",
      {
        description:
          "List the user's most recent income and expense entries, newest first.",
        inputSchema: {
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe("How many entries to return (default 20, max 100)."),
        },
      },
      async (args, extra) =>
        present(
          await q.recentTransactions(createAdminClient(), userIdOf(extra), args.limit ?? 20),
        ),
    );

    server.registerTool(
      "spending_by_category",
      {
        description:
          "Total the user's expenses by category since a given date, in their base currency.",
        inputSchema: {
          since: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe("Start date (inclusive), YYYY-MM-DD."),
        },
      },
      async (args, extra) =>
        present(await q.spendingByCategory(createAdminClient(), userIdOf(extra), args.since)),
    );

    server.registerTool(
      "monthly_cashflow",
      {
        description:
          "Get total income, total expenses, and net cashflow for a calendar month, in the user's base currency.",
        inputSchema: {
          month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .describe("The month as YYYY-MM."),
        },
      },
      async (args, extra) =>
        present(await q.monthlyCashflow(createAdminClient(), userIdOf(extra), args.month)),
    );

    // --- Writes --------------------------------------------------------------
    server.registerTool(
      "add_expense",
      {
        description:
          "Record an expense. If an account name is given (or the user has a default expense account) the balance is updated. Currency and date default to the user's base currency and today.",
        inputSchema: {
          description: z.string().describe("What the expense was for."),
          amount: z.number().positive().describe("Amount spent."),
          currency: z.string().length(3).optional().describe("ISO currency code, e.g. USD."),
          account: z.string().optional().describe("Account name to draw from."),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD."),
          notes: z.string().optional(),
        },
      },
      async (args, extra) =>
        present(await q.addExpense(createAdminClient(), userIdOf(extra), args)),
    );

    server.registerTool(
      "add_income",
      {
        description:
          "Record income. If an account name is given (or the user has a default income account) the balance is updated. Currency and date default to the user's base currency and today.",
        inputSchema: {
          source: z.string().describe("Where the income came from."),
          amount: z.number().positive().describe("Amount received."),
          currency: z.string().length(3).optional().describe("ISO currency code, e.g. USD."),
          account: z.string().optional().describe("Account name to deposit into."),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD."),
          notes: z.string().optional(),
        },
      },
      async (args, extra) =>
        present(await q.addIncome(createAdminClient(), userIdOf(extra), args)),
    );

    server.registerTool(
      "record_payment",
      {
        description:
          "Record a payment against a debt, matched by the debt's name. The payment currency follows the debt; an optional account is debited.",
        inputSchema: {
          debt: z.string().describe("The name of the debt/liability to pay."),
          amount: z.number().positive().describe("Payment amount."),
          account: z.string().optional().describe("Account name to pay from."),
          paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD."),
          note: z.string().optional(),
        },
      },
      async (args, extra) =>
        present(await q.recordPayment(createAdminClient(), userIdOf(extra), args)),
    );
  },
  { serverInfo: { name: "cxnet", version: "1.0.0" } },
  // Route lives at /api/mcp, so basePath "/api" makes the Streamable HTTP
  // endpoint resolve to "/api/mcp". SSE is off (stateless, no Redis needed).
  { basePath: "/api", disableSse: true },
);

// Bearer-token auth. The token resolves to a user id, stashed in authInfo.extra
// for the tools. required:true rejects unauthenticated calls with a 401.
const verifyToken = async (
  _req: Request,
  bearer?: string,
): Promise<AuthInfo | undefined> => {
  const userId = await resolveToken(bearer);
  if (!userId) return undefined;
  return { token: bearer as string, clientId: userId, scopes: [], extra: { userId } };
};

const authed = withMcpAuth(handler, verifyToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
