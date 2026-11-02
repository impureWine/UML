import fs from 'node:fs';
const file='docs/项目报告-40阶登山博弈.md';
let md=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
const start=md.indexOf('### 2.1 从概念到实现：真实AI交互记录');
const end=md.indexOf('### 2.2 需求分析',start);
if(start<0||end<0)throw new Error('未找到待整合的交互记录章节');
const story=md.slice(start,end);
const blocks=story.split(/(?=\*\*第[一二三四五六七八]步：)/).slice(1);
if(blocks.length!==8)throw new Error('交互记录数量不符');
md=md.slice(0,start)+md.slice(end);
// 需求分析：流程约定、初稿、规则裁决、角色扩展，紧接需求分析标题。
const req='### 2.2 需求分析：先确定规则与验收结果\n\n';
md=md.replace(req,req+'需求分析通过流程约定、初稿生成、规则裁决和角色扩展逐步确定实现范围。以下交互截图记录了需求形成过程，随后汇总确认后的主要需求与用例。\n\n'+blocks.slice(0,4).join(''));
// 系统分析：对象识别及人工审阅，再接对象职责表和类图。
const analysis='### 2.3 系统分析：识别主要对象及职责\n\n';
md=md.replace(analysis,analysis+'需求确认后，系统分析先识别核心对象，再通过人工审阅明确资源边界和技能规则。下列交互展示对象职责与关系如何形成。\n\n'+blocks.slice(4,6).join(''));
const design='### 2.4 系统设计：模块划分与状态驱动\n\n';
md=md.replace(design,design+'系统设计把已经确认的对象关系落实为模块划分、类接口与状态流转，并据此组织可独立验证的开发任务。\n\n'+blocks[6]);
md=md.replace('### 2.5 分轮生成与交付',blocks[7]+'### 2.5 分轮生成与交付');
md=md.replaceAll('前文图8至图15展示了真实分析、设计与任务拆分交互。','前文需求分析、系统分析与系统设计章节已结合真实交互截图展示任务推进过程。');
md=md.replaceAll('图8至图15为开发者提供的真实交互截图；','各分析与设计章节中的8张交互截图由开发者提供；');
const map={12:13,13:14,14:16,15:17,16:12,17:15};
md=md.replace(/图(\d+)/g,(s,n)=>map[n]?`图${map[n]}`:s);
md=md.replace(/### 2\.([2-6]) /g,(_,n)=>`### 2.${Number(n)-1} `);
fs.writeFileSync(file,md);
console.log('已将8张交互图整合至三个对应章节，并更新章节、图号及引用。');
