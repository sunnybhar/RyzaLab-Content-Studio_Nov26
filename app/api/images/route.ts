import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {ApiError,apiError,consumeQuota,requireMember} from '@/lib/server';
export const maxDuration=180;
export async function POST(req:NextRequest){try{
 const {db,user}=await requireMember(req);
 const parsed=z.object({prompt:z.string().min(12).max(3000)}).safeParse(await req.json());if(!parsed.success)throw new ApiError(400,'Describe your image in 12–3,000 characters.');
 if(!process.env.IMAGE_API_KEY)throw new ApiError(503,'Add IMAGE_API_KEY to the server environment to generate images.');
 await consumeQuota(db,user.id,'image',8);
 const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.IMAGE_API_KEY}`},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',n:1,size:'1024x1024',quality:'medium',prompt:`Create an editorial concept image for RyzaLab. Warm natural light, calm residential interiors, paper and deep teal accents. No people, children, addresses, logos, personal data, or medical/safety claims. This is a synthetic concept, not a real RyzaLab installation. User direction: ${parsed.data.prompt}`}),signal:AbortSignal.timeout(165000)});
 if(!response.ok)throw new ApiError(response.status===429?429:502,'Image generation failed. Check provider access, billing, or try again shortly.');
 const result=await response.json();if(!result.data?.[0]?.b64_json)throw new ApiError(502,'The provider returned no image.');
 return NextResponse.json({image:`data:image/png;base64,${result.data[0].b64_json}`,disclosure:'AI-generated concept image. Not a real RyzaLab installation.'});
 }catch(e){return apiError(e)}}
