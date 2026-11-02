import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {authenticate,loadState,persist} from '@/lib/studio/store';
import {StudioError,filteredState,requirePermission} from '@/lib/studio/permissions';
import {verificationPreflight,startVerificationPack,VERIFICATION_QUERY} from '@/lib/studio/verification-pack';
import {retrievePublicReferences} from '@/lib/studio/public-retrieval';
import {failure} from '@/lib/studio/http';
export const maxDuration=60;
export async function POST(req:NextRequest){try{
 if(Number(req.headers.get('content-length')||0)>2000)throw new StudioError(413,'Request too large.');
 const {db,actor}=await authenticate(req),state=await loadState(db,actor),input=z.object({idempotencyKey:z.string().uuid(),expectedVersion:z.number().int().nonnegative()}).strict().parse(await req.json());
 requirePermission(state,actor,'settings.manage');
 if(state.verificationRuns?.some(r=>r.createdBy===actor.email&&r.idempotencyKey===input.idempotencyKey))return NextResponse.json({state:filteredState(state,actor),actor,mode:'live'});
 if(state.version!==input.expectedVersion)throw new StudioError(409,'Workspace changed. Refresh before preparing samples.');
 if(process.env.STUDIO_ALLOW_PROVIDER_EXECUTION!=='true')throw new StudioError(503,'Paid provider execution is disabled on this deployment. No sample or search call was started.');
 verificationPreflight(state,actor);
 const refs=await retrievePublicReferences(VERIFICATION_QUERY);
 const next=startVerificationPack(state,actor,input.idempotencyKey,refs);await persist(db,state,next);
 return NextResponse.json({state:filteredState(next,actor),actor,mode:'live'},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
