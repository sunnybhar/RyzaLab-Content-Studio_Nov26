import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseResearchDossier,dossierForPassages,numericLiteral} from '../lib/studio/research-dossier';
import {sources,passage,now,dossierResponse} from './fixtures/research-dossier';
function parse(value=dossierResponse(), evidence=sources){return parseResearchDossier(JSON.stringify(value),evidence,now);}
test('dossier preserves exact claim evidence and computes percent change without accepting model arithmetic',()=>{
 const d=parse();assert.equal(d.calculationResults[0].value,20);assert.equal(d.calculationResults[0].formula,'(120 - 100) / 100 × 100');assert.deepEqual(d.calculationResults[0].inputValues,[100,120]);assert.equal(d.sources[0].citedText,passage);assert.match(d.notice,/not independent/);
 assert.throws(()=>parseResearchDossier(JSON.stringify({...dossierResponse(),result:900}),sources,now),/complete dossier/);
});
test('ledger rejects invented quotes, unknown sources, duplicate claim IDs and absent angle claims',()=>{
 for(const change of [
 (v:ReturnType<typeof dossierResponse>)=>{v.claims[0].evidence[0].quote='A fabricated quotation that is not present.';},
 (v:ReturnType<typeof dossierResponse>)=>{v.claims[0].evidence[0].sourceId='s9';},
 (v:ReturnType<typeof dossierResponse>)=>{v.claims.push(structuredClone(v.claims[0]));},
 (v:ReturnType<typeof dossierResponse>)=>{v.angles[0].claimIds=['c9'];},
 (v:ReturnType<typeof dossierResponse>)=>{v.claims[0].evidence=[];},
 ]){const v=dossierResponse();change(v);assert.throws(()=>parse(v));}
 assert.throws(()=>parse(dossierResponse(),[sources[0],sources[0]]),/ambiguous/);
});
test('excerpt-only claims are limited; disputed claims need competing sources; missing numbers are not padded',()=>{
 assert.equal(parse(dossierResponse(),[{...sources[0],sourceKind:'web_search_excerpt'}]).claims[0].status,'supported_with_limits');
 const disputed={...dossierResponse(),claims:[{...dossierResponse().claims[0],status:'disputed'}]};assert.throws(()=>parseResearchDossier(JSON.stringify(disputed),sources,now),/competing/);
 const empty={...dossierResponse(),data:[],calculations:[]};assert.deepEqual(parseResearchDossier(JSON.stringify(empty),sources,now).calculationResults,[]);
});
test('numeric provenance rejects partial exponents, decimals, malformed grouping, missing values and executable text',()=>{
 for(const literal of ['1e6','1,20','NaN','Infinity','1+2','10000000000000000'])assert.throws(()=>numericLiteral(literal));
 assert.equal(numericLiteral('-1,200.5'),-1200.5);
 for(const quote of ['The study reports 100.5 installations in this region.','The study reports 100e3 installations in this region.','The study reports 1,100 installations in this region.']){
 const v=dossierResponse();v.data[0].quote=quote;assert.throws(()=>parse(v,[{...sources[0],citedText:passage+' '+quote}]),/numeric literal/);
 }
});
test('arithmetic rejects incompatible units, geography, periods, duplicate inputs, zero baselines and missing inputs',()=>{
 const baseline=dossierResponse();
 for(const patch of [
 {data:[baseline.data[0],{...baseline.data[1],unit:'households'}]},
 {data:[baseline.data[0],{...baseline.data[1],geography:'Other region'}]},
 {calculations:[{...baseline.calculations[0],method:'sum'}]},
 {calculations:[{...baseline.calculations[0],inputIds:['n1','n1']}]},
 {calculations:[{...baseline.calculations[0],inputIds:['n1','n9']}]},
 {calculations:[{...baseline.calculations[0],method:'percentage_points'}]},
 ])assert.throws(()=>parseResearchDossier(JSON.stringify({...baseline,...patch}),sources,now));
 const zero=dossierResponse();zero.data[0].literal='0';zero.data[0].quote+=' Baseline was 0 installations.';assert.throws(()=>parse(zero,[{...sources[0],citedText:passage+' Baseline was 0 installations.'}]),/zero baseline/);
});
test('all supported arithmetic methods reproduce from compatible source data',()=>{
 const expected={sum:220,difference:-20,mean:110,median:110,share_percent:100/120*100,percent_change:20,percentage_points:-20};
 for(const [method,value]of Object.entries(expected)){
 const v=dossierResponse();v.data[1].period=v.data[0].period;if(method==='percentage_points')v.data.forEach(d=>d.unit='%');
 const d=parseResearchDossier(JSON.stringify({...v,calculations:[{...v.calculations[0],method}]}),sources,now);assert.equal(d.calculationResults[0].value,value);
 }
});
test('bounded handoff retains provenance only for included quotes and prunes dependent results and free summary findings',()=>{
 const v=dossierResponse();v.claims[0].evidence[0].quote=passage.slice(0,80);v.data.forEach(d=>d.quote=passage.slice(0,80));const dossier=parse(v);
 const retained=dossierForPassages(dossier,[{url:sources[0].url,citedText:passage.slice(0,80)}])!;
 assert.equal(retained.claims.length,1);assert.equal(retained.sources[0].id,'s1');assert.equal(retained.sources[0].citedText,passage.slice(0,80));assert.equal(retained.calculationResults[0].value,20);assert.deepEqual(retained.findings,[]);
 const omitted=dossierForPassages(dossier,[{url:sources[0].url,citedText:passage.slice(90)}])!;
 assert.equal(omitted.claims.length,0);assert.equal(omitted.data.length,0);assert.equal(omitted.calculationResults.length,0);assert.equal(omitted.angles.length,0);
 assert.equal(dossierForPassages(dossier,[{url:sources[0].url}])!.claims.length,0);assert.equal(dossier.claims.length,1);
});
