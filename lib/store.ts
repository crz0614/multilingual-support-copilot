import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Ticket } from "./inbox";

const filename=process.env.DATABASE_FILE||(process.env.VERCEL?"/tmp/support-copilot.db":".data/support-copilot.db");
let connection:DatabaseSync|undefined;
function database(){if(connection)return connection;if(filename!==":memory:")mkdirSync(path.dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,repository TEXT NOT NULL,source_url TEXT NOT NULL,subject TEXT NOT NULL,payload_json TEXT NOT NULL,source_updated_at TEXT NOT NULL,synced_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ticket_state(ticket_id TEXT PRIMARY KEY,status TEXT NOT NULL CHECK(status IN ('inbox','assigned','resolved')),updated_at TEXT NOT NULL,FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS tickets_repository_updated ON tickets(repository,source_updated_at DESC);`);connection=db;return db}

export type TicketStatus="inbox"|"assigned"|"resolved";
export function storageInfo(){const db=database();const row=db.prepare("SELECT COUNT(*) AS count FROM tickets").get() as{count:number};return{engine:"sqlite",durable:!process.env.VERCEL&&filename!==":memory:",ticketCount:Number(row.count)}}
export function saveTickets(tickets:Ticket[]){const db=database(),now=new Date().toISOString();const upsert=db.prepare(`INSERT INTO tickets(id,repository,source_url,subject,payload_json,source_updated_at,synced_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET repository=excluded.repository,source_url=excluded.source_url,subject=excluded.subject,payload_json=excluded.payload_json,source_updated_at=excluded.source_updated_at,synced_at=excluded.synced_at`);db.exec("BEGIN");try{for(const ticket of tickets)upsert.run(ticket.id,ticket.repository,ticket.sourceUrl,ticket.subject,JSON.stringify(ticket),ticket.createdAt,now);db.exec("COMMIT")}catch(error){db.exec("ROLLBACK");throw error}}
export function statuses(ids:string[]){if(!ids.length)return{};const db=database(),placeholders=ids.map(()=>"?").join(",");const rows=db.prepare(`SELECT ticket_id,status FROM ticket_state WHERE ticket_id IN (${placeholders})`).all(...ids) as {ticket_id:string;status:TicketStatus}[];return Object.fromEntries(rows.map(row=>[row.ticket_id,row.status])) as Record<string,TicketStatus>}
export function setStatus(id:string,status:TicketStatus){const db=database(),exists=db.prepare("SELECT 1 FROM tickets WHERE id=?").get(id);if(!exists)return null;const now=new Date().toISOString();db.prepare(`INSERT INTO ticket_state(ticket_id,status,updated_at) VALUES(?,?,?) ON CONFLICT(ticket_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at`).run(id,status,now);return{ticketId:id,status,updatedAt:now}}
