// supabase/functions/dispatch-notifications/index.ts
//
// Run on a Supabase Cron schedule (e.g. every 1-2 minutes). Drains
// `notifications` where status = 'pending', sends via the appropriate
// channel, and marks each row sent/failed. Kept separate from
// send-announcement / attendance triggers so those stay fast and this
// owns all retry/rate-limit logic in one place.
//
// Deploy:   supabase functions deploy dispatch-notifications --no-verify-jwt
// Schedule: supabase cron (Dashboard -> Edge Functions -> Cron) e.g. "*/2 * * * *"
//
// Requires env vars for whichever providers you actually use, e.g.:
//   FCM_SERVER_KEY, RESEND_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BATCH_SIZE = 200;

Deno.serve(async () => {
  const { data: pending, error } = await admin
    .from("notifications")
    .select("id, recipient_id, channel, title, body, payload")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return json({ error: error.message }, 500);
  if (!pending || pending.length === 0) return json({ status: "nothing to send" }, 200);

  let sent = 0, failed = 0;

  for (const n of pending) {
    try {
      if (n.channel === "push") {
        const { data: tokens } = await admin
          .from("device_tokens")
          .select("token")
          .eq("user_id", n.recipient_id);
        if (tokens && tokens.length > 0 && FCM_SERVER_KEY) {
          await Promise.all(tokens.map((t) => sendFcmPush(t.token, n.title ?? "", n.body ?? "")));
        }
      } else if (n.channel === "email" && RESEND_API_KEY) {
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", n.recipient_id)
          .maybeSingle();
        if (profile?.email) await sendEmail(profile.email, n.title ?? "", n.body ?? "");
      }
      // 'sms' channel deliberately omitted — plug in Twilio here if needed.

      await admin
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", n.id);
      sent++;
    } catch (_e) {
      await admin.from("notifications").update({ status: "failed" }).eq("id", n.id);
      failed++;
    }
  }

  return json({ sent, failed, batch: pending.length }, 200);
});

async function sendFcmPush(token: string, title: string, body: string) {
  await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${FCM_SERVER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: token, notification: { title, body } }),
  });
}

async function sendEmail(to: string, subject: string, body: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Smart Class <notifications@smartclass.example>",
      to,
      subject,
      text: body,
    }),
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
