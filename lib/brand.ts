import raw from '@/knowledge/brand-guard/scripts/rules.json';
import type { Issue } from './types';
interface Rule { id:string; severity:string; pattern:string; message:string; suggest?:string; audiences?:string[]; case_sensitive?:boolean; unless?:string }
export function review(text:string,audience:string): {verdict:string;issues:Issue[]}{
 const issues:Issue[]=[];
 for(const r of raw.rules as Rule[]){
  if(r.audiences&&!r.audiences.includes(audience))continue;
  const flags=r.case_sensitive?'':'i';
  // The supplied patterns use syntax also supported by modern JS engines.
  const pattern=new RegExp(r.pattern,flags);
  const hit=text.split(/(?<=[.!?])\s+|\n/).some(sentence=>pattern.test(sentence)&&(!r.unless||!new RegExp(r.unless,flags).test(sentence)));
  if(hit)issues.push({id:r.id,severity:r.severity,message:r.message,suggest:r.suggest});
 }
 const d=raw.medical_disclaimer;
 if(d.audiences.includes(audience)&&new RegExp(d.trigger,'i').test(text)&&!new RegExp(d.required,'i').test(text))issues.push({id:'medical-disclaimer',severity:d.severity,message:d.message});
 for(const match of text.matchAll(/\$\s*([\d,]+(?:\.\d+)?)/g)){
  const n=Number(match[1].replaceAll(',',''));
  const allowed=[...raw.prices.live,...raw.prices.hardware_ranges.flat(),...raw.prices.sourced_figures];
  if(raw.prices.pending.includes(n))issues.push({id:'pending-price-'+n,severity:'BLOCK',message:`$${n.toLocaleString()} is a pending price and must not appear in public copy.`});
  else if(!allowed.includes(n))issues.push({id:'unverified-price-'+n,severity:'CHECK',message:`Verify the source for $${n.toLocaleString()}.`});
 }
 if(/\[.+?\]/s.test(text))issues.push({id:'placeholder',severity:'CHECK',message:'Unresolved placeholders need Ryan’s input.'});
 return {verdict:issues.some(i=>i.severity==='BLOCK')?'BLOCKED':issues.some(i=>i.severity==='FIX')?'FIX FIRST':"READY FOR RYAN’S APPROVAL",issues};
}
