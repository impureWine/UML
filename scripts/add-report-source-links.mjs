import fs from 'node:fs';
const file='docs/项目报告-40阶登山博弈.md';let md=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
const blob=p=>`[${p}](https://github.com/impureWine/UML/blob/main/${p})`;
const tree=p=>`[${p}/](https://github.com/impureWine/UML/tree/main/${p})`;
const note=(scope,paths,dirs=[])=>`本节简要说明${scope}。完整材料与源文件位于GitHub仓库的${paths.map(blob).concat(dirs.map(tree)).join('、')}。\n\n`;
const add=(heading,text)=>{const key=heading+'\n\n';if(!md.includes(key))throw new Error(heading);md=md.replace(key,key+text);};
add('### 1.2 已实现的功能',note('各功能的用途及对应模块',['src/main.js','src/controller/Game.js'],['src/model','src/view','src/utils','src/audio']));
add('### 1.3 核心玩法',note('取牌、准备、回合结算与终局规则',['docs/01-requirements.md','src/model/JudgeRule.js','src/controller/Game.js']));
add('### 2.1 需求分析：先确定规则与验收结果',note('需求形成过程与主要验收条件',['docs/01-requirements.md','docs/01-usecasediagram.puml']));
add('### 2.2 系统分析：识别主要对象及职责',note('核心对象、职责和关系',['docs/02-analysis.md','docs/02-classdiagram.puml']));
add('### 2.3 系统设计：模块划分与状态驱动',note('模块划分、状态流转与接口协作',['docs/03-design.md','docs/11-network.puml'],['src']));
add('### 2.4 分轮生成与交付',note('各轮任务与阶段产出',['docs/04-plan.md','docs/PROGRESS.md'])+`逐轮实现、修改文件和验收清单位于${[1,2,3,4,5,6,7,9,10,11].map(i=>blob(`docs/05-process${i}.md`)).join('、')}。\n\n`);
add('### 2.5 代表性AI交互','本节选取真实交互截图概述开发与修改过程，截图下方按主题列出对应的完整过程记录和实现文件；这些链接用于查看相关产出。\n\n');
const examples=[
 ['**实例一：地图搭建与视觉迭代**',['docs/05-process2.md','src/view/MountainMapRenderer.js','src/view/BackgroundTransition.js']],
 ['**实例二：开局流程与选牌交互**',['docs/05-process4.md','src/view/OpeningPanel.js','src/model/CardDeck.js']],
 ['**实例三：角色技能与回合反馈**',['docs/05-process7.md','src/model/SkillComponent.js','src/view/CharacterSkillDetails.js','src/view/BattlePanel.js']],
 ['**实例四：音乐系统与播放器修正**',['docs/05-process9.md','src/audio/GenshinAudioManager.js','src/view/MusicPlayer.js']],
 ['**实例五：跨设备联机与交互稳定性**',['docs/05-process11.md','server.js','src/utils/NetworkManager.js','src/view/PreparationPanel.js']],
];
for(const [h,paths] of examples)add(h,'本组案例简述任务与反馈；完整过程和对应代码：'+paths.map(blob).join('、')+'。\n\n');
add('### 3.1 测试组织',note('人工测试路径和阶段验收方式',['docs/acceptance/iteration-01.md','docs/acceptance/iteration-02.md','docs/05-process3.md','docs/05-process6.md']));
add('### 3.2 典型问题闭环',note('典型问题的原因、修改和验证结果',['docs/05-process3.md','docs/05-process6.md','docs/05-process10.md','docs/05-process11.md'],['tests/unit']));
add('### 3.3 本次报告整理时的验证',`本节汇总自动测试结果。测试源码见GitHub的${tree('tests/unit')}，启动命令见${blob('package.json')}；仓库已有的阶段日志包括${['network-stability-test-results.txt','skills-fix-test-results.txt','waiting-condition-test-results.txt'].map(blob).join('、')}。本次报告整理生成的report-test-results-20261102.txt、report-build-results-20261102.txt，以及本地deployment-validation-20261102.txt，目前未见于已核对的main分支，作为本地附件保存。\n\n`);
add('### 3.4 后续人工复验的具体路径',note('最新版本需继续执行的人工复验场景',['docs/05-process11.md','docs/06-deployment.md']));
add('## 附录A 运行与检查',note('本地启动与检查命令',['docs/06-deployment.md','package.json','server.js']));
const before='| 材料 | 用途 |';
const start=md.indexOf(before,md.indexOf('## 附录B'));
const end=md.indexOf('\n\n',start);
if(start<0||end<0)throw new Error('证据索引表未找到');
const rows=[
 [blob('docs/01-requirements.md'),'完整需求、业务规则、功能与验收编号'],
 [blob('docs/01-usecasediagram.puml'),'详细用例图源文件'],
 [blob('docs/02-analysis.md'),'完整对象分析与需求对应关系'],
 [blob('docs/02-classdiagram.puml'),'详细类图源文件'],
 [blob('docs/03-design.md'),'模块、类、接口和关键流程设计'],
 [blob('docs/04-plan.md')+'、'+blob('docs/PROGRESS.md'),'分轮开发计划和历史进度'],
 [tree('docs'),'05-process系列逐轮过程文档与验收说明'],
 [blob('docs/11-network.puml')+'、'+blob('docs/06-deployment.md'),'网络结构图源文件与部署说明'],
 [tree('src')+'、'+blob('server.js'),'前端业务、模型、界面、音频与服务端源码'],
 [tree('tests/unit')+'、'+tree('tests/fixtures'),'自动测试源码与人工检查夹具'],
 [tree('docs/acceptance'),'早期验收记录及原有截图'],
 [blob('network-stability-test-results.txt')+'、'+blob('waiting-condition-test-results.txt'),'仓库已保存的阶段测试输出'],
 ['本地docs/report-assets/','本报告使用的36张图片；尚未上传至已核对的main分支'],
 ['本地report-test-results-20261102.txt、report-build-results-20261102.txt','本次报告整理时的测试与构建输出；尚未上传至已核对的main分支'],
 ['本地deployment-validation-20261102.txt','既有本地验证记录；尚未上传至已核对的main分支'],
];
md=md.slice(0,start)+'| 源文件位置 | 完整内容与用途 |\n| --- | --- |\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+md.slice(end);
md=md.replace('## 附录B 证据索引与材料口径','## 附录B GitHub源文件与证据索引');
md=md.replace('姓名、学号、班级由提交者补齐。','GitHub链接按公开仓库main分支核对，正文各处的文件名均可点击打开；本地新增附件单独标注。姓名、学号、班级由提交者补齐。');
fs.writeFileSync(file,md);console.log('已在概述章节及5组案例中插入具体源文件链接，并更新附录索引。');
