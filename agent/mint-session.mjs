// Non-destructive: mint @supabase/ssr session cookies for a test admin login.
// Uses the SAME @supabase/ssr the app uses, so cookie format is version-matched.
// Usage: node --env-file=.env.proposal mint-session.mjs <email>
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "../proposal-maker/node_modules/@supabase/ssr/dist/main/index.js";

const email = process.argv[2] || "sm@sunmyung.kr";
const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY; // optional

// 1) admin magic link
const admin = createClient(URL, SERVICE);
const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo: "http://localhost:3000/" },
});
if (error) { console.error("generateLink ERR", error.message); process.exit(1); }

// 2) follow verify -> capture hash tokens
const res = await fetch(data.properties.action_link, { redirect: "manual" });
const loc = res.headers.get("location");
if (!loc || !loc.includes("#")) { console.error("no hash in redirect:", loc); process.exit(1); }
const hash = new URLSearchParams(loc.split("#")[1]);
const access_token = hash.get("access_token");
const refresh_token = hash.get("refresh_token");
if (!access_token || !refresh_token) { console.error("missing tokens"); process.exit(1); }

// 3) mint cookies via the app's @supabase/ssr
const captured = [];
const anonKey = ANON || "anon"; // anon key not required to serialize cookies
const ssr = createServerClient(URL, anonKey, {
  cookies: {
    getAll: () => [],
    setAll: (cookies) => { for (const c of cookies) captured.push(c); },
  },
});
const { error: setErr } = await ssr.auth.setSession({ access_token, refresh_token });
if (setErr) { console.error("setSession ERR", setErr.message); process.exit(1); }

console.log(JSON.stringify(captured.map(c => ({ name: c.name, value: c.value })), null, 2));
