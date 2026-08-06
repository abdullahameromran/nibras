// supabase/functions/billing-webhook/index.ts
//
// Receives Stripe webhook events and updates school_subscriptions.
// Must be server-side: verifying the webhook signature requires the
// signing secret, which the client must never see.
//
// Deploy: supabase functions deploy billing-webhook --no-verify-jwt
// Point your Stripe webhook endpoint at:
//   https://<project-ref>.functions.supabase.co/billing-webhook
//
// Env vars required: STRIPE_WEBHOOK_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return json({ error: `signature verification failed: ${err}` }, 400);
  }

  try {
    const { data: processedEvent } = await admin
      .from("billing_events")
      .select("id,processing_error")
      .eq("id", event.id)
      .maybeSingle();
    if (processedEvent && !processedEvent.processing_error) {
      return json({ received: true, duplicate: true }, 200);
    }

    let affectedSchoolId: string | null = null;
    let externalSubscriptionId: string | null = null;
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        externalSubscriptionId = sub.id;
        const { data, error } = await admin
          .from("school_subscriptions")
          .update({ status: mapStripeStatus(sub.status), updated_at: new Date().toISOString() })
          .eq("external_ref", sub.id)
          .select("school_id")
          .maybeSingle();
        if (error) throw error;
        affectedSchoolId = data?.school_id ?? null;
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        externalSubscriptionId = sub.id;
        const { data, error } = await admin
          .from("school_subscriptions")
          .update({ status: "canceled", ends_at: new Date().toISOString() })
          .eq("external_ref", sub.id)
          .select("school_id")
          .maybeSingle();
        if (error) throw error;
        affectedSchoolId = data?.school_id ?? null;
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          externalSubscriptionId = invoice.subscription as string;
          const { data, error } = await admin
            .from("school_subscriptions")
            .update({ status: "past_due" })
            .eq("external_ref", invoice.subscription as string)
            .select("school_id")
            .maybeSingle();
          if (error) throw error;
          affectedSchoolId = data?.school_id ?? null;
        }
        break;
      }
      default:
        // ignore other event types
        break;
    }
    const { error: eventError } = await admin.from("billing_events").upsert({
      id: event.id,
      event_type: event.type,
      external_subscription_id: externalSubscriptionId,
      school_id: affectedSchoolId,
      payload: event.data.object,
      processed_at: new Date().toISOString(),
      processing_error: null,
    });
    if (eventError) throw eventError;
    const { error: auditError } = await admin.from("audit_logs").insert({
      school_id: affectedSchoolId,
      actor_id: null,
      action: "billing_webhook",
      entity_type: "school_subscriptions",
      metadata: { stripe_event_id: event.id, event_type: event.type, external_subscription_id: externalSubscriptionId },
    });
    if (auditError) throw auditError;
    return json({ received: true }, 200);
  } catch (e) {
    await admin.from("billing_events").upsert({
      id: event.id,
      event_type: event.type,
      payload: event.data.object,
      processed_at: new Date().toISOString(),
      processing_error: String(e),
    });
    return json({ error: String(e) }, 500);
  }
});

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default: return "active";
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
