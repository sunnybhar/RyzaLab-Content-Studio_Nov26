"use client";
import {AgentVoiceLibrary} from "./agent-voice-library";
import {useState} from 'react';
import {CHANNELS,type Actor,type Channel,type Command,type StudioState} from '@/lib/studio/types';
import {can} from '@/lib/studio/permissions';
export function AgentRules({state,actor,send}:{state:StudioState;actor:Actor;send:(command:Command)=>Promise<unknown>}) {
 const [channel,setChannel]=useState<Channel>('LinkedIn'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const allowed=can(state,actor,'workflow.edit',{channel});
 async function upload(slot:'instructions'|'context',file:File) {
  setBusy(true);setError('');setMessage('');try{
   if(!/\.(docx|pdf|md|txt)$/i.test(file.name)||file.size<1||file.size>262144)throw new Error('Choose a nonempty DOCX, PDF, TXT or Markdown file up to 256 KB.');
   const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
   const previous=state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot===slot);
   await send({type:'agentRules.save',channel,slot,fileName:file.name,byteSize:file.size,base64:btoa(binary),expectedId:previous?.id});setMessage(`${slot==='instructions'?'Instructions':'Context'} saved for ${channel}. Stored only; not connected to any agent.`);
  }catch(e){setError(e instanceof Error?e.message:'Could not save the file.');}finally{setBusy(false);}
 }
 function download(file:NonNullable<StudioState['agentRuleFiles']>[number]){const bytes=Uint8Array.from(atob(file.base64),char=>char.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download=file.fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="s-panel s-panel-padding" aria-label="Agent Rules files"><h2>Instructions and Context</h2><p>Store two separate files for each channel: how its agent should work, and the background it will need. These files are stored only. They are not parsed, executed or sent to any AI agent.</p><label className="s-field">Social channel<select aria-label="Agent Rules channel" value={channel} disabled={busy} onChange={event=>{setChannel(event.target.value as Channel);setError('');setMessage('');}}>{CHANNELS.map(value=><option key={value}>{value}</option>)}</select></label>
 <div className="s-agent-rule-grid">{(['instructions','context'] as const).map(slot=>{const label=slot==='instructions'?'Instructions':'Context',file=state.agentRuleFiles?.find(f=>f.channel===channel&&f.slot===slot);return <article className="s-panel s-panel-padding" key={slot}><h3>{label}</h3><p>{slot==='instructions'?'Voice, structure, writing rules and expected outputs.':'Brand, audience, background, examples and source material.'}</p><p><strong>Stored only · Not connected</strong></p>{file?<><p>{file.fileName} · {(file.byteSize/1024).toFixed(1)} KB</p><p>Uploaded {new Date(file.uploadedAt).toLocaleString()}</p><button className="s-btn" onClick={()=>download(file)}>Download {label}</button><button className="s-btn" disabled={busy||!allowed} onClick={async()=>{setBusy(true);setError('');try{await send({type:'agentRules.remove',channel,slot,expectedId:file.id});setMessage(`${label} removed from ${channel}.`);}catch(e){setError(e instanceof Error?e.message:'Could not remove file.');}finally{setBusy(false);}}}>Remove {label}</button></>:<p>No {label.toLowerCase()} file uploaded for {channel}.</p>}<label className="s-field">{file?'Replace':'Upload'} {label}<input aria-label={`Upload ${label} file`} type="file" accept=".docx,.pdf,.txt,.md" disabled={busy||!allowed} onChange={event=>{const selected=event.target.files?.[0];event.target.value='';if(selected)void upload(slot,selected);}}/></label></article>;})}</div>
 <p>DOCX, PDF, TXT and Markdown are supported, up to 256 KB per file. The original file is preserved for download. No agent connection is available in this section yet.</p>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <AgentVoiceLibrary key={channel} state={state} actor={actor} channel={channel} send={send}/>
 </section>;
}
