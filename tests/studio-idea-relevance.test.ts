import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ideaResearchQuery,relevantIdeaCitation} from '../lib/studio/idea-research-query';
test('brand-only idea request uses the explicit elder-care audience and excludes unrelated excerpts',()=>{
 const topic='Any ideas with respect to Ryzalab services',audience='Elder Care';
 assert.equal(ideaResearchQuery(topic,audience),'elder care');
 for(const title of ['Respect in the Commonwealth: A toolkit for building relationships, generating new ideas and increasing respect','Any better ideas? Think tanks and policy analysis in Canada'])assert.equal(relevantIdeaCitation({title,citedText:'Community workshops and public policy ideas'},topic,audience),false);
 assert.equal(relevantIdeaCitation({title:'Elder care at home',citedText:'Older adults and household routines'},topic,audience),true);
 assert.throws(()=>ideaResearchQuery(topic,'General readers'),/specific public subject/);
});
