import {test} from 'node:test';
import assert from 'node:assert/strict';
import {review} from '../lib/brand';
test('blocks privacy guarantees and unsupported pending prices',()=>{const r=review('Nothing ever leaves your home. Nursery Setup costs $1,500.','family');assert.equal(r.verdict,'BLOCKED');assert.ok(r.issues.some(i=>i.id==='privacy-nothing-leaves'));assert.ok(r.issues.some(i=>i.id==='pending-price-1500'))});
test('requires human input for unresolved personal claims',()=>{const r=review('[Ryan: add your real experience.]','general');assert.ok(r.issues.some(i=>i.id==='placeholder'));assert.notEqual(r.verdict,'APPROVED')});
test('requires disclaimer for nursery content',()=>{assert.ok(review('A nursery lighting routine.','family').issues.some(i=>i.id==='medical-disclaimer'))});
test('accepts scoped claims with LIVE prices',()=>{const r=review('RyzaLab Blueprint is $395. Local where supported.','trade');assert.equal(r.verdict,'READY FOR RYAN’S APPROVAL');assert.equal(r.issues.filter(i=>i.severity==='BLOCK').length,0)});
test('all supplied patterns compile and respect audience',()=>{assert.doesNotThrow(()=>review('Example text.','general'));assert.ok(review('Configure YAML.','family').issues.some(i=>i.id.includes('jargon')));assert.ok(!review('Configure YAML.','diy').issues.some(i=>i.id.includes('jargon')))});
