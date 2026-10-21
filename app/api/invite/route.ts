import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {ApiError,apiError,requireMember} from '@/lib/server';
export async function POST(req:NextRequest){try{
 const {db,user}=await requireMember(req,true);
 const parsed=z.object({email:z.email().max(254),action:z.enum(['invite','revoke']),password:z.string().min(12).max(128).optional()}).safeParse(await req.json());if(!parsed.success)throw new ApiError(400,'Enter a valid email address.');
 const email=parsed.data.email.toLowerCase();
 if(parsed.data.action==='revoke'){
 if(email===user.email?.toLowerCase())throw new ApiError(400,'You cannot revoke your own access.');
 const {data:target}=await db.from('members').select('role').eq('email',email).single();
 if(target?.role==='admin')throw new ApiError(400,'Manage administrator access in the database.');
 const {error}=await db.from('members').update({revoked_at:new Date().toISOString()}).eq('email',email);if(error)throw error;
 return NextResponse.json({message:'Member access removed.'});
 }
 if(!parsed.data.password)throw new ApiError(400,'Supply an initial password of 12–128 characters.');
 const {data:existing}=await db.from('members').select('email').eq('email',email).single();
 if(existing)throw new ApiError(409,'This email already has a membership record. Restore revoked access in Supabase.');
 const {error:insertError}=await db.from('members').insert({email,role:'member',invited_by:user.id});if(insertError)throw insertError;
 const {error}=await db.auth.admin.createUser({email,password:parsed.data.password,email_confirm:true});
 if(error){await db.from('members').delete().eq('email',email);throw new ApiError(502,'The account could not be created. It may already exist in Supabase; use the account password helper to set its password and add its membership in the SQL editor.');}
 return NextResponse.json({message:'Account created. Share the initial password privately. The member can change it on the Members page.'});
 }catch(e){return apiError(e)}}
