import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticate,loadState,decrypt,persist} from '@/lib/studio/store';
import {requirePermission,StudioError,filteredState} from '@/lib/studio/permissions';
import {inspectClaudeModelBounds} from '@/lib/studio/model-discovery';
import {saveBoundedWorkflowSetup} from '@/lib/studio/bounded-workflow-setup';
import {failure} from '@/lib/studio/http';
const schema=z.object({connectionId:z.string().min(1).max(150),expectedVersion:z.number().int().nonnegative()}).strict();
export async function POST(req:NextRequest){try{
 if(Number(req.headers.get('content-length')||0)>5000)throw new StudioError(413,'Setup request too large.');
 const {db,actor}=await authenticate(req),state=await loadState(db,actor),input=schema.parse(await req.json());
 requirePermission(state,actor,'settings.manage');
 for(const fn of ['text','ideas','review'] as const)requirePermission(state,actor,'connections.manage',{function:fn});
 const c=state.connections.find(c=>c.id===input.connectionId);
 if(!c||c.provider!=='anthropic'||c.function!=='text'||!c.hasKey||c.status==='disconnected'||state.version!==input.expectedVersion)throw new StudioError(409,'Select a current stored Claude writing connection.');
 const {data}=await db.from('studio_secrets').select('ciphertext').eq('id',c.id).single();
 if(!data)throw new StudioError(503,'Stored writing credential unavailable.');
 const capability=await inspectClaudeModelBounds(c.model,decrypt(data.ciphertext));
 const next=saveBoundedWorkflowSetup(state,actor,input,capability,new Date().toISOString());await persist(db,state,next);
 return NextResponse.json({state:filteredState(next,actor),actor,mode:'live'},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
