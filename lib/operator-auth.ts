import { timingSafeEqual } from "node:crypto";

export function operatorAuthConfigured() {
  return Boolean(process.env.OPERATOR_TOKEN?.trim());
}

function matches(candidate: string, expected: string) {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function requireOperator(request: Request) {
  const expected = process.env.OPERATOR_TOKEN?.trim();
  if (!expected) {
    return Response.json(
      { error: "operator_auth_not_configured", message: "Set OPERATOR_TOKEN before enabling state changes." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const candidate = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!candidate || !matches(candidate, expected)) {
    return Response.json(
      { error: "operator_auth_required", message: "A valid operator bearer token is required." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  return null;
}
