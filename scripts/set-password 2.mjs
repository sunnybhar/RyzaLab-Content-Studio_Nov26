// Administrator-only local maintenance. Never deploy this script as an API route.
import {createClient} from '@supabase/supabase-js';
import readline from 'node:readline';
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!email.includes('@')){console.error('Usage: npm run account:password -- member@example.com');process.exit(1)}
if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY){console.error('Set your Supabase URL and service role key in .env.local.');process.exit(1)}
if(!process.stdin.isTTY){console.error('Run this command in an interactive terminal.');process.exit(1)}
async function hidden(prompt){
 process.stdout.write(prompt);readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let value='';function keypress(text,key){if(key?.ctrl&&key.name==='c'){finish();reject(new Error('Cancelled.'));return}if(key?.name==='return'){finish();resolve(value);return}if(key?.name==='backspace'){value=value.slice(0,-1);return}if(text&&!key?.ctrl&&!key?.meta&&!text.includes('\u001b'))value+=text}function finish(){process.stdin.removeListener('keypress',keypress);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n')}process.stdin.on('keypress',keypress)})
}
try{
 const password=await hidden('New password (hidden, 12–128 characters): ');
 if(password.length<12||password.length>128)throw new Error('Password must contain 12–128 characters.');
 const confirmation=await hidden('Confirm password (hidden): ');if(confirmation!==password)throw new Error('Passwords do not match.');
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 let found;for(let page=1;;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw new Error('Could not read accounts. Check your Supabase settings.');found=data.users.find(u=>u.email?.toLowerCase()===email);if(found||data.users.length<1000)break}
 const {error}=found?await db.auth.admin.updateUserById(found.id,{password,email_confirm:true}):await db.auth.admin.createUser({email,password,email_confirm:true});
 if(error)throw new Error('Could not set the password. Check your Supabase password policy and account settings.');
 console.log('Account password saved. No email was sent. Membership is unchanged.');
 console.log('For a first administrator, add this email to public.members with role admin using the README instructions.');
}catch(error){console.error(error.message);process.exitCode=1}
