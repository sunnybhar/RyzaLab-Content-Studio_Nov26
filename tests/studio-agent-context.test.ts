import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialState,DEMO_ACTOR} from '../lib/studio/seed';
import {agentContext} from '../lib/studio/agent-context';import {frozenSystem} from '../lib/studio/pricing';
import {extractAgentFile,hydrateAgentFiles} from '../lib/studio/agent-file-extract';
import {jsPDF} from 'jspdf';import {Document,Packer,Paragraph} from 'docx';
const file=(fileName:string,bytes:Buffer)=>({fileName,base64:bytes.toString('base64'),byteSize:bytes.length});
test('PDF, DOCX and Markdown upload text is extracted, with no fabricated text for scanned/empty files',async()=>{
 assert.equal(await extractAgentFile(file('context.md',Buffer.from('# RyzaLab\nUse plain language.'))),'# RyzaLab\nUse plain language.');
 const doc=await Packer.toBuffer(new Document({sections:[{children:[new Paragraph('Original voice example')]}]}));
 assert.match(await extractAgentFile(file('voice.docx',doc)),/Original voice example/);
 const pdf=new jsPDF();pdf.text('Research first, write clearly.',10,10);
 assert.match(await extractAgentFile(file('instructions.pdf',Buffer.from(pdf.output('arraybuffer')))),/Research first/);
 await assert.rejects(()=>extractAgentFile(file('empty.md',Buffer.from('  '))),/No readable text/);
});
test('separate channel instructions/context and shared voice become frozen model context, never another channel',async()=>{
 const s=initialState(DEMO_ACTOR,true);
 s.agentRuleFiles=['instructions','context'].map((slot,i)=>({id:String(i),channel:'LinkedIn',slot:slot as 'instructions'|'context',...file(slot+'.md',Buffer.from(slot+' distinctive LinkedIn guidance')),uploadedBy:DEMO_ACTOR.email,uploadedAt:new Date().toISOString()}));
 s.agentVoiceExamples=[{id:'voice',title:'A real example',contentType:'post',channel:'Shared',text:'Distinctive original voice',createdBy:DEMO_ACTOR.email,createdAt:new Date().toISOString(),requestKey:'voice'}];
 const next=await hydrateAgentFiles(s,'LinkedIn');const context=agentContext(next,'LinkedIn');assert.equal(context!.rules.length,2);assert.equal(context!.voice.length,1);assert.equal(agentContext(next,'Newsletter')!.rules.length,0);
 const system=frozenSystem({rulesSnapshot:'Protected safety policy',workflowSnapshot:next.workflows[0],agentContextSnapshot:context});assert.match(system,/distinctive LinkedIn guidance/);assert.match(system,/Distinctive original voice/);assert.match(system,/OUTPUT CONTRACT/);assert.doesNotMatch(system,/base64/);
 const before=JSON.stringify(context);next.agentRuleFiles![0].extractedText='Changed later';assert.equal(JSON.stringify(context),before);assert.equal(s.agentRuleFiles![0].extractedText,undefined);
});
