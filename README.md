# Multilingual Support Copilot · Public Issue Triage

[![CI](https://github.com/crz0614/multilingual-support-copilot/actions/workflows/ci.yml/badge.svg)](https://github.com/crz0614/multilingual-support-copilot/actions/workflows/ci.yml)

**[Live demo](https://multilingual-support-copilot.vercel.app)**

Privacy-safe public issue triage system built with Next.js and TypeScript.

It provides transparent source ingestion, deterministic intent routing, durable triage state for self-hosted deployments, and honest provider boundaries for a multilingual support workflow.

The deployment reads current public issues from the official GitHub API and preserves an original-source link for every record. It does not pretend to be connected to Gmail or an LLM: translation and reply generation remain explicitly unavailable until real providers are configured.

## Run

```bash
npm ci
npm run dev
```

## API

- `GET /api/inbox` returns normalized live public GitHub issues plus per-source health.
- `GET`, `POST`, and `DELETE /api/repositories` list, verify, add, or remove persisted public GitHub sources. New repositories are checked against GitHub before storage; at most 20 are monitored.
- `PUT /api/tickets/:id/status` persists `inbox`, `assigned`, or `resolved` state on the server.
- `POST /api/webhooks/github` accepts signed GitHub `issues` events, deduplicates deliveries, updates snapshots, and marks closed issues inactive.
- `GET /api/health` verifies SQLite and reports whether the current deployment has durable storage.
- `POST /api/draft` returns `503 llm_not_configured`; it never fabricates a reply.

For a persistent single-operator deployment, set a strong `GITHUB_WEBHOOK_SECRET` and run `docker compose up --build`. Use `/api/repositories` to replace the seeded public sources with repositories you actually support. Configure each repository webhook URL as `https://your-host/api/webhooks/github`, use the same secret, select `application/json`, and subscribe to Issues events. The endpoint verifies GitHub's `X-Hub-Signature-256`, rejects unsigned payloads and stores each `X-GitHub-Delivery` only once. The named volume preserves repository configuration, issue snapshots, webhook receipts and workflow state across container restarts, and `/api/health` is used by Compose monitoring. Put the service behind your own authentication proxy before exposing write APIs publicly. The Vercel URL remains a read-only-style preview with ephemeral `/tmp` storage; it is not advertised as durable.

## 中文

这是一个真实公开 Issue 分流系统。数据来自 GitHub 官方 API，每条记录保留原始链接。`/api/repositories` 可管理最多 20 个真实公开仓库，新增来源会先通过 GitHub API 核验，再持久化到 SQLite。配置 `GITHUB_WEBHOOK_SECRET` 后，GitHub Issues Webhook 会经过 HMAC-SHA256 签名校验、按 delivery ID 去重并实时更新快照；关闭的 Issue 会标记为 inactive。使用 `docker compose up --build` 自托管时，仓库配置、Issue 快照、Webhook 收据以及“待处理／已分配／已解决”状态都会保存在服务器数据卷中，容器重启后仍然存在。Vercel 公开地址仅为临时存储预览，不宣称持久化。公开版没有 Gmail 和 LLM 授权，因此会明确显示未连接，不会虚构邮件、中文翻译、知识库引用或回复结果。

## Quality checks

```bash
npm test
npm run lint
npm run build
docker build -t multilingual-support-copilot .
```
