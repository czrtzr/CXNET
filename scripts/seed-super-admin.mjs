// Seed the un-deletable super admin.
//
// Run after migrations are applied:
//   node --env-file=.env.local scripts/seed-super-admin.mjs
//
// It is idempotent: safe to run more than once. It will
//   1. add the super admin email to the allowlist,
//   2. create the auth user if it does not exist,
//   3. promote that profile to the super_admin role.
//
// The password is taken from SUPER_ADMIN_PASSWORD if set, otherwise a strong
// random one is generated and printed once. The service role key is required
// and must never leave your machine or a trusted server.

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Did you run with: node --env-file=.env.local scripts/seed-super-admin.mjs ?",
  );
  process.exit(1);
}
if (!email) {
  console.error("Missing SUPER_ADMIN_EMAIL.");
  process.exit(1);
}

const generatedPassword = randomBytes(18).toString("base64url");
const password = process.env.SUPER_ADMIN_PASSWORD || generatedPassword;

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Allowlist the email so the DB trigger permits the account to exist.
{
  const { error } = await admin
    .from("allowlist")
    .upsert({ email }, { onConflict: "email" });
  if (error) {
    console.error("Failed to allowlist super admin:", error.message);
    process.exit(1);
  }
  console.log(`Allowlisted ${email}`);
}

// 2. Create the auth user if absent. createUser fails if the email exists, so
// treat that as already seeded.
let userId;
{
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) {
      console.log("Super admin auth user already exists.");
    } else {
      console.error("Failed to create super admin user:", error.message);
      process.exit(1);
    }
  } else {
    userId = data.user.id;
    console.log("Created super admin auth user.");
    if (!process.env.SUPER_ADMIN_PASSWORD) {
      console.log(
        `\n  Temporary password (shown once, store it now):\n  ${password}\n`,
      );
    }
  }
}

// Resolve the user id if we did not just create the user.
if (!userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !data) {
    console.error("Could not locate the super admin profile to promote.");
    process.exit(1);
  }
  userId = data.id;
}

// 3. Promote to super_admin. The service role runs with auth.uid() null, which
// the guard_profile_changes trigger treats as a trusted context.
{
  const { error } = await admin
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", userId);
  if (error) {
    console.error("Failed to promote super admin:", error.message);
    process.exit(1);
  }
  console.log("Promoted to super_admin. Seed complete.");
}
