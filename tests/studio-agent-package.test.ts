import {test} from 'node:test';import assert from 'node:assert/strict';import JSZip from 'jszip';
import {readAgentPackage} from '../lib/studio/agent-package';import {contextExcerpt} from '../lib/studio/context-excerpts';
import {initialState,DEMO_ACTOR} from '../lib/studio/seed';import {applyCommand} from '../lib/studio/engine';
import {channelWritingContract} from '../lib/studio/channel-writing';
async function archive(files:Record<string,string>){const zip=new JSZip();for(const [name,text] of Object.entries(files))zip.file(name,text);return zip.generateAsync({type:'arraybuffer'});}
const file=(name:string,text:string)=>({fileName:name,base64:Buffer.from(text).toString('base64'),byteSize:Buffer.byteLength(text)});
test('channel ZIP previews separate Instructions and knowledge; nested archives and scripts stay ignored',async()=>{
 const data=await archive({'Channel/INSTRUCTIONS.md':'Write clearly.','Channel/knowledge/company.md':'Verified company context.','Channel/scripts/tool.py':'raise RuntimeError()','Channel/skill/nested.zip':'not executed'});
 const parsed=await readAgentPackage(data);assert.equal(parsed.instructions,'Write clearly.');assert.match(parsed.context,/Verified company/);assert.equal(parsed.ignored.length,2);
 const skill=await readAgentPackage(await archive({'guard/SKILL.md':'Check every claim.','guard/references/facts.md':'Company facts.','guard/scripts/check.py':'never executed'}),'skill');assert.match(skill.instructions,/Check every claim/);assert.match(skill.context,/Company facts/);assert.equal(skill.ignored.length,1);
 await assert.rejects(()=>readAgentPackage(new ArrayBuffer(1048577)),/1 MB/);
  await assert.rejects(async()=>readAgentPackage(await archive({'INSTRUCTIONS.md':'x','knowledge/context.md':'x'.repeat(262145)})),/256 KB/);
});
test('package edits save atomically and stale edits cannot replace either saved section',()=>{
 const state=initialState(DEMO_ACTOR,true);const command={type:'agentRules.importPackage',channel:'LinkedIn',instructions:file('instructions.md','Original instructions'),context:file('context.md','Original context')};
 const next=applyCommand(state,DEMO_ACTOR,command,{demo:true});assert.equal(next.agentRuleFiles!.length,2);assert.equal(next.agentRuleFiles![0].extractedText,'Original instructions');assert.equal(state.agentRuleFiles,undefined);
 assert.throws(()=>applyCommand(next,DEMO_ACTOR,command,{demo:true}),/changed/);assert.deepEqual(next.agentRuleFiles!.map(f=>f.extractedText),['Original instructions','Original context']);
});
test('large context selects bounded labelled excerpts while newsletter and social requirements differ',()=>{
 const text=Array.from({length:25},(_,i)=>`# Source file: knowledge/file${i}.md\n## ${i===24?'elder care evidence':'General guidance'}\n`+'Relevant background and careful explanation. '.repeat(150)).join('\n');const selected=contextExcerpt(text,'elder care');assert.ok(selected.text.length<=12000);assert.match(selected.text,/elder care evidence/);assert.match(selected.selection,/Omitted/);
 assert.match(channelWritingContract('Newsletter'),/1,200–1,600/);assert.match(channelWritingContract('Newsletter'),/Sources section/);assert.match(channelWritingContract('LinkedIn'),/180–250/);assert.match(channelWritingContract('LinkedIn',JSON.stringify({format:'LinkedIn newsletter'})),/1,200–1,600/);assert.match(channelWritingContract('LinkedIn'),/Do not put a Sources/);
});

test('macOS ZIP metadata never becomes knowledge; the supplied START-HERE name is accepted',async()=>{
 for(const channel of ['LinkedIn','Newsletter']){
 const parsed=await readAgentPackage(await archive({[`${channel}/00-START-HERE-agent-instructions.md`]:'Use the real instructions.',[`${channel}/knowledge/company.md`]:'Actual company context.',[`__MACOSX/${channel}/knowledge/._company.md`]:'\0\0AppleDouble binary metadata',[`${channel}/knowledge/._extra.md`]:'\0binary',[`${channel}/.DS_Store`]:'\0binary'}));
 assert.equal(parsed.files.length,1);assert.doesNotMatch(parsed.context,/MACOSX|AppleDouble|\u0000/);assert.ok(parsed.ignored.includes('macOS metadata (3 files)'));assert.equal(parsed.instructions,'Use the real instructions.');
 }
});
test('binary Markdown is rejected before saving, including requests from an older preview',async()=>{
 await assert.rejects(async()=>readAgentPackage(await archive({'INSTRUCTIONS.md':'Valid instructions','knowledge/binary.md':'\0binary'})),/binary control/);
 const s=initialState(DEMO_ACTOR,true);assert.throws(()=>applyCommand(s,DEMO_ACTOR,{type:'agentRules.importPackage',channel:'Newsletter',instructions:file('instructions.md','Original instructions'),context:file('context.md','\0AppleDouble metadata')},{demo:true}),/binary or macOS metadata/);assert.equal(s.agentRuleFiles,undefined);
});
