import type { Content } from "./types";

export function confirmationMarkers(text: string) {
  const pattern = /\[(?:Ryan\b|confirm\b|verify\b|source\b|TODO\b|TBD\b|insert\b|user\b|editor\b|INCOMPLETE OUTPUT\b|INVALID OUTPUT\b)[^\]\r\n]*(?:\]|(?=\r?\n|$))|\bNEEDS_SOURCE\b/gi;
  return [...text.matchAll(pattern)].map(match => ({ start: match.index!, end: match.index! + match[0].length, text: match[0] }));
}

export function inputRequirements(content: Content) {
  const fields: {key: string; label: string; text: string; tab: string}[] = [
    {key: "title", label: "Title", text: content.title, tab: "Write"},
    {key: "text", label: "Post text", text: content.text, tab: "Write"},
    {key: "metadata", label: "Publication notes", text: content.metadata, tab: "Write"},
    {key: "narration", label: "Narration", text: content.media.narration, tab: "Video & audio"},
    {key: "captions", label: "Captions", text: content.media.captions, tab: "Video & audio"},
  ];
  content.media.slides.forEach((slide, i) => {
    fields.push({key:`slide:${i}:title`,label:`Slide ${i+1} title`,text:slide.title,tab:"Slides"},{key:`slide:${i}:body`,label:`Slide ${i+1} text`,text:slide.body,tab:"Slides"});
    (slide.layers || []).forEach((layer,j) => {if(layer.kind === "text") fields.push({key:`slide:${i}:layer:${j}`,label:`Slide ${i+1} text layer ${j+1}`,text:layer.text,tab:"Slides"});});
  });
  content.media.scenes.forEach((scene,i)=> fields.push({key:`scene:${i}:title`,label:`Scene ${i+1} title`,text:scene.title,tab:"Video & audio"},{key:`scene:${i}:script`,label:`Scene ${i+1} script`,text:scene.script,tab:"Video & audio"}));
  return fields.flatMap(field=>confirmationMarkers(field.text).map(marker=>({...marker,field:field.key,label:field.label,tab:field.tab})));
}
