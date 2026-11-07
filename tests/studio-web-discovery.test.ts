import {test} from 'node:test';import assert from 'node:assert/strict';import {discoverWeb,retrieveBroadReferences} from '../lib/studio/web-discovery';
const query='elder care at home';
const rss='<rss><channel><item><title>Elder care at home</title><link>https://example.org/elder-care</link><description>Older adults benefit from clear household routines and documented handover notes for daily care.</description></item></channel></rss>';
test('general websites and news are cited as search excerpts; injected discovery tests do not perform real page networking',async()=>{
 const hosts:string[]=[];const request:typeof fetch=async(url,init)=>{hosts.push(new URL(String(url)).hostname);assert.equal(init?.redirect,'error');return new Response(rss);};
 const result=await retrieveBroadReferences(query,request);assert.equal(result.citations[0].url,'https://example.org/elder-care');assert.equal(result.citations[0].sourceKind,'web_search_excerpt');assert.match(result.citations[0].accessNote!,/not fetched/);assert.ok(result.retrieval.requests>=4);assert.ok(hosts.every(h=>['www.bing.com','api.crossref.org'].includes(h)));assert.equal(result.retrieval.providerChargeCents,0);
});
test('unavailable, oversized and XML-entity feeds do not become sources or trigger model calls',async()=>{
 for(const body of ['x'.repeat(65537),'<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>'+rss,'<rss><channel><item><title>Only title</title></item></channel></rss>']){
 const found=await discoverWeb(query,async()=>new Response(body));assert.equal(found.citations.length,0);assert.ok(found.gaps.length);
 }
 await assert.rejects(()=>retrieveBroadReferences(query,async()=>new Response('unavailable',{status:503})),/No relevant non-Wikipedia/);
});
