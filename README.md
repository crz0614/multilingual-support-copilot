# Multilingual Support Copilot · Public Issue Triage

[![CI](https://github.com/crz0614/multilingual-support-copilot/actions/workflows/ci.yml/badge.svg)](https://github.com/crz0614/multilingual-support-copilot/actions/workflows/ci.yml)

**[Live demo](https://multilingual-support-copilot.vercel.app)**

Privacy-safe public issue triage system built with Next.js and TypeScript.

It demonstrates transparent source ingestion, deterministic intent routing and honest provider boundaries for a multilingual support workflow.

The deployment reads current public issues from the official GitHub API and preserves an original-source link for every record. It does not pretend to be connected to Gmail or an LLM: translation and reply generation remain explicitly unavailable until real providers are configured.

## Run

```bash
npm ci
npm run dev
```

## API

- `GET /api/inbox` returns normalized live public GitHub issues plus per-source health.
- `POST /api/draft` returns `503 llm_not_configured`; it never fabricates a reply.

## 中文

这是一个真实公开 Issue 分流系统。数据来自 GitHub 官方 API，每条记录保留原始链接。公开版没有 Gmail 和 LLM 授权，因此会明确显示未连接，不会虚构邮件、中文翻译、知识库引用或回复结果。

## Quality checks

```bash
npm test
npm run lint
npm run build
docker build -t multilingual-support-copilot .
```
