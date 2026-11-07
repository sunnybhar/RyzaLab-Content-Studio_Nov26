import { build } from "esbuild";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const script = await build({
  stdin: {
    contents: `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{exportContentDocument}from'./lib/studio/exports';import{documentSections}from'./lib/studio/document-sections';import{ArticleBody}from'./components/article-images';function image(color){const c=document.createElement('canvas');c.width=400;c.height=200;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,400,200);return c.toDataURL('image/png');}const text='## Background\\n'+('Careful handoff documentation supports practical choices and explains limitations. '.repeat(45))+'\\n## Practical choices\\n'+('Independent evidence should support the practical analysis and explain uncertainty. '.repeat(45))+'\\n## Sources\\nhttps://example.org/original';const sections=documentSections(text),media={slides:[],scenes:[],imagePrompt:'',narration:'',captions:'',aspect:'1:1',imageUrl:image('#123456'),imageAlt:'Hero concept',imageCaption:'Hero illustration caption',sectionImages:[{id:'one',section:sections[0].key,url:image('#219876'),alt:'Background concept',caption:'Caption at background'},{id:'two',section:sections[1].key,url:image('#cb6234'),alt:'Practical concept',caption:'Caption at practical choices'}]};const layout={font:'Georgia',bodySize:12,marginMm:25,lineSpacing:1.4,header:'Publication header',footer:'RyzaLab footer',pageSize:'A4'};function App(){const[status,setStatus]=useState('');async function run(format,include=true,invalid=false){try{await exportContentDocument('Illustrated issue',invalid?'## Renamed\\nChanged section.':text,3,format,{layout,...(include?{imageUrl:media.imageUrl,imageAlt:media.imageAlt,imageCaption:media.imageCaption,sectionImages:media.sectionImages}:{}),onExported:r=>setStatus(r.pages?'PDF pages: '+r.pages:'DOCX saved')});}catch(e){setStatus(e.message);}}return <><button onClick={()=>run('docx')}>Export illustrated DOCX</button><button onClick={()=>run('pdf')}>Export illustrated PDF</button><button onClick={()=>run('docx',false)}>Export text only</button><button onClick={()=>run('docx',true,true)}>Check renamed heading</button><output>{status}</output><ArticleBody text={text} media={media} AssetMedia={({source,alt})=><img src={source} alt={alt}/>}/></>};createRoot(document.getElementById('app')).render(<App/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({ acceptDownloads: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("http://localhost:31343/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body:
        '<div id="app"></div><script>' +
        script.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    }),
  );
  await page.goto("http://localhost:31343/");
  assert.equal(await page.getByRole("figure").count(), 3);
  for (const format of ["DOCX", "PDF"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: `Export illustrated ${format}`,
        exact: true,
      })
      .click();
    const file = await pending,
      bytes = await fs.readFile((await file.path())!);
    if (format === "DOCX") {
      const zip = await JSZip.loadAsync(bytes),
        xml = await zip.file("word/document.xml")!.async("string");
      assert.equal((xml.match(/<w:drawing>/g) || []).length, 3);
      assert.ok(
        xml.indexOf("Hero illustration caption") < xml.indexOf(">Background<"),
      );
      assert.ok(
        xml.indexOf(">Background<") < xml.indexOf("Caption at background"),
      );
      assert.ok(
        xml.indexOf("Caption at background") <
          xml.indexOf(">Practical choices<"),
      );
      assert.match(
        await zip.file("word/styles.xml")!.async("string"),
        /Georgia/,
      );
      assert.match(xml, /w:top="1417"/);
      assert.match(
        await zip.file("word/header1.xml")!.async("string"),
        /Publication header/,
      );
    } else {
      const task = getDocument({
        data: new Uint8Array(bytes),
        isEvalSupported: false,
      });
      try {
        assert.ok((await task.promise).numPages >= 2);
      } finally {
        await task.destroy();
      }
      await page.getByText(/PDF pages: [2-9]/).waitFor();
    }
  }
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export text only", exact: true })
    .click();
  const file = await pending,
    zip = await JSZip.loadAsync(await fs.readFile((await file.path())!));
  assert.equal(
    (await zip.file("word/document.xml")!.async("string")).includes(
      "<w:drawing>",
    ),
    false,
  );
  await page
    .getByRole("button", { name: "Check renamed heading", exact: true })
    .click();
  await page.getByText(/A section image lost its heading/).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: article image preview, ordered main/section DOCX images/captions, supported layout/header/margins, multipage PDF count, optional text-only export and missing-heading guard",
  );
} finally {
  await browser.close();
}
