import { requireOperator } from "@/lib/operator-auth";
import { setStatus,type TicketStatus } from "@/lib/store";
export const runtime="nodejs";
const allowed=new Set<TicketStatus>(["inbox","assigned","resolved"]);
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const denied=requireOperator(request);if(denied)return denied;const{id}=await params;const body=await request.json().catch(()=>({})) as{status?:TicketStatus};if(!body.status||!allowed.has(body.status))return Response.json({error:"status must be inbox, assigned, or resolved"},{status:400});const saved=setStatus(id,body.status);return Response.json(saved??{error:"ticket not found"},{status:saved?200:404})}
