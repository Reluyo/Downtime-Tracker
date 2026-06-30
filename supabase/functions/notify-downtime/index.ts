import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Invoked on a schedule (see migration 013_notify_cron.sql). For every line
// with notify_enabled = true, finds open downtime events that have exceeded
// notify_threshold_minutes and emails the configured recipients (global +
// per-line), then logs the send so the same event isn't re-notified until
// alert_repeat_minutes has passed.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("NOTIFY_FROM_EMAIL") ?? "downtime-alerts@resend.dev";

interface OpenEventRow {
  id: string;
  line_id: string;
  equipment_id: string;
  equipment_name: string;
  started_at: string;
  line_name: string;
}

async function sendEmail(to: string[], subject: string, html: string): Promise<void> {
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured; skipping email send");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

Deno.serve(async (req: Request) => {
  // Only the pg_cron job (or another trusted caller holding the service
  // role key) should invoke this. Reject anything else.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: globalEmails, error: globalErr } = await client
      .from("global_notification_emails")
      .select("email");
    if (globalErr) throw globalErr;
    const globalRecipients = (globalEmails ?? []).map((r: { email: string }) => r.email);

    const { data: configs, error: cfgErr } = await client
      .from("app_config")
      .select("line_id, notify_enabled, notify_threshold_minutes, notify_emails, alert_repeat_minutes, lines ( name )")
      .eq("notify_enabled", true);
    if (cfgErr) throw cfgErr;

    let notifiedCount = 0;

    for (const cfg of configs ?? []) {
      const lineId = cfg.line_id as string;
      const thresholdMs = (cfg.notify_threshold_minutes as number) * 60_000;
      const repeatMs = (cfg.alert_repeat_minutes as number) * 60_000;
      const lineEmails = (cfg.notify_emails as string[]) ?? [];
      const lineObj = cfg.lines as { name: string } | { name: string }[] | null;
      const lineName = (Array.isArray(lineObj) ? lineObj[0]?.name : lineObj?.name) ?? "Line";

      const recipients = Array.from(new Set([...globalRecipients, ...lineEmails])).filter(Boolean);
      if (recipients.length === 0) continue;

      const { data: openEvents, error: openErr } = await client.rpc("open_events", { p_line_id: lineId });
      if (openErr) throw openErr;

      const now = Date.now();
      for (const ev of (openEvents ?? []) as OpenEventRow[]) {
        const startedMs = new Date(ev.started_at).getTime();
        if (now - startedMs < thresholdMs) continue;

        const { data: lastLog } = await client
          .from("notification_log")
          .select("notified_at")
          .eq("event_id", ev.id)
          .order("notified_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastLog && now - new Date(lastLog.notified_at).getTime() < repeatMs) continue;

        const minutesDown = Math.floor((now - startedMs) / 60_000);
        await sendEmail(
          recipients,
          `[Downtime Alert] ${lineName} — ${ev.equipment_name} down ${minutesDown} min`,
          `<p><strong>${lineName} / ${ev.equipment_name}</strong> has been down for <strong>${minutesDown} minutes</strong> ` +
            `(started ${new Date(ev.started_at).toLocaleString()}).</p>`,
        );

        await client.from("notification_log").insert({
          event_id: ev.id,
          line_id: lineId,
          recipients,
        });
        notifiedCount += 1;
      }
    }

    return new Response(JSON.stringify({ ok: true, notified: notifiedCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
