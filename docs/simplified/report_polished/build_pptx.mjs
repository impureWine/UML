import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from 'file:///C:/Users/Zhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const model=JSON.parse(await fs.readFile(path.join(root,'figure-model.json'),'utf8'));
const p=Presentation.create({slideSize:{width:model.width,height:model.height}});
const slide=p.slides.add();slide.background.fill='#FFFFFF';
for(const o of model.ops){
  if(o.kind==='line'){
    const dx=o.b[0]-o.a[0],dy=o.b[1]-o.a[1];
    const length=Math.hypot(dx,dy);
    slide.shapes.add({name:o.name,geometry:'line',position:{left:(o.a[0]+o.b[0]-length)/2,top:(o.a[1]+o.b[1])/2,width:length,height:0,rotation:Math.atan2(dy,dx)*180/Math.PI},fill:'none',line:{fill:o.color,width:o.lw}});
  }else{
    const t=o.kind==='text';
    const s=slide.shapes.add({name:o.name,geometry:t?'textbox':o.kind,position:{left:o.x,top:o.y,width:o.w,height:o.h},fill:t?'none':o.fill,line:{fill:t?'none':o.stroke,width:t?0:o.lw}});
    if(t){s.text=o.text;s.text.style={typeface:'Microsoft YaHei',fontSize:o.size,color:o.color,bold:o.bold,alignment:'center',verticalAlignment:'middle',insets:{left:0,right:0,top:0,bottom:0}};}
  }
}
const build=path.join(root,'.build');await fs.mkdir(build,{recursive:true});
const candidate=path.join(build,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
try{const b=await p.export({slide,format:'png',scale:3.125});await fs.writeFile(path.join(build,'artifact-preview.png'),new Uint8Array(await b.arrayBuffer()));}catch(e){console.log('Preview export: '+e.message);}
console.log(candidate);
