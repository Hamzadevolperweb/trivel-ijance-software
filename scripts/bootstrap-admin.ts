import { createClient } from "@supabase/supabase-js";

const email = "h.nit.amza@gmail.com";
const fullName = "H. Nit Amza";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;

if (!url || !serviceRoleKey || !initialPassword) {
  throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and INITIAL_ADMIN_PASSWORD in .env.local.");
}
if (initialPassword.length < 12) {
  throw new Error("INITIAL_ADMIN_PASSWORD must contain at least 12 characters.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId: string | undefined;
for (let page = 1; !userId; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Unable to check for the initial administrator: ${error.message}`);
  userId = data.users.find((user) => user.email?.toLowerCase() === email)?.id;
  if (data.users.length < 1000) break;
}

if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: initialPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`Unable to create the initial administrator: ${error.message}`);
  userId = data.user?.id;
}
if (!userId) throw new Error("Supabase did not return an administrator user ID.");

const { data: profile, error } = await supabase.from("profiles").update({
  email,
  full_name: fullName,
  role: "SUPER_ADMIN",
  active: true,
}).eq("id", userId).select("id").maybeSingle();
if (error) throw new Error(`The Auth user exists, but the administrator profile could not be promoted: ${error.message}`);
if (!profile) throw new Error("The Auth user exists, but no staff profile was found. Apply the Supabase migration before bootstrapping.");

console.log(`Administrator account is ready for ${email}. No password was displayed.`);
