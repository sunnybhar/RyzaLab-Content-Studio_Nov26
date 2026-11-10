import {initialState,DEMO_ACTOR} from '../../lib/studio/seed';
import {saveBoundedWorkflowSetup} from '../../lib/studio/bounded-workflow-setup';
import {applyCommand} from '../../lib/studio/engine';
import {researchAnalysisInput} from '../../lib/studio/research-analysis';
import {quote} from '../../lib/studio/pricing';
export const now='2026-11-10T12:00:00.000Z';
export const passage='The household study recorded 100 installations in 2024 and 120 installations in 2025. The observations cover the same region and exclude maintenance visits.';
export const sources=[{id:'s1',url:'https://evidence.example.org/study',title:'Installation study',sourceKind:'article_text',citedText:passage,accessNote:'Fixture passage, no live retrieval.'}];
export function dossierResponse(){return {
 version:1 as const,question:'How did installations change?',assumptions:['The published definitions are comparable.'],findings:['Recorded installations increased.'],
 claims:[{id:'c1',text:'The study reports 120 installations in 2025.',status:'supported' as const,evidence:[{sourceId:'s1',quote:passage}],reasoning:'The retained passage explicitly reports this count.',limitations:'This is one study, not a population estimate.',applicableDate:'2025',geography:'Study region'}],
 data:[{id:'n1',label:'Baseline',sourceId:'s1',quote:passage,literal:'100',unit:'installations',period:'2024',geography:'Study region',kind:'observed' as const,limitations:'Study sample only.'},{id:'n2',label:'Later count',sourceId:'s1',quote:passage,literal:'120',unit:'installations',period:'2025',geography:'Study region',kind:'observed' as const,limitations:'Study sample only.'}],
 calculations:[{id:'d1',label:'Change in recorded installations',method:'percent_change' as const,inputIds:['n1','n2'],comparisonBasis:'Same study definitions and region.',interpretation:'Descriptive change, not a causal effect.',limitations:'Not a population growth rate.'}],
 counterarguments:['Sample coverage may differ.'],gaps:['Independent corroboration is not available.'],angles:[{title:'Installation change and limits',claimIds:['c1'],whyUseful:'Separates a recorded change from a causal explanation.'}],critique:['This is a model self-critique, not independent fact verification.']
};}
export function dossierState(){
 let state=initialState(DEMO_ACTOR,true);
 state.settings.qualifiedRates=[];state.settings.monthlyCap=500;state.settings.requestCap=50;state.settings.confirmationThreshold=0;
 state.connections.push({id:'dossier-writer',title:'Fixture writer',provider:'anthropic',function:'text',model:'claude-sonnet-5-5',hasKey:true,status:'validated',updatedAt:now});
 state=saveBoundedWorkflowSetup(state,DEMO_ACTOR,{connectionId:'dossier-writer',expectedVersion:state.version,channels:['LinkedIn']},{model:'claude-sonnet-5-5',maxInputTokens:1000000,maxOutputTokens:128000},now);
 state=applyCommand(state,DEMO_ACTOR,{type:'research.retrieve',channel:'LinkedIn',query:'Household installation study',idempotencyKey:'study-source'},{now,retrievalResult:{version:2,summary:'A household study excerpt.',citations:sources.map(({id,...s})=>s),status:'retrieved_references',scope:'public_reference_apis',retrievedAt:now,claims:[],notice:'Fixture, no external request.',retrieval:{adapter:'bounded-web-v2',requests:1,responseBytes:500,excerptBytes:passage.length,providers:['public_page'],gaps:[],providerChargeCents:0}}});
 return state;
}
export function queuedAnalysis(){const state=dossierState();const command={type:'research.analyze' as const,channel:'LinkedIn' as const,researchJobId:state.jobs[0].id,idempotencyKey:'analysis-one',maximum:50};const input=researchAnalysisInput(state,DEMO_ACTOR,command);const priced=quote(state,input);return {command,priced,state:applyCommand(state,DEMO_ACTOR,input,{now,researchAnalysis:true,quotedCost:priced.cost,pricingSnapshot:priced.pricingSnapshot})};}
