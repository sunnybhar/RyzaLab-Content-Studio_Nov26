import type {StoredAgentFile} from './agent-rule-files';
import {validateStoredAgentFile} from './agent-rule-files';
import {StudioError} from './permissions';
export async function extractAgentFile(file:StoredAgentFile){
 validateStoredAgentFile(file);const data=Buffer.from(file.base64,'base64');let text='';
 if(/\.docx$/i.test(file.fileName)){const {extractRawText}=await import('mammoth');text=(await extractRawText({buffer:data})).value;}
 else if(/\.pdf$/i.test(file.fileName)){
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(data),isEvalSupported:false,useSystemFonts:true});
  try{const pdf=await task.promise;if(pdf.numPages>20)throw new StudioError(400,'Use a PDF of at most 20 pages.');
   for(let page=1;page<=pdf.numPages;page++){const content=await (await pdf.getPage(page)).getTextContent();text+=content.items.map(item=>'str'in item?item.str:'').join(' ')+'\n';if(text.length>60000)break;}
  }finally{await task.destroy();}
 }else text=data.toString('utf8');
 text=text.replace(/\u0000/g,'').trim();if(!text)throw new StudioError(400,'No readable text found. Paste the text or upload a searchable document; scanned PDFs need OCR first.');
 if(text.length>60000)throw new StudioError(400,'Document exceeds 60,000 extracted characters. Use a shorter document.');return text;
}
