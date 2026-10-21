import type { Slide } from './types';
export function downloadText(text:string,name:string,type='text/markdown'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function lines(ctx:CanvasRenderingContext2D,text:string,width:number){const result:string[]=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){result.push(line);line=word}else line=next}if(line)result.push(line);return result}
export async function renderSlide(slide:Slide,index:number,total:number,style:'paper'|'teal',image?:string){
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d')!;
 const dark=style==='teal'||index===total-1;ctx.fillStyle=dark?'#0B3A42':'#F8F6EE';ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle=dark?'#b8d4d1':'#1F6E78';ctx.font='500 24px Inter, sans-serif';ctx.fillText('RYZALAB  /  YOURS BY DESIGN',80,100);
 ctx.fillStyle=dark?'#F8F6EE':'#0B3A42';ctx.font='700 76px Manrope, sans-serif';let y=250;
 for(const line of lines(ctx,slide.title,920)){ctx.fillText(line,80,y);y+=94;}
 ctx.font='400 36px Inter, sans-serif';y+=35;
 for(const line of lines(ctx,slide.body,920)){ctx.fillText(line,80,y);y+=52;}
 if(image){const img=new Image();img.src=image;await img.decode();const top=Math.max(650,y+40),h=1180-top;if(h>80){ctx.save();ctx.beginPath();ctx.rect(80,top,920,h);ctx.clip();const scale=Math.max(920/img.width,h/img.height);ctx.drawImage(img,80+(920-img.width*scale)/2,top+(h-img.height*scale)/2,img.width*scale,img.height*scale);ctx.restore();ctx.font='400 18px Inter, sans-serif';ctx.fillText('AI-generated concept · Not a real RyzaLab installation',80,1210);}}
 ctx.fillStyle=dark?'#b8d4d1':'#1F6E78';ctx.fillRect(80,1250,920,2);ctx.font='500 24px Inter, sans-serif';ctx.fillText('ryzalab.com',80,1300);ctx.fillText(`${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`,900,1300);
 return canvas;
}
export async function exportCarousel(slides:Slide[],style:'paper'|'teal',format:'png'|'pdf',image?:string){
 if(format==='pdf'){const {jsPDF}=await import('jspdf');const pdf=new jsPDF({unit:'px',format:[1080,1350],hotfixes:['px_scaling']});for(let i=0;i<slides.length;i++){if(i)pdf.addPage([1080,1350]);const c=await renderSlide(slides[i],i,slides.length,style,image);pdf.addImage(c.toDataURL('image/jpeg',0.95),'JPEG',0,0,1080,1350)}pdf.save('ryzalab-carousel.pdf')}
 else{const {default:JSZip}=await import('jszip');const zip=new JSZip();for(let i=0;i<slides.length;i++){const c=await renderSlide(slides[i],i,slides.length,style,image);zip.file(`ryzalab-slide-${i+1}.png`,c.toDataURL('image/png').split(',')[1],{base64:true})}const blob=await zip.generateAsync({type:'blob'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ryzalab-carousel.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
