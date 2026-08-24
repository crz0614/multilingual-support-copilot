import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeGithubIssue } from "@/lib/inbox";
import { saveWebhookDelivery } from "@/lib/store";

export const runtime = "nodejs";
const supportedActions = new Set(["opened", "reopened", "edited", "labeled", "unlabeled", "closed"]);

function validSignature(body: string, signature: string, secret: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "webhook_not_configured" }, { status: 503 });

  const deliveryId = request.headers.get("x-github-delivery") || "";
  const event = request.headers.get("x-github-event") || "";
  const signature = request.headers.get("x-hub-signature-256") || "";
  const body = await request.text();
  if (!deliveryId || !signature || !validSignature(body, signature, secret)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }
  if (event === "ping") return Response.json({ accepted: true, event });
  if (event !== "issues") return Response.json({ accepted: false, ignored: true, event }, { status: 202 });

  const payload = JSON.parse(body) as { action?: string; repository?: { full_name?: string }; issue?: any };
  if (!payload.action || !supportedActions.has(payload.action) || !payload.repository?.full_name || !payload.issue) {
    return Response.json({ error: "unsupported_or_incomplete_issue_event" }, { status: 422 });
  }
  const ticket = normalizeGithubIssue(payload.repository.full_name, payload.issue);
  const result = saveWebhookDelivery({
    deliveryId,
    event,
    action: payload.action,
    ticket,
    active: payload.action !== "closed",
  });
  return Response.json({ accepted: true, duplicate: result.duplicate, ticketId: ticket.id, active: payload.action !== "closed" });
}
