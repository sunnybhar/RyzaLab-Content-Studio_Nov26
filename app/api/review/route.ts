import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {apiError,ApiError,requireMember} from '@/lib/server';
import {review} from '@/lib/brand';
export async function POST(req:NextRequest){try{await requireMember(req);const p=z.object({text:z.string().max(60000),audience:z.enum(['general','family','elder','renter','diy','trade'])}).safeParse(await req.json());if(!p.success)throw new ApiError(400,'Invalid review request.');return NextResponse.json(review(p.data.text,p.data.audience));}catch(e){return apiError(e)}}
