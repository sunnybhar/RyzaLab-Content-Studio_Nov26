import JSZip from "jszip";
import { ACTIVE_CHANNELS } from "./active-channels";
import { pipelineRowSchema, validatePipelineRow, type PipelineRow } from "./pipeline";
export interface WorkbookSheet { name:string; rows:{number:number;values:string[]}[] }
export interface CalendarWorkbook { sheets:WorkbookSheet[]; date1904:boolean }
const MAX_XML=4000000;
function xml(text:string){
  if(text.length>MAX_XML||/<!DOCTYPE|<!ENTITY/i.test(text))throw Error("Workbook XML is too large or contains unsupported entities.");
  const doc=new DOMParser().parseFromString(text,"application/xml");
  if(doc.querySelector("parsererror"))throw Error("Workbook contains invalid XML.");return doc;
}
function elements(root:Document|Element,name:string){return Array.from(root.getElementsByTagNameNS("*",name));}
async function bounded(entry:JSZip.JSZipObject){
  // Stream decompression with an actual output bound, not just ZIP size metadata.
  return new Promise<string>((resolve,reject)=>{let total=0;const chunks:Uint8Array[]=[];const stream=entry.internalStream("uint8array");stream.on("data",part=>{total+=part.byteLength;if(total>MAX_XML){stream.pause();reject(Error("Workbook XML exceeds 4 MB per part."));}else chunks.push(part);}).on("error",reject).on("end",()=>{const out=new Uint8Array(total);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}resolve(new TextDecoder().decode(out));}).resume();});
}
export async function readCalendarWorkbook(bytes:ArrayBuffer):Promise<CalendarWorkbook>{
  if(bytes.byteLength>5000000)throw Error("Choose an XLSX file up to 5 MB.");
  const zip=await JSZip.loadAsync(bytes);
  if(Object.keys(zip.files).length>600)throw Error("Workbook has too many ZIP parts.");
  if(Object.keys(zip.files).some(name=>/vbaProject|externalLinks|embeddings/i.test(name)))throw Error("Remove macros, external workbook links and embedded objects before importing.");
  const read=async(name:string)=>{const entry=zip.file(name);if(!entry)throw Error(`Missing workbook part: ${name}`);return xml(await bounded(entry));};
  const book=await read("xl/workbook.xml"),rels=await read("xl/_rels/workbook.xml.rels");
  const date1904=["1","true"].includes(elements(book,"workbookPr")[0]?.getAttribute("date1904")||"");
  const strings:string[]=[];
  if(zip.file("xl/sharedStrings.xml")){const doc=await read("xl/sharedStrings.xml");for(const si of elements(doc,"si"))strings.push(elements(si,"t").map(t=>t.textContent||"").join(""));}
  const sheets:WorkbookSheet[]=[];
  for(const sheet of elements(book,"sheet").slice(0,12)){
    const relation=elements(rels,"Relationship").find(r=>r.getAttribute("Id")===sheet.getAttribute("r:id"));
    const target=relation?.getAttribute("Target");
    if(!target||relation?.getAttribute("TargetMode")==="External")continue;
    const name=target.startsWith("/")?target.slice(1):"xl/"+target;
    if(name.includes("..")||!/^xl\/worksheets\/[^/]+\.xml$/.test(name))throw Error("Unsupported worksheet path.");
    const doc=await read(name),rows:WorkbookSheet["rows"]=[];
    for(const row of elements(doc,"row")){
      const values:string[]=[];
      for(const cell of elements(row,"c")){
        const ref=cell.getAttribute("r")||"";let column=0;for(const char of ref.replace(/[0-9]/g,""))column=column*26+char.charCodeAt(0)-64;
        if(column<1||column>100)continue;
        // Formulas are never evaluated. Ignore their cached values as import input.
        if(elements(cell,"f").length)continue;
        const value=elements(cell,"v")[0]?.textContent||"";
        values[column-1]=cell.getAttribute("t")==="s"?strings[Number(value)]||"":cell.getAttribute("t")==="inlineStr"?elements(cell,"t").map(t=>t.textContent||"").join(""):value;
      }
      if(values.some(v=>v?.trim()))rows.push({number:Number(row.getAttribute("r")),values});
      if(rows.length>3000)throw Error("Choose a workbook with at most 3,000 populated rows per sheet.");
    }
    sheets.push({name:sheet.getAttribute("name")||"Sheet",rows});
  }
  if(!sheets.length)throw Error("No readable worksheets found.");return {sheets,date1904};
}
export const CALENDAR_FIELDS={externalId:"Brief ID",title:"Working title",angle:"Angle / brief",channel:"Channel / account",account:"Account",format:"Format",date:"Date",time:"Time",timezone:"Timezone",audience:"Audience",sourceUrls:"Source URLs",existingCopy:"Existing post copy",notes:"Notes",status:"Status"};
export type CalendarField=keyof typeof CALENDAR_FIELDS;
export type ColumnMapping=Record<CalendarField,number>;
const aliases:Record<CalendarField,string[]>={externalId:["briefid","distributionid"],title:["workingtitle","title","hookworkingtitle","hook"],angle:["anglebrief","anglenotes","ryansangle","brief","angle"],channel:["channelaccount","channel","platform"],account:["account","publication"],format:["format","intendedformat"],date:["date","preferreddate","newsdate"],time:["timeet","time","preferredtime"],timezone:["timezone"],audience:["audience"],sourceUrls:["sourceurls","link","links","canonicalnoteurl","sourceurl"],existingCopy:["existingpostcopy","postcopyapproved","postcopy"],notes:["notes","newsdescription"],status:["status","plannedstatus"]};
const norm=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");
export function suggestMapping(headers:string[]):ColumnMapping{
  return Object.fromEntries(Object.keys(CALENDAR_FIELDS).map(key=>[key,headers.findIndex(h=>aliases[key as CalendarField].includes(norm(h||""))) ])) as ColumnMapping;
}
export function excelDate(value:string,date1904=false){
  if(/^\d+(\.\d+)?$/.test(value)){const serial=Number(value);if(serial<=0||serial>100000||(!date1904&&Math.floor(serial)===60))throw Error("Invalid Excel date serial.");return new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+Math.floor(serial)*86400000).toISOString().slice(0,10);}
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const us=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);if(us)return `${us[3]}-${us[1].padStart(2,"0")}-${us[2].padStart(2,"0")}`;
  throw Error("Use an Excel date, YYYY-MM-DD or MM/DD/YYYY.");
}
export function excelTime(value:string){
  if(/^0(?:\.\d+)?$/.test(value)){const minutes=Math.round(Number(value)*1440);if(minutes>=1440)throw Error("Invalid time fraction.");return `${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;}
  const m=/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(value);if(!m)throw Error("Use an Excel time or HH:MM (optional AM/PM).");
  let hour=Number(m[1]);if(m[3]){if(hour<1||hour>12)throw Error("Invalid 12-hour time.");hour=hour%12+(m[3].toUpperCase()==="PM"?12:0);}if(hour>23||Number(m[2])>59)throw Error("Invalid time.");return `${String(hour).padStart(2,"0")}:${m[2]}`;
}
export interface ImportPreview {key:string;row:number;data?:PipelineRow;error?:string;warning?:string}
export function previewCalendar(sheet:WorkbookSheet,mapping:ColumnMapping,options:{date1904:boolean;timezone:string;defaultChannel:PipelineRow["channel"];headerRow:number;channelOverride?:PipelineRow["channel"]}):ImportPreview[]{
  const result:ImportPreview[]=[];
  for(const row of sheet.rows.filter(r=>r.number>options.headerRow)){
    const get=(field:CalendarField)=>(row.values[mapping[field]]||"").trim();
    const title=get("title");if(!title)continue;
    const raw=get("channel");const combined=/website\s*\+\s*linkedin|linkedin\s*\+\s*website/i.test(raw);
    const selected=options.channelOverride||ACTIVE_CHANNELS.find(c=>raw.toLowerCase().includes(c.toLowerCase()))||(!raw?options.defaultChannel:undefined);
    try{
      if(!selected)throw Error(`Map or skip unsupported destination “${raw}”. Retired/website channels are not imported automatically.`);
      const time=get("time"),date=get("date");
      const sourceUrls=get("sourceUrls").split(/[\s,;]+/).filter(Boolean);
      const data=pipelineRowSchema.parse({externalId:get("externalId"),title,angle:get("angle"),channel:selected,account:get("account")||"RyzaLab",format:get("format")||(selected==="Newsletter"?"Newsletter":"Text post"),audience:get("audience"),plannedDate:date?excelDate(date,options.date1904):undefined,plannedTime:time?excelTime(time):undefined,timezone:get("timezone")||options.timezone,sourceUrls,existingCopy:get("existingCopy"),notes:[get("notes"),raw?`Imported destination: ${raw}`:"",get("status")?`Imported status (unverified): ${get("status")}`:""].filter(Boolean).join("\n"),historical:/\b(published|posted|sent)\b/i.test(get("status")),sheet:sheet.name,row:row.number});
      validatePipelineRow(data);result.push({key:`${sheet.name}:${row.number}`,row:row.number,data,warning:combined?"LinkedIn only. Website destination retained in notes; no website channel or second publication is created.":!data.plannedDate?"Unscheduled brief":!data.plannedTime?"Date only — no publishing time assigned":data.historical?"Historical published record — not a new publication":""});
    }catch(error){result.push({key:`${sheet.name}:${row.number}`,row:row.number,error:error instanceof Error?error.message:"Invalid row"});}
  }
  return result;
}
const escape=(v:string)=>v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export async function calendarTemplate(){
  const zip=new JSZip();
  zip.file("[Content_Types].xml",'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+[1,2,3].map(i=>`<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")+"</Types>");
  zip.file("_rels/.rels",'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file("xl/workbook.xml",'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+["Calendar","Existing Pipeline","Instructions"].map((n,i)=>`<sheet name="${n}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")+"</sheets></workbook>");
  zip.file("xl/_rels/workbook.xml.rels",'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+[1,2,3].map(i=>`<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`).join("")+"</Relationships>");
  const headers=Object.values(CALENDAR_FIELDS);
  const sheets=[ [headers], [headers], [["RyzaLab content calendar template"],["Add one brief per row. Calendar is dated; Existing Pipeline can be unscheduled."],["Brief ID is recommended and stable across re-uploads. Use different IDs for different briefs."],["Channel: LinkedIn, Newsletter, Instagram, YouTube or Reddit. Account: exact intended account name."],["Dates: YYYY-MM-DD or Excel dates. Time: HH:MM. Timezone: IANA name, e.g. America/New_York."],["Separate source URLs with spaces. Blank formatted rows and formulas are ignored."],["Uploaded approvals/source-check labels are historical notes, never new approval or fact verification."],["Import each sheet in turn. Preview and confirm. Duplicates default to skip; updates never replace linked drafts."],["No AI generation or publishing occurs during import. Scheduling/publishing requires separate approval."],["Optional copy is source material for a draft, not a published/approved package."],["Designed from the supplied v2.2 Calendar and Content Ideas workbook fields."]] ];
  sheets.forEach((rows,index)=>zip.file(`xl/worksheets/sheet${index+1}.xml`,'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,i)=>`<row r="${i+1}">`+row.map((v,j)=>`<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${escape(v)}</t></is></c>`).join("")+"</row>").join("")+"</sheetData></worksheet>"));
  return zip.generateAsync({type:"uint8array",compression:"DEFLATE"});
}
