import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
export class ApiError extends Error { constructor(public status: number,message: string){super(message)} }
export async function requireMember(req: NextRequest, admin = false) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new ApiError(503,'Authentication is not configured. Set up Supabase first.');
 const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');
 if(!token)throw new ApiError(401,'Please sign in.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.getUser(token);
 if(error||!data.user)throw new ApiError(401,'Your session expired. Sign in again.');
 const {data:member}=await db.from('members').select('*').eq('email',data.user.email!.toLowerCase()).is('revoked_at',null).single();
 if(!member)throw new ApiError(403,'This workspace is invite-only. Ask an administrator for access.');
 if(admin&&member.role!=='admin')throw new ApiError(403,'Administrator access is required.');
 return {db,user:data.user,member};
}
export function apiError(error: unknown){console.error(error instanceof ApiError?error.message:'API operation failed');return NextResponse.json({error:error instanceof ApiError?error.message:'The provider request failed. Please retry or check your server configuration.'},{status:error instanceof ApiError?error.status:502})}
export async function consumeQuota(db: Awaited<ReturnType<typeof requireMember>>['db'], userId: string, kind: string, limit: number){
 const {data,error}=await db.rpc('consume_quota',{p_user_id:userId,p_kind:kind,p_limit:limit});
 if(error)throw new ApiError(503,'Usage limits are not configured. Apply the database schema.');
 if(!data)throw new ApiError(429,'Hourly generation limit reached. Please try again later.');
}
