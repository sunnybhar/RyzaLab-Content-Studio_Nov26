import {test} from "node:test";import assert from "node:assert/strict";
import {initialState,DEMO_ACTOR} from "../lib/studio/seed";import {applyCommand} from "../lib/studio/engine";
import {ideaStage,ideaRequestGroups} from "../lib/studio/idea-board";
import type {Job} from "../lib/studio/types";
test("board moves persist as planning only and never approve, publish, create jobs or lose source evidence",()=>{
 let s=initialState(DEMO_ACTOR,true);const idea=s.ideas.find(i=>i.state==="pending")!,original=structuredClone(idea),jobCount=s.jobs.length;
 s=applyCommand(s,DEMO_ACTOR,{type:"idea.stage",id:idea.id,stage:"shortlisted",expectedStage:"new"});
 s=applyCommand(s,DEMO_ACTOR,{type:"idea.stage",id:idea.id,stage:"ready",expectedStage:"shortlisted"});
 const saved=JSON.parse(JSON.stringify(s));assert.equal(ideaStage(saved.ideas.find((i:any)=>i.id===idea.id)),"ready");assert.equal(saved.ideas.find((i:any)=>i.id===idea.id).state,"pending");assert.deepEqual(saved.ideas.find((i:any)=>i.id===idea.id).sources,original.sources);assert.equal(s.jobs.length,jobCount);assert.equal(s.packages.length,0);assert.equal(s.schedules.length,0);
 assert.throws(()=>applyCommand(s,DEMO_ACTOR,{type:"idea.stage",id:idea.id,stage:"new",expectedStage:"shortlisted"}),/moved elsewhere/);
});
test("board moves enforce channel edit authority, and rejected ideas retain feedback until revised",()=>{
 const s=initialState(DEMO_ACTOR,true),idea=s.ideas[0],viewer={id:"viewer",email:"viewer@example.com"};s.members.push({...viewer,roles:["viewer"],grants:[],revoked:false});assert.throws(()=>applyCommand(s,viewer,{type:"idea.stage",id:idea.id,stage:"shortlisted",expectedStage:ideaStage(idea)}),/idea.edit/);
 const rejected=s.ideas.find(i=>i.state==="rejected")!;assert.throws(()=>applyCommand(s,DEMO_ACTOR,{type:"idea.stage",id:rejected.id,stage:"ready",expectedStage:ideaStage(rejected)}),/Revise/);
});
test("request inbox groups generated batches once, keeps empty jobs and handles manual and orphan history",()=>{
 const s=initialState(DEMO_ACTOR,true),base=s.ideas[0],job={id:"batch-1",kind:"ideas",channel:"LinkedIn",prompt:JSON.stringify({topic:"Original batch topic"}),createdAt:"2026-11-04T12:00:00Z"} as Job;
 const ideas=[{...base,id:"first",generationRunId:job.id},{...base,id:"second",generationRunId:job.id},{...base,id:"manual",generationRunId:undefined},{...base,id:"orphan",generationRunId:"older-request"}];
 const groups=ideaRequestGroups(ideas,[job,{...job,id:"queued-empty",createdAt:"2026-11-05T12:00:00Z"},{...job,id:"assistance",ideaPurpose:"manual_assistance"}]);
 assert.equal(groups.find(g=>g.id===job.id)!.ideas.length,2);assert.equal(groups.find(g=>g.id===job.id)!.topic,"Original batch topic");assert.equal(groups.find(g=>g.id==="queued-empty")!.ideas.length,0);assert.equal(groups.find(g=>g.id==="manual:manual")!.topic,base.brief);assert.equal(groups.find(g=>g.id==="older-request")!.topic,"Original topic not recorded");assert.equal(groups.some(g=>g.id==="assistance"),false);assert.equal(groups[0].id,"queued-empty");
});
