import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Notifies an agent when a signed-in user submits the "Contact this agent"
// form on their public profile (agents/[slug]/page.tsx). Service-role insert
// is required — notifications' RLS ("notif_own", FOR ALL USING (user_id =
// auth.uid())) only lets a session insert a row for itself, and the
// inserting session here is the VISITOR, not the agent being notified. Same
// pattern as notify-admin-agent tonight. Fire-and-forget from the client —
// the inquiries row (the durable record) is already written before this is
// called, so a failure here only means the agent finds out via /agent/leads
// instead of the bell, not a lost lead.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agentUserId, name, email, phone } = body as {
    agentUserId?: string;
    name?: string;
    email?: string;
    phone?: string;
  };

  if (!agentUserId) {
    return NextResponse.json({ error: "agentUserId required" }, { status: 400 });
  }

  try {
    const supabase = adminClient();
    const contact = phone?.trim() || email?.trim() || "no contact info provided";
    const notificationBody = `${name?.trim() || "Someone"} wants to connect — ${contact}`;
    const { error } = await supabase.from("notifications").insert({
      user_id: agentUserId,
      title: "New contact request",
      body: notificationBody,
      type: "agent_contact",
      action_url: "/agent/leads",
    });
    if (error) {
      console.error("[notify-agent-contact] Failed to insert notification:", error);
      return NextResponse.json({ error: "Notification insert failed" }, { status: 500 });
    }

    // WhatsApp, alongside the in-app notification above — fire-and-forget,
    // never blocks this route's response. Requires its own lookup since this
    // route is only ever called with agentUserId, never the agent's phone.
    const { data: agentProfile } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .eq("id", agentUserId)
      .maybeSingle();
    if (agentProfile?.phone) {
      console.log(`[notify-agent-contact] Calling sendWhatsAppMessage for agent ${agentUserId}...`);
      void sendWhatsAppMessage(agentProfile.phone, agentProfile.full_name?.trim() || "there", notificationBody);
    } else {
      console.log(`[notify-agent-contact] Skipping — no phone on file for agent ${agentUserId}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notify-agent-contact] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
