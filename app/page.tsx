"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Ticket } from "@/lib/inbox";

type Status = "inbox" | "assigned" | "resolved";
type Data = {
  tickets: Ticket[];
  statuses: Record<string, Status>;
  storage: { engine: string; durable: boolean; ticketCount: number };
  sources: { name: string; ok: boolean; count: number; error?: string }[];
  operatorAuthConfigured: boolean;
  gmail: { connected: boolean; reason: string };
  syncedAt: string;
};
type View = "Inbox" | "Assigned" | "Resolved" | "Knowledge" | "Analytics";

export default function Page() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("Inbox");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [operatorToken, setOperatorToken] = useState("");

  const load = async () => {
    setError("");
    try {
      const response = await fetch(`/api/inbox?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      setData(result);
      setSelected((current) => current || result.tickets[0] || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "fetch failed");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  const status = (id: string) => data?.statuses[id] || "inbox";
  const visible = useMemo(() => {
    let rows = data?.tickets || [];
    if (view === "Assigned") rows = rows.filter((ticket) => (data?.statuses[ticket.id] || "inbox") === "assigned");
    if (view === "Resolved") rows = rows.filter((ticket) => data?.statuses[ticket.id] === "resolved");
    const normalizedQuery = query.toLowerCase();
    return rows.filter((ticket) => !normalizedQuery || `${ticket.subject} ${ticket.repository} ${ticket.author}`.toLowerCase().includes(normalizedQuery));
  }, [data, view, query]);

  const canWrite = Boolean(data?.operatorAuthConfigured && operatorToken);
  const setTicketStatus = async (id: string, next: Status) => {
    const response = await fetch(`/api/tickets/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${operatorToken}` },
      body: JSON.stringify({ status: next }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(result.message || `Status update failed: HTTP ${response.status}`);
      return;
    }
    setData((current) => current ? { ...current, statuses: { ...current.statuses, [id]: next } } : current);
    setNotice(`Status saved as ${next}.`);
  };

  const assigned = Object.values(data?.statuses || {}).filter((value) => value === "assigned").length;
  const resolved = Object.values(data?.statuses || {}).filter((value) => value === "resolved").length;

  return <main>
    <aside>
      <div className="logo">R<span>✦</span></div>
      <nav>{(["Inbox", "Assigned", "Resolved", "Knowledge", "Analytics"] as View[]).map((item, index) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{["▣", "◫", "✓", "⌁", "⌘"][index]} {item}{item === "Inbox" && <b>{data?.tickets.length || 0}</b>}</button>)}</nav>
      <footer><i>DB</i><div><b>Persisted issue triage</b><small>Server-side SQLite</small></div></footer>
    </aside>
    <section className="app">
      <header><div><small>REAL PUBLIC DATA</small><h1>{view}</h1><p>{data?.gmail.reason || "Loading source status…"}</p></div><div className="header-actions"><Link href="/sources">Manage sources</Link><button onClick={() => void load()}>↻ Sync public issues</button></div></header>
      {data?.operatorAuthConfigured ? <label className="operator-auth">Operator token<input type="password" value={operatorToken} onChange={(event) => setOperatorToken(event.target.value)} autoComplete="off" placeholder="Required for workflow changes" /></label> : <p className="operator-readonly">Public preview is read-only. Configure <code>OPERATOR_TOKEN</code> when self-hosting to enable workflow changes.</p>}
      <div className="stats"><article><b>{data?.tickets.length ?? "—"}</b><span>Live issues</span></article><article><b className="red">{data?.sources.filter((source) => !source.ok).length ?? "—"}</b><span>Failed/empty sources</span></article><article><b>{assigned}</b><span>Persisted assigned</span></article><article><b className="green">{resolved}</b><span>Persisted resolved</span></article></div>
      {view === "Knowledge" ? <Info title="Knowledge boundary" text="No private knowledge base or LLM is connected. Labels, author, repository and issue text come directly from GitHub. The app will not invent translations, customer identities or policy citations." /> : view === "Analytics" ? <Info title="Source analytics" text={(data?.sources || []).map((source) => `${source.name}: ${source.ok ? `${source.count} issues` : source.error || "empty"}`).join(" · ") || "Loading…"} /> : <div className="panes">
        <section className="messages"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search real issues…" />{error && <p className="translation">Source error: {error}</p>}{data && visible.length === 0 && <p className="translation">No real issues in this view. Nothing was fabricated.</p>}{visible.map((ticket) => <button key={ticket.id} className={selected?.id === ticket.id ? "selected" : ""} onClick={() => setSelected(ticket)}><span className="person">{ticket.author.slice(0, 2).toUpperCase()}</span><div><div><b>{ticket.author}</b><time>{new Date(ticket.createdAt).toLocaleDateString()}</time></div><h2>{ticket.subject}</h2><p>{ticket.message || "Issue body is empty."}</p><footer><span>{ticket.repository}</span><span>{ticket.intent}</span>{ticket.priority === "urgent" && <em>URGENT LABEL</em>}</footer></div></button>)}</section>
        <section className="conversation">{selected ? <><div className="conv-head"><div><small>PUBLIC GITHUB ISSUE</small><h2>{selected.subject}</h2><p>{selected.author} · {selected.repository} · {selected.comments} comments</p></div><span className="confidence">{selected.language}</span></div><article className="original"><label>ORIGINAL PUBLIC TEXT</label><p>{selected.message || "The author did not provide an issue body."}</p></article><article className="translation"><label>TRANSLATION STATUS</label><p>No translation provider is connected. The original text is shown unchanged instead of inventing a translation.</p></article><div className="draft-head"><div><span>✦</span><h3>Reply generation</h3></div><small>Unavailable without a configured LLM</small></div><div className="guard">No draft, citations or policy claims were fabricated.</div><div className="actions"><button disabled={!canWrite} className="secondary" onClick={() => void setTicketStatus(selected.id, status(selected.id) === "assigned" ? "inbox" : "assigned")}>{status(selected.id) === "assigned" ? "Unassign" : "Assign"}</button><button disabled={!canWrite} className="secondary" onClick={() => void setTicketStatus(selected.id, status(selected.id) === "resolved" ? "inbox" : "resolved")}>{status(selected.id) === "resolved" ? "Reopen" : "Mark resolved"}</button><button className="primary" onClick={() => setNotice("LLM is not connected; no reply was generated.")}>Try grounded draft</button></div>{notice && <p className="translation">{notice}</p>}<a className="primary source-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">Open original GitHub issue ↗</a></> : <p>Select a public issue.</p>}</section>
      </div>}
    </section>
  </main>;
}

function Info({ title, text }: { title: string; text: string }) {
  return <section className="conversation info"><h2>{title}</h2><p>{text}</p><a href="https://github.com/crz0614/multilingual-support-copilot" target="_blank" rel="noreferrer">Inspect source ↗</a></section>;
}
