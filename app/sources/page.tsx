"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "./sources.module.css";

export default function SourcesPage() {
  const [repos, setRepos] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [token, setToken] = useState("");
  const [authConfigured, setAuthConfigured] = useState(false);
  const [notice, setNotice] = useState("Loading…");

  const load = async () => {
    const response = await fetch("/api/repositories", { cache: "no-store" });
    if (!response.ok) {
      setNotice(`Load failed: HTTP ${response.status}`);
      return;
    }
    const result = await response.json();
    setRepos(result.repositories);
    setAuthConfigured(result.operatorAuthConfigured);
    setNotice("");
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  const change = async (method: "POST" | "DELETE", fullName: string) => {
    setNotice("");
    const response = await fetch("/api/repositories", {
      method,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ fullName }),
    });
    const result = await response.json();
    if (!response.ok) {
      setNotice(result.message || result.error || `HTTP ${response.status}`);
      return;
    }
    setInput("");
    await load();
    setNotice(method === "POST" ? `${fullName} verified and saved.` : `${fullName} removed.`);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (input.trim()) void change("POST", input.trim());
  };

  const writable = authConfigured && Boolean(token);
  return <main className={styles.page}><section><header><div><small>PERSISTED SOURCE CONFIGURATION</small><h1>Monitored GitHub repositories</h1><p>Only repositories verified through the GitHub API are saved. Changes immediately affect Inbox synchronization.</p></div><Link href="/">← Back to inbox</Link></header>{authConfigured?<label className={styles.token}>Operator token<input type="password" value={token} onChange={event=>setToken(event.target.value)} autoComplete="off" placeholder="Required for changes"/></label>:<p className={styles.readonly}>Read-only mode: configure <code>OPERATOR_TOKEN</code> on the server to enable changes.</p>}<form onSubmit={submit}><input value={input} onChange={event => setInput(event.target.value)} placeholder="owner/repository" aria-label="Repository full name"/><button type="submit" disabled={!writable}>Verify and add</button></form><div className={styles.list}>{repos.map(repo => <article key={repo}><div><b>{repo}</b><small>Verified public GitHub source</small></div><button disabled={!writable} onClick={() => void change("DELETE", repo)}>Remove</button></article>)}</div>{notice && <p className={styles.notice}>{notice}</p>}</section></main>;
}
