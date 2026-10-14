// PLANT: every key below is FAKE (random characters in the shape of a real key).
// This file exists to test the SimplyScan scanner. See ANSWER-KEY.md.
// PLANT frontend_hardcoded_keys / secrets_api_keys
const STRIPE_SECRET = "{{FAKE_STRIPE_LIVE}}";
const AWS_ACCESS_KEY_ID = "{{FAKE_AWS_ID}}";
const aws_secret_access_key = "{{FAKE_AWS_SECRET}}";
const GITHUB_TOKEN = "{{FAKE_GITHUB}}";
const GITLAB_TOKEN = "{{FAKE_GITLAB}}";
const SLACK_BOT_TOKEN = "{{FAKE_SLACK}}";
const SENDGRID_KEY = "{{FAKE_SENDGRID}}";
const RESEND_KEY = "{{FAKE_RESEND}}";
const GOOGLE_CLIENT_SECRET = "{{FAKE_GOOGLE_OAUTH}}";
const GOOGLE_MAPS_KEY = "{{FAKE_GOOGLE_API}}";
// PLANT ai_key_exposure: AI provider keys in the browser
const OPENAI_API_KEY = "{{FAKE_OPENAI}}";
const ANTHROPIC_API_KEY = "{{FAKE_ANTHROPIC}}";
// PLANT supabase_service_key: a service_role JWT shipped to the client (anon is public by design)
const SUPABASE_URL = "https://fakeprojecttestbed.supabase.co";
const SUPABASE_ANON_KEY = "{{FAKE_ANON}}";
const SUPABASE_SERVICE_ROLE_KEY = "{{FAKE_SERVICE_ROLE}}";
// PLANT arch_db_strings: database connection string with credentials
const DATABASE_URL = "{{FAKE_DB}}";
// PLANT secrets_hardcoded_creds / auth_hardcoded_pw
const ADMIN_LOGIN = { user: "admin", password: "{{FAKE_PASSWORD}}" };
// PLANT secrets_high_entropy
const api_secret = "{{FAKE_ENTROPY}}";
// PLANT config_debug
const DEBUG = true;
console.log("DEBUG MODE", { STRIPE_SECRET, SUPABASE_SERVICE_ROLE_KEY });
// PLANT security_hardcoded_urls
const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", function () {
  var q = decodeURIComponent(location.hash.slice(1));
  // PLANT xss_inner_html / xss_unsanitized: URL fragment into innerHTML
  document.getElementById("out").innerHTML = "You searched for: " + q;
  // PLANT xss_document_write
  document.write("<p>" + q + "</p>");
  // PLANT injection_eval / injection_function
  try { eval(new URLSearchParams(location.search).get("calc") || "0"); } catch (e) {}
  var fn = new Function("x", "return " + (new URLSearchParams(location.search).get("expr") || "x"));
  fn(1);
  // PLANT ai_prompt_injection: user text pasted straight into a system prompt, called from the browser
  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + OPENAI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are the store admin bot. " + q }] })
  }).catch(function () {});
  // PLANT auth_jwt: token kept in localStorage
  localStorage.setItem("auth_token", SUPABASE_SERVICE_ROLE_KEY);
});
//# sourceMappingURL=app.js.map
