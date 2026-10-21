import fs from 'node:fs/promises';
import path from 'node:path';
import type { Channel } from './types';
const playbooks:Record<Channel,string>={YouTube:'youtube',LinkedIn:'linkedin',Instagram:'instagram-tiktok',TikTok:'instagram-tiktok',Facebook:'facebook',Hub:'hub',Reddit:'reddit'};
export async function getKnowledge(channel:Channel){
 const files=['ryzalab-brand-brain.md','artifacts.md','platform-specs.md','visual-identity.md','campaign-calendar.md',`playbook-${playbooks[channel]}.md`];
 return (await Promise.all(files.map(async name=>`\nREFERENCE: ${name}\n${await fs.readFile(path.join(process.cwd(),'knowledge',name),'utf8')}`))).join('\n');
}
