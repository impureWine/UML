import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve('docs');
const assets=path.join(dir,'report-assets');
fs.mkdirSync(assets,{recursive:true});
const images=[
 ['dd4a3013-bf79-4cfa-b9d0-21a37b952851','use-case.png'],
 ['43587bfc-6292-4663-bb13-36c1251773bd','class-diagram.png'],
 ['257f33da-a0fc-44f5-bd12-70b9be6414d0','login.png'],
 ['f5ac6008-91bf-4f88-bdfc-4f2caeb948b6','home.png'],
 ['05360422-374d-44f4-aa73-a5e2939ac8cf','character-selection.png'],
 ['572b4ad3-fa2f-4ba3-9a54-a3d6c6d30c08','card-draft.png'],
 ['1be1db5b-5776-4c51-9010-4aff4f7b859b','preparation.png'],
 ['8532fdeb-4170-4395-9e59-98490faca6b0','battle.png'],
 ['13474d2c-d7c1-4a75-a06e-bac013fa0665','victory.png'],
];
for(const [id,name] of images) fs.copyFileSync(path.join('C:/Users/Zhang/AppData/Local/Temp',`codex-clipboard-${id}.png`),path.join(assets,name));
const file=path.join(dir,'项目报告-40阶登山博弈.md');
let md=fs.readFileSync(file,'utf8');
const section=`### 1.4 实机运行截图

以下7张截图由项目开发者提供，依次展示登录、首页、角色选择、交替取牌、开局准备、回合对战与登顶结算，呈现从进入系统到完成对局的主要使用路径。

![账号登录界面](report-assets/login.png)

图1　账号登录：输入本地用户名和密码进入系统，也可切换至注册页创建账号。

![项目首页与账号档案](report-assets/home.png)

图2　项目首页：展示本地双人、AI和联机对战入口，以及账号战绩、已解锁角色和最近对局；顶部提供账号切换与音乐控制。

![角色选择与AI配置](report-assets/character-selection.png)

图3　角色选择：P1选择瓦沙嘉，P2手动指定融合角色；界面同时展示角色被动、主动能力及AI难度配置，便于开局前比较策略。

![交替取牌界面](report-assets/card-draft.png)

图4　交替取牌：公共区显示牌库总数和各花色余量，当前玩家通过图片或快捷键取牌；双方各取满30张后进入准备阶段。

![唯一开局准备与资源兑换](report-assets/preparation.png)

图5　唯一开局准备：按花色展示本人手牌，提供牌雷兑换、布雷、撤回和地图定位操作；截图中已布置3枚炸弹，位置为6、17和32阶。

![回合对战与立体天梯](report-assets/battle.png)

图6　回合对战：左侧为当前回合与角色专属技能，中间为0～40阶立体天梯，右侧记录技能压制和本回合事件；截图展示第1回合技能选择阶段。

![登顶胜利与战绩保存](report-assets/victory.png)

图7　登顶结算：P1到达40阶，P2位于5阶，页面显示胜利角色和战绩保存结果，并提供再来一局、重新选角和返回首页入口。

`;
md=md.replace(/### 1\.4 [\s\S]*?(?=## 2 AI开发过程)/,section);
const usecase=`用例图从参与者与目标组织功能：未登录使用者完成注册与登录，账号使用者查看资料、选择模式或进入联机房间，对局玩家执行选角、准备、技能、出牌及结果查看。

![40阶登山博弈系统用例图](report-assets/use-case.png)

图8　系统用例图：系统边界内按“账号与对战入口”和“对局核心操作”归纳主要用例，连线表示参与者与用例的关联。

`;
md=md.replace('### 2.2 系统分析：识别主要对象及职责',usecase+'### 2.2 系统分析：识别主要对象及职责');
const classes=`核心类之间的关系如下图所示。Game组织两名玩家、公共牌库和棋盘，Player关联角色与手牌，Character组合技能组件，棋盘管理场上炸弹；账号管理和联机管理分别承担持久化与通信职责。图中采用中文概括主要属性和操作。

![40阶登山博弈核心类图](report-assets/class-diagram.png)

图9　核心类图：展示对局管理、玩家、牌库、棋盘、角色、技能组件及规则裁决的主要关联；实心菱形表示组合，箭头表示关联，虚线箭头表示依赖。

`;
md=md.replace('### 2.3 系统设计：模块划分与状态驱动',classes+'### 2.3 系统设计：模块划分与状态驱动');
md=md.replace('原有UML材料包括用例图01-usecasediagram.puml、类图02-classdiagram.puml和网络图11-network.puml。它们保留需求与设计阶段的分析；本报告的模块说明以当前代码为依据。','图8和图9采用开发者提供的用例图与核心类图。项目同时保留01-usecasediagram.puml、02-classdiagram.puml和11-network.puml作为需求与设计阶段的详细材料；本报告的模块说明以当前代码为依据。');
md=md.replace('| docs/acceptance/及assets/ | 早期人工检查、浏览器证据及截图 |','| docs/report-assets/ | 本报告采用的7张实机截图、用例图和核心类图 |\n| docs/acceptance/及assets/ | 早期人工检查与浏览器证据 |');
fs.writeFileSync(file,md);
console.log('已保存9张原图并更新报告正文与图注。');
