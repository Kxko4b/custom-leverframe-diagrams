// Supabase Edge Function: discord-review-notify
//
// Receives the payload from a Supabase Database Webhook (fired on INSERT
// into the "reviews" table), reformats it into Discord's embed format,
// and forwards it to your Discord channel webhook.
//
// Required secrets (set with `supabase secrets set`):
//   DISCORD_WEBHOOK_URL  - the Discord channel webhook URL
//   WEBHOOK_SECRET        - a random string you also set as a custom header
//                            on the Supabase Database Webhook, so this
//                            function only accepts calls from Supabase.

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

Deno.serve(async (req) => {
    try {
        if (WEBHOOK_SECRET) {
            const provided = req.headers.get("x-webhook-secret");
            if (provided !== WEBHOOK_SECRET) {
                return new Response("Unauthorized", { status: 401 });
            }
        }

        if (!DISCORD_WEBHOOK_URL) {
            console.error("DISCORD_WEBHOOK_URL is not set");
            return new Response("Server not configured", { status: 500 });
        }

        const payload = await req.json();
        const record = payload.record;

        if (!record) {
            return new Response("No record in payload", { status: 400 });
        }

        const rating = Number(record.rating) || 0;
        const stars = "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));

        const discordBody = {
            embeds: [
                {
                    title: "New review submitted",
                    color: 0x306778,
                    fields: [
                        { name: "Name", value: record.name || "Unknown", inline: true },
                        { name: "Rating", value: stars || "—", inline: true },
                        { name: "Message", value: record.message || "(no message)" }
                    ],
                    timestamp: record.created_at || new Date().toISOString()
                }
            ]
        };

        const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discordBody)
        });

        if (!discordRes.ok) {
            const text = await discordRes.text();
            console.error("Discord webhook failed:", discordRes.status, text);
            return new Response("Discord webhook failed", { status: 502 });
        }

        return new Response("OK", { status: 200 });
    } catch (err) {
        console.error(err);
        return new Response("Internal error", { status: 500 });
    }
});
