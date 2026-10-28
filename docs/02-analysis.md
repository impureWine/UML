# 《40阶登山博弈游戏》系统分析说明书

| 文档属性 | 内容 |
| --- | --- |
| 版本 | v1.0（规则勘误修订） |
| 依据 | 已确认的[《需求分析说明书》v1.1](01-requirements.md)；FR-01～FR-76、CH-01～CH-13与NFR-01～NFR-07，以及2026-10-28本轮用户规则裁决 |
| 日期 | 2026-10-28（Asia/Hong_Kong） |
| 所属阶段 | 第二阶段：系统分析 |
| 状态 | 分析架构已获用户认可；按本轮裁决修正规则，仍属第二阶段 |
| 配套类图 | [02-classdiagram.puml](02-classdiagram.puml) |

## 1. 分析范围与约束

本说明将已确认需求转化为对象职责、对象关系、核心状态流及需求追踪关系。对象命名及特别要求以需求确认内容为准；补充的 AccountProfile、MatchRecord、PlayingCard、Bomb、CardLedger、BattleLog、RoomSession、RoundSnapshot 是表达已有账号、牌/雷、历史、日志、房间和回溯需求所需的支持对象，不代表新增用户功能。

本次按用户最新裁决修正单向出牌的获胜/连胜判定及纳贝里士抽牌余量边界。现有需求文档第3.4、3.11、3.12节及相关FR/AC仍保留相反的旧口径；本说明涉及这两点时以本轮裁决为准，其余沿用已确认需求。此次不改写需求原文；保留原FR编号用于追踪，不表示对应需求条款及验收条目已同步改写。

本阶段不规定程序语言、具体接口签名、文件结构、LocalStorage 键值结构、联机通信方案或 AI 算法，不编写程序代码，不安装依赖。类图中的属性及操作名称是分析层的状态与职责说明，不是程序接口定义。Three.js 与精细分层骨骼 Canvas/SVG、浏览器端通信方式等继续保留需求文档中已确认的选择边界。

业务状态与展示权限分开分析：玩家对象需要保存自身牌、雷库存、位置和技能状态；界面和日志只显示规则许可的公开信息或当前技能授权的信息。AI 只能依据自身合法信息、公开信息和当次技能合法返回的信息行动。

## 2. 系统对象概览

### 2.1 业务与控制对象

| 对象 | 类型 | 核心职责与分析边界 |
| --- | --- | --- |
| AccountManager | 业务控制对象 | 管理本地多账号注册、登录、退出和首页切号；以当前登录账号为存档归属，装载/保存其已完成战绩、设置及角色解锁状态；处理融合角色正常解锁和需求允许的测试解锁/重置。Guest_P2 与 AI 不创建独立账号档案。 |
| Game | 对局控制对象 | 维护一局的阶段、模式、回合号、P1/P2席位及流程状态，严格协调登录后进入选角、抛硬币、交替选牌、唯一开局准备、循环出牌、回溯窗口和终局确认；衔接 Player、CardDeck、MountainBoard、JudgeRule、NetworkManager；只在结果最终确认后交由 AccountManager 记账。 |
| MountainBoard | 领域数据对象 | 表示固定的第0～40阶路径和地图区域数据；提供按阶访问 StepCell 的语义，不判断胜负、不负责3D绘制。 |
| StepCell | 领域数据对象 | 表示单个阶位、其地形分区及多枚炸弹队列状态（bombQueue）。地图共41个阶位；炸弹只能布置在1～39阶；同阶可容纳多枚炸弹。队列表示待处理的场上雷；单次落脚选哪枚由 JudgeRule 的既定优先规则决定，不额外规定同归属雷的先进先出顺序。 |
| CardDeck | 领域对象 | 维护90张公共实体牌的剩余集合及剩余花色计数；支持交替初选、规则许可的等概率不放回抽取和公开计数。准备结束后的花色分项公开时点由 Game 控制。 |
| Player | 玩家领域对象 | 表示P1或P2席位及其当局状态，包括当前位置、手牌、未布置炸弹库存、已选角色、准备/技能/出牌锁定状态。本人私有数据不等于对手界面可见数据；公开/私有展示由授权边界控制。 |
| AIPlayer | 玩家特化对象 | 继承 Player 的席位、手牌、雷及角色状态，增加简单/困难难度和AI参赛角色选择。不得读取对手手牌内存、未布置库存炸弹或未授权暗雷坐标；不能绕过角色技能次数、目标及压制规则。 |
| Character | 角色领域对象 | 表示本局参赛角色、其身份/元素和该角色实例拥有的技能组件。角色是否已解锁归属于当前账号的 AccountManager/AccountProfile 状态；Character 本身不持久化账号解锁结果。 |
| SkillComponent | 技能领域组件基类 | 表示角色的主动或被动能力及局内状态，至少含 sourceOrigin（能力来源标识）与 isSuppressed（是否被压制）；具体实现由主动/被动技能组件特化。组件统一检查来源压制、剩余次数和需求中声明的使用条件。 |
| JudgeRule | 业务规则对象 | 按需求裁决猜拳胜负、基础及角色修正步数、冻结牌约束、单向出牌、落脚选雷、免疫/焚毁、退格与连锁爆炸、登顶/耗尽胜负。它返回规则结果，不负责流程阶段推进、账号记账或界面动画。 |
| NetworkManager | 联机控制对象 | 管理联机房间码、P1房主/P2加入者、两席限制、就绪、房间有效期、步骤倒计时、超时代操作、退出结果及双方状态同步。通信底层保持需求规定的可选范围，本阶段不选定实现方式。 |
| Settings | 账号设置值对象 | 保存每账号的BGM/SFX音量与静音、单曲循环/自动切歌偏好和镜头跟随等需求指定设置；由 AccountManager 按当前账号持久化，供渲染器与音频管理器读取。当局手动锁曲和已达音乐区间由 GenshinAudioManager 管理，并按新局规则重置。 |

### 2.2 可视化、角色模型与音频对象

| 对象 | 类型 | 核心职责与分析边界 |
| --- | --- | --- |
| MountainMapRenderer | 表现对象 | 将 MountainBoard、双方合法可见的 Player 状态呈现为0～40阶天梯地图；处理台阶高亮、视角跟随/手动聚焦、立体站位和攀爬移动表现。沿用指定对象名，视觉采用已确认FR-12的笔直天梯与三段地貌，原盘山要求已被取代。不得自行改变位置、雷状态或游戏规则，也不得渲染未经授权的敌方暗雷信息。 |
| CharacterModel3D | 模型与动画表现对象 | 按角色规格构建程序化立体角色表现并控制待机、攀爬、跳跃、回退、登顶和技能动作/特效。技术路线遵循需求限定的 Three.js/WebGL 或精细分层骨骼 Canvas/SVG；模型不决定角色技能结果。 |
| GenshinAudioManager | 音频表现对象 | 生成/播放需求指定的六首BGM及交互音效，读取 Game 场景和领先阶数执行自动曲目映射、1.5秒淡变；响应 Settings、手动锁曲/恢复自动、静音/音量、首次用户手势恢复播放及可选本地MP3失败回退。音频不改变对局状态。 |

### 2.3 由需求直接抽取的支持对象

| 对象 | 来源与职责 |
| --- | --- |
| AccountProfile | 对应单个本地账号，承载账号标识、汇总战绩、已解锁角色、Settings及最近 MatchRecord。作为 AccountManager 的档案对象，体现同源 LocalStorage 的账号隔离边界。 |
| MatchRecord | 已确认终局的历史条目，记录模式、主账号视角结果、双方角色、双方最终阶数和结束时间戳；Guest_P2/AI不单独建档。 |
| PlayingCard | 公共牌库中的单张实体牌，含唯一局内身份与石头/剪刀/布花色；在牌库、玩家手牌、待揭示、公开出牌历史或秘密销毁区之间转移，不复制。 |
| Bomb | 单枚场上炸弹，至少保留所有者和所在阶位关联；空间移动不改变所有者，爆炸/焚毁后移出场上并按规则更新总量。 |
| CardLedger | 记录牌的当前分区及转移，区分公共牌库、双方手牌/待揭示牌、公开出牌历史、秘密销毁区；支持资源守恒和回溯恢复要求。它不决定哪些对手信息可显示。 |
| BattleLog | 记录按规则可以公开的牌、移动、炸弹归属、技能公开结果及回溯撤销标记；排除秘密销毁/随机弃牌花色、侦测私情报和未经授权的暗雷坐标。 |
| RoomSession | 联机房间的状态对象，承载房间码、两席占用、就绪状态、房间有效/解散状态及需求指定的等待时间边界；由 NetworkManager 管理。 |
| RoundSnapshot | 当轮技能操作前的内存回溯锚点，承载需求3.11.3规定的双方位置、牌/雷、公共库、有效账本及普通技能状态。所有已消耗时间回溯次数和已经合法获知信息的事实不由快照恢复；不持久化为未完局存档。 |

## 3. 关键对象职责与协作边界

### 3.1 账号、档案与已完成结果

AccountManager 验证本地账号使用流程并确定当前主账号。开始一局时，Game 读取当前账号标识用于归属；本地双人由主账号固定占P1、Guest_P2占P2，AI模式由主账号玩家对 AIPlayer，联机各客户端仅记录自己的主账号。Game 将已确认且未被回溯撤销的 MatchRecord 交给 AccountManager；候选胜利、中途作废局和未确认结果不写入统计或角色解锁。

AccountProfile 聚合某账号的设置、已解锁角色、胜负平汇总和最近对局记录。AccountManager 负责账号隔离与持久化动作，Settings、MatchRecord只表达相应数据，不自行读写其他账号档案。隐藏融合角色解锁条件由 Game 的角色与终局结果交给 AccountManager 核验；测试开关只改当前账号的解锁状态，不伪造比赛记录。

### 3.2 一局的流程控制

Game 管理以下状态流，不让地图渲染、音频或规则对象自行跳转阶段：

未登录/登录 → 首页与模式选择 →（联机时创建/加入房间、双方就绪）→ 选角 → 抛硬币 → 一人一张交替选牌 → 唯一开局准备 → 回合技能选择/操作 → 选牌并锁定 → 同时亮牌与规则结算 → 本轮结果/可用回溯 → 下一回合或终局确认 → 保存已确认结果 → 返回首页。

| 当前状态 | 进入条件或事件 | 负责协作对象 | 下一状态与约束 |
| --- | --- | --- | --- |
| 登录/首页 | 首次打开未登录；登录成功后显示首页 | AccountManager、Settings、GenshinAudioManager | 账号登录成功后可进入首页；账号切换/退出限于首页。 |
| 联机等待（仅联机） | 创建或加入有效房间 | NetworkManager、RoomSession、Player | 房间至多两席；各自就绪后进入选角；闲置超时/房主离开导致房间失效。 |
| 选角 | 对局席位已确定 | Game、Player、Character、AccountManager | 两方确定合法角色后进入抛硬币；融合角色受当前账号解锁状态限制；AI可由玩家指定角色。 |
| 抛硬币 | 本局角色已确定 | Game、Player | 结果为公平正反各50%，决定初选先后手，不决定猜拳优势；进入交替选牌。 |
| 交替选牌 | 硬币结果已公布 | CardDeck、Player、NetworkManager | 每步仅当前方取一张，双方各30张后结束；可按规则使用快速随机补齐；公共牌库剩30张。 |
| 唯一开局准备 | 双方已拿满初始手牌 | Player、CardDeck、StepCell、Bomb、SkillComponent | 只在首回合之前开放普通兑换/布雷；玩家按本地交接或各自锁定规则确认。双方锁定后一次性公开规定的牌库分项与手牌总数。 |
| 回合技能选择/操作 | 已进入某回合的打出牌界面 | Game、Player、Character、SkillComponent、NetworkManager | 双方先完成出牌前主动技能选择/操作确认；有效技能按角色规则改变状态。伊斯塔露只在本轮结算展示区操作。 |
| 选牌与锁定 | 本轮前置技能操作结束 | Player、CardDeck、SkillComponent、NetworkManager | 冰冻牌型限制在锁牌前生效；锁牌后不可改选。需出牌方全部锁定后才统一亮牌；末张锁定仍参与当前回合。 |
| 同时亮牌/结算 | 应出牌玩家均已锁定；若技能操作后双方均无牌，则跳过选牌锁定进入本轮结算 | Game、JudgeRule、Player、CardDeck、MountainBoard、StepCell、Bomb、CardLedger、BattleLog | 规则对象处理猜拳/单向推进、移动、选雷、回退连锁、角色效果和资源变更；原地不动不检查脚下雷。双方均无牌时仍衔接本轮结果/回溯及耗尽确认，不等待无法提交的出牌。 |
| 本轮结果/回溯 | 当前回合效果已完成 | Game、SkillComponent、RoundSnapshot、Player、CardLedger、MountainBoard、JudgeRule | 若具备合法时间技能，允许撤销本轮候选登顶/耗尽；回溯成功返回同一回合技能操作前重新进行，不推进到下一回合，已消耗的时间次数不恢复。放弃/联机超时/无可用回溯时，确认终局或进入下一回合。 |
| 终局确认 | 登顶或双方耗尽比高已满足，且本轮回溯机会结束 | Game、AccountManager、MatchRecord、BattleLog | 确认后才保存一次战绩/符合条件的解锁；联机退出判胜遵循需求指定的例外规则。 |
| 中断/作废 | 本地/AI按要求确认退出或重开，或刷新中断 | Game、NetworkManager、AccountManager | 本地/AI未完局作废且不计战绩/解锁；联机离开/断线按留存方胜规则处理；不恢复未完局。 |

联机步骤倒计时与代操作由 NetworkManager 和 Game 协同执行需求中规定的45秒/15秒规则；不向本地/AI新增倒计时。重开和中断的二次确认由 Game 按模式处理。表内状态名是对既有业务步骤的命名，不增加用户操作或业务功能。

### 3.3 棋盘、炸弹与落脚结算

MountainBoard 包含第0～40阶；StepCell 保存阶数和林地/冰阶/天空岛地形分段，并以 bombQueue 关联多枚 Bomb。0阶及40阶不允许布雷；同阶可有多枚。Bomb 始终关联其所有者 Player。准备撤回/空间移动均不得丢失所有者，炸毁后从有效场上队列移除。

Game 在需要结算移动时向 JudgeRule 提供本轮玩家、出牌结果、角色/技能状态及当前棋盘数据。JudgeRule 依据需求决定前进步数及落点，按规则选中至多一枚炸弹，执行焚毁/免疫/正常爆炸优先级、后退和新落点连锁；必要时对当前状态产生移动、牌耗或候选终局结果。JudgeRule 不更新 UI；MountainMapRenderer 只呈现变更后的合法可见状态。

### 3.4 手牌、公共牌库及公开/秘密记录

CardDeck 初始有石头、剪刀、布各30张。交替初选和后续抽牌都移动已存在 PlayingCard，不生成重复实体；等概率、不放回规则属于 CardDeck 行为约束。Game 决定何时显示总数或花色分项，尤其是选牌和准备期间仅显示公共牌库总数，双方准备锁定后才首次统一显示各花色余量和双方手牌总数。

普通“1库存雷换2牌”要求公共牌库至少2张，不足时拒绝且不扣雷。未受压制的 LifeExchangeBonus 将准备阶段兑换收益提高至多3张，但仍须满足至少2张的基础兑换门槛：库余2张时消耗1个库存雷抽尽2张，至少3张时消耗1个库存雷抽3张；库余0或1张时拒绝且不扣雷。该规则同样适用于融合角色的纳贝里士来源组件；受瓦沙嘉压制后恢复普通换2规则。

未受压制的 LifeReplenish 在可用手牌0～9张、技能仍有次数且公共库非空时，可随机不放回抽取至多3张：库余1张抽1、余2张抽2、至少3张抽3；成功抽取即消耗本局1次额度，空库拒绝且不扣次数。Game 与技能组件检查资格和本次实际应得数量，CardDeck 执行实体牌转移，CardLedger 按实际抽得张数记账；不得补造不足的牌。

| 公共牌库余量 | 普通库存雷换牌（含生命被动受压制时） | LifeExchangeBonus 有效时 | LifeReplenish 有效且满足手牌/次数条件时 |
| --- | --- | --- | --- |
| 0张 | 拒绝，不扣雷 | 拒绝，不扣雷 | 拒绝，不扣次数 |
| 1张 | 拒绝，不扣雷 | 拒绝，不扣雷 | 抽1张，消耗1次 |
| 2张 | 消耗1库存雷，抽2张 | 消耗1库存雷，抽2张 | 抽2张，消耗1次 |
| 至少3张 | 消耗1库存雷，抽2张 | 消耗1库存雷，抽3张 | 抽3张，消耗1次 |

Player 保存自己的可用手牌和锁定待揭示牌。CardLedger区分公共牌库、可用手牌、待揭示牌、公开出牌历史和秘密销毁区；准备换雷牌、技能耗牌及雷炸弃牌进入秘密销毁区，不混入公开出牌记录。仅实际统一亮出的牌进入有效公开历史。炼金转化只改变牌的花色；回溯撤销时按需求恢复相应牌分区与账本，不复制或丢失实体牌。

BattleLog 只接收规则许可的公开事件。布耶尔侦测结果、阿斯莫代移雷窗口中施法者自己的雷坐标、玩家的私有手牌/库存及暗选牌不因技能/日志而广播给对手；技能授权信息只在其合法界面向施法者显示。常规UI信息隔离是验收边界，不承担防御浏览器开发者工具或恶意旁观。

### 3.5 角色、技能组合与压制

每名 Player 选角完成后在本局关联一个 Character 实例。Character 组合持有 SkillComponent 列表；ActiveSkillComponent 和 PassiveSkillComponent 为两类抽象组件，具体技能类从中派生。组件含需求特别指定的 sourceOrigin 和 isSuppressed，并保留每局次数或被动触发状态。每位玩家的组件状态独立，双方选择同一角色时不共用技能次数或触发标记。技能能否使用还取决于角色、对局阶段、目标、资源、使用条件和剩余次数；Game 安排时序，技能组件表达自身能力，JudgeRule结算其对移动/踩雷结果的影响。

“莱茵多特/纳贝里士”融合角色不是单一技能整体，而是由“黄金”莱茵多特来源和纳贝里士来源的多项主动/被动 SkillComponent 组合而成。瓦沙嘉面对纳贝里士或融合角色时，只将目标角色上 sourceOrigin 为纳贝里士的组件标记为 isSuppressed；黄金来源的组件仍可生效。因而压制精确作用于能力来源，不会误禁融合角色的莱茵多特能力，也不会把角色整体设为不可操作。AI与人类使用同一压制和次数规则。

组合关系的整体是 Character，组成部分是 SkillComponent。融合角色复用两种来源的组件类型，并为本局建立各自实例，不通过对两个 Character 类的多重继承获得能力。sourceOrigin 标记原始能力来源，不因持有者为融合角色而变成“融合来源”；被压制的技能不能参与初始化收益、准备兑换修正、主动施放或被动结算，压制本身不消耗目标主动次数。

当即时技能结束后对手仍无牌、本人单向出牌时，JudgeRule 将本人的当轮推进视为获胜，供获胜步数加成与 FlameWinStreak 连胜判定使用。WindScissorsBonus 的剪刀+2、RockVictoryBonus 的石头+1、WaterVictoryBonus 的布+2同样适用，分别为4、6、5步。FlameWinStreak 将单向获胜计入连续胜场，第2胜及以后正常额外+2并焚毁本次落脚选中的1枚雷；平局或失败中断连胜。WaterDefeatDraw 仍仅在实际失利时摸牌，不因单向获胜触发。

| 具体技能类 | 类别 | sourceOrigin | 依据及主要局内状态/责任 |
| --- | --- | --- | --- |
| WindScissorsBonus | 被动 | BARBATOS | FR-58；剪刀获胜额外+2，共4步，含单向出牌。 |
| WindFirstBombGrace | 被动 | BARBATOS | FR-58；本局首次踩雷免退标记，炸弹仍销毁，保留需求指定的雷弃牌交互。 |
| RockVictoryBonus | 被动 | MORAX | FR-59；石头获胜额外+1，共6步，含单向出牌。 |
| JadeShield | 主动 | MORAX | FR-59；每局1次；剩余有效回合数，含当轮2回合，免疫炸弹及平局+1。 |
| ThunderBombCapacity | 被动 | BEELZEBUL | FR-60；初始4雷、总上限5。 |
| ThunderBombDiscard | 被动 | BEELZEBUL | FR-60；按引爆雷的所有者识别附加弃牌；无牌/焚毁/免疫按已确认规则处理。 |
| NatureRecon | 主动 | BUER | FR-61；每局2次；前方10格雷位和对手最多一种牌型仅向施法者返回时点情报。 |
| WaterVictoryBonus | 被动 | FOCALORS | FR-62；布获胜额外+2，共5步，含单向出牌。 |
| WaterDefeatDraw | 主动 | FOCALORS | FR-62；每局2次；本轮激活标记，真实败局摸1及库空边界。 |
| FlameWinStreak | 被动 | HEBRIMU | FR-63；连胜状态包含单向出牌获胜，第2胜起额外+2与焚毁；平局或失败中断连胜。 |
| FreezeCard | 主动 | VASHAKA | FR-64；每局1次；本轮冻结牌型，合法出牌约束及仅剩冻牌时的基础步数修正。 |
| DivineSuppression | 被动 | VASHAKA | FR-64、FR-70；开局先识别并持续压制对方全部 NABERIUS 来源组件；不压制黄金来源。 |
| TimeRewind | 主动 | ISTAROTH | FR-65、FR-76；每局1次；仅本轮结算展示区启用，通过 RoundSnapshot 撤销本轮；所有已消耗时间次数不恢复。 |
| SpaceOperation | 主动 | ASMODAY | FR-66；移己方雷/换位共享每局2次，保留坐标首次展示的暂扣与明确取消返还状态；两个分支各自检查合法条件，不因移雷分支不可用而禁用合法换位。 |
| DeathRetreat | 被动 | RONOVA | FR-67；使对手实际爆炸退格变13，最低0，与雷所有者无关。 |
| DeathCardBomb | 主动 | RONOVA | FR-67；每局1次；指定1牌换雷并立即布置，遵守总雷上限及秘密销毁规则。 |
| LifeExchangeBonus | 被动 | NABERIUS | FR-68；准备1库存雷换至多3牌，公共库至少2张方可兑换；余2抽2、至少3抽3，余0/1拒绝且不扣雷；受压制时回归普通换2。 |
| LifeReplenish | 主动 | NABERIUS | FR-68；每局1次；有效对局内0～9手牌且公共库非空时抽至多3张，库余1～2张则抽尽；空库拒绝且不扣次数，受压制不可用。 |
| GoldenFirstExchangeDiscount | 被动 | GOLD_RHINEDOTTIR | FR-69；准备阶段首次成功牌换雷优惠及已使用标记；失败不消耗。 |
| AlchemyTransmutation | 主动 | GOLD_RHINEDOTTIR | FR-69；每局2次；转化实际持有的1～2张未锁定牌，不改数量或公共库。 |

| 融合角色的组件 | 初始独立次数/状态 | 对阵瓦沙嘉 |
| --- | --- | --- |
| GoldenFirstExchangeDiscount | 首次成功优惠未使用 | isSuppressed=false，继续有效。 |
| AlchemyTransmutation | 2次 | isSuppressed=false，继续有效。 |
| LifeExchangeBonus | 准备兑换至多3张，库余2张抽2张，余0/1拒绝 | isSuppressed=true，使用普通兑换收益2张，公共库不足2张拒绝且不扣雷。 |
| LifeReplenish | 1次 | isSuppressed=true，主动不可用，黄金2次额度不受影响。 |

Game 在开局准备收益计算之前协调 DivineSuppression；在回合中由统一的组件压制状态过滤主动资格与被动效果。不能只把被压制的按钮变灰而仍在后台使用其被动收益。sourceOrigin 的其他枚举值对应上表角色来源，不增加角色或新技能。

### 3.6 联机、设置、地图与音频

NetworkManager 管理 RoomSession 的2席房间生命周期、房间码和就绪状态；在对局中与 Game 同步双方规则所需状态、超时步骤及退出结果。具体采用同机跨标签页通信还是轻量局域网消息，需求保留为选项，系统分析不提前决定。私有数据只由合法席位/技能界面读取，公共状态按需求同步。

Settings 随 AccountProfile 保存。MountainMapRenderer 读取棋盘、玩家位置、镜头选项和经授权的标记，只负责把规则状态显示为需求规定的地图与镜头行为。CharacterModel3D 把已选择角色的外观和动作呈现为实时模型，不管理角色选择/技能结果。GenshinAudioManager 读取 Game 场景、回合和场上最高阶数，按需求映射音乐；爆炸导致领先阶数下降时保持高阶曲目规则，不反向改写 Game 状态。

## 4. 功能需求—对象对应关系

表中“主责对象”表示该对象承担的主要业务责任；“协作对象”表示需要其状态/结果共同完成该需求。FR编号沿用已确认需求文档；单向获胜与生命抽牌边界按第1节记录的本轮裁决解释，需求文档原验收条目尚未同步。

| 功能需求 | 主责对象 | 协作对象 | 对象责任落点 |
| --- | --- | --- | --- |
| FR-01 | AccountManager | AccountProfile | 本地账号注册、唯一标识与输入规则。 |
| FR-02 | AccountManager | Game | 登录模态框、首页账号状态、首页切号/退出和对局期间限制。 |
| FR-03 | AccountManager | AccountProfile、Settings、MatchRecord | 同源本地持久化及账号隔离；不保存未完对局。 |
| FR-04 | Game | AccountManager、NetworkManager、Settings、GenshinAudioManager | 首页状态与模式入口及相关入口展示。 |
| FR-05 | AccountManager | AccountProfile、MatchRecord | 汇总战绩、解锁列表及最近对局记录。 |
| FR-06 | Game | Player、AccountManager | 主账号P1、Guest_P2席位与单账号单份战绩归属。 |
| FR-07 | AIPlayer | Game、Character、SkillComponent、JudgeRule | 难度、指定角色与公开/合法授权信息边界。 |
| FR-08 | NetworkManager | RoomSession、Player | 创建/加入房间码、房主/加入者席位及2席限制。 |
| FR-09 | NetworkManager | RoomSession、Game | 房间拒绝条件、状态、连接反馈与联机结果一致。 |
| FR-10 | Character | SkillComponent、JudgeRule | 角色与规则图鉴数据及技能说明。 |
| FR-11 | Settings | AccountManager、GenshinAudioManager、MountainMapRenderer | 账号设置值、音量/静音与自动镜头选项。 |
| FR-12 | MountainMapRenderer | MountainBoard、StepCell | 41阶地图及各地形区域表现。 |
| FR-13 | MountainMapRenderer | MountainBoard、Player、Settings | 阶梯高亮、自动跟随和手动聚焦，且不展示未授权雷位。 |
| FR-14 | CharacterModel3D | Character、MountainMapRenderer | 实时模型、动作、同阶错位和技能视觉效果。 |
| FR-15 | MountainMapRenderer | Player、SkillComponent、Game | 按住查看己方雷、失焦/交接隐藏及技能授权显示。 |
| FR-16 | GenshinAudioManager | Settings | 六首可用曲及未指定特殊曲角色映射边界。 |
| FR-17 | GenshinAudioManager | Game、Player | 按场景/最高阶映射、过渡及高阶曲不回切规则。 |
| FR-18 | GenshinAudioManager | Settings、AccountManager | 播放器交互、自动/手动切歌和音量静音。 |
| FR-19 | GenshinAudioManager | Game、BattleLog | 音效覆盖和声音不泄露私有操作。 |
| FR-20 | Game | Player、Character、SkillComponent、CardDeck、GenshinAudioManager | 新局初始化双方状态、资源、角色能力及音乐区间。 |
| FR-21 | Game | Player | 公平抛硬币和先选方确定。 |
| FR-22 | CardDeck | Game、Player、PlayingCard | 单张交替初选、数量边界和牌转移。 |
| FR-23 | Game | CardDeck、Player、BattleLog、NetworkManager | 初选/准备阶段花色隐私及总数展示边界。 |
| FR-24 | CardDeck | Game、Player、NetworkManager | 保留已选牌并按规则快速随机补齐。 |
| FR-25 | Game | Player、StepCell、SkillComponent | 唯一普通准备阶段及之后关闭普通准备操作。 |
| FR-26 | Player | MountainBoard、StepCell、Bomb、SkillComponent | 库存加场上雷总上限及角色上限状态。 |
| FR-27 | Game | Player、SkillComponent、CardLedger、PlayingCard | 普通兑换由准备流程协调；黄金组件提供首次优惠，消耗牌进入秘密销毁区。 |
| FR-28 | Game | Player、SkillComponent、CardDeck、CardLedger | 准备兑换只消耗库存雷；普通兑换须公共库至少2张且抽2，生命被动有效时余2抽2、至少3抽3；两种兑换在余0/1时均拒绝且不扣雷。 |
| FR-29 | Game | Player、CardDeck、NetworkManager | 无兑换次数上限及资源/时限边界。 |
| FR-30 | MountainBoard | StepCell、Bomb、Player | 1～39阶布雷、同阶多雷及所有者关联。 |
| FR-31 | Game | Player、NetworkManager | 本地交接准备与AI/联机双方独立锁定。 |
| FR-32 | Game | CardDeck、Player、CardLedger | 准备锁定后的首次公开及后续公开计数刷新。 |
| FR-33 | Game | Player、SkillComponent、NetworkManager、MountainMapRenderer | 默认私有信息不直显、推算允许、技能情报授权范围。 |
| FR-34 | Game | Player、NetworkManager | 本地双人私有操作交接遮罩。 |
| FR-35 | BattleLog | Game、CardLedger、SkillComponent | 公开事件日志和不记录私有信息的边界。 |
| FR-36 | Game | Player、SkillComponent、JudgeRule | 先完成技能操作后选牌、暗选锁定与揭示时机。 |
| FR-37 | JudgeRule | Player、Character、SkillComponent | 基础步数及角色加成/冻结/护盾/连胜修正；单向获胜同样享有风/岩/水获胜加步与火连胜效果。 |
| FR-38 | Game | Player、CardDeck、SkillComponent、JudgeRule | 技能后确定单向出牌资格；单向推进计获胜及连胜，补牌后重新确定出牌者，末张锁牌后仍结算。 |
| FR-39 | JudgeRule | MountainBoard、StepCell、Player | 移动落脚检查、原地/途中及换位例外。 |
| FR-40 | JudgeRule | MountainBoard、StepCell、Bomb、Player | 每次落脚最多引爆一枚及选雷优先级。 |
| FR-41 | JudgeRule | Player、Bomb、CardLedger、CardDeck | 爆炸退格、雷效果弃牌和连锁结算。 |
| FR-42 | Game | JudgeRule、SkillComponent、AccountManager | 候选登顶、回溯机会与终局确认时序。 |
| FR-43 | Game | Player、CardDeck、SkillComponent、JudgeRule | 牌/技能效果与回溯完成后判断耗尽比高。 |
| FR-44 | AccountManager | Game、AccountProfile、MatchRecord | 仅最终有效结果更新战绩与解锁。 |
| FR-45 | AccountManager、Game、NetworkManager | CardDeck、Player、GenshinAudioManager | 各控制对象按所在业务给出无效操作/存储等反馈并防重复生效；MP3失败由音频对象按指定规则静默回退。 |
| FR-46 | Game | NetworkManager、AccountManager | 中断、作废、退出/重开及联机离开结果。 |
| FR-47 | Game | Player、Character、AccountManager、AIPlayer | 选角、角色解锁可选状态及AI角色指定。 |
| FR-48 | AccountManager | Game、Character、MatchRecord | 依据有效胜局解锁融合角色并持久化至主账号。 |
| FR-49 | NetworkManager | RoomSession、Player、Game | 双方就绪、闲置解散、房主退出和联机计账触发。 |
| FR-50 | NetworkManager | Game、Player | 联机每步倒计时及限定的自动代操作。 |
| FR-51 | Player | MountainBoard、StepCell、Bomb、SkillComponent | 准备锁定前雷调整及有效空间技能例外。 |
| FR-52 | CardLedger | Game、CardDeck、Player、BattleLog | 公开出牌与秘密销毁分区及回溯账本。 |
| FR-53 | GenshinAudioManager | Settings | 可选本地MP3挂载与失败静默回退。 |
| FR-54 | GenshinAudioManager | Settings | 内置合成、首次用户手势恢复与实际播放状态。 |
| FR-55 | MountainMapRenderer | Settings、Game、Player、CharacterModel3D | 手动镜头目标、自动跟随和同阶角色区分。 |
| FR-56 | CharacterModel3D | Character、SkillComponent | 13角色指定造型/动作/特效及允许的建模路线。 |
| FR-57 | Game | Player、Character、SkillComponent | 主动技能入口、次数/条件及出牌前时序，时间技能例外窗口。 |
| FR-58 | SkillComponent | Player、JudgeRule、Bomb | 风系剪刀获胜加步含单向推进，以及本局首次踩雷免退。 |
| FR-59 | SkillComponent | Player、JudgeRule、Bomb | 岩系石头获胜加步含单向推进，以及持续护盾、免疫与平局移动。 |
| FR-60 | SkillComponent | Player、Bomb、CardLedger、CardDeck | 雷系炸弹上限、归属触发与随机弃牌。 |
| FR-61 | SkillComponent | Player、Game、MountainBoard、StepCell | 草系一次性情报授权范围和返回结果。 |
| FR-62 | SkillComponent | Player、JudgeRule、CardDeck、CardLedger | 水系布获胜加步含单向推进；失败摸牌仍须实际失利，并遵守公共牌库边界。 |
| FR-63 | SkillComponent | Player、JudgeRule、Bomb | 火系连胜计数包含单向获胜，第2胜起额外+2并焚毁选中雷；平/负中断。 |
| FR-64 | SkillComponent | Player、Character、JudgeRule | 冰系冻牌效果和纳贝里士来源组件压制。 |
| FR-65 | TimeRewind | Game、RoundSnapshot、Player、MountainBoard、CardDeck、CardLedger | 时间回溯本轮状态、候选终局撤销和次数规则。 |
| FR-66 | SkillComponent | Player、MountainBoard、StepCell、Bomb | 空间移己方雷/换位、坐标授权、次数暂扣与退款。 |
| FR-67 | SkillComponent | Player、StepCell、Bomb、CardLedger | 死亡系后退修正及消耗手牌即时布雷。 |
| FR-68 | SkillComponent | Player、CardDeck、CardLedger | 生命被动准备兑换须库余至少2张，实际抽至多3张；主动在0～9手牌且库非空时抽至多3张，余1/2张抽尽、空库不耗次数；来源受压制时被动恢复普通换2、主动不可用。 |
| FR-69 | SkillComponent | Player、CardLedger、PlayingCard | 黄金来源首次兑换优惠及花色转换。 |
| FR-70 | Character | SkillComponent、AccountManager、Game | 融合角色技能组件组合、解锁与来源压制边界；生命来源抽牌同样遵守兑换至少2张、主动非空库的不同门槛。 |
| FR-71 | Game | CardDeck、Player、StepCell、Bomb、SkillComponent、CardLedger | 动态资源账本和角色技能对资源规则的例外；生命兑换/主动按实际抽得张数转移实体牌并刷新公开计数，仍保持总牌数90、不放回且不补造牌。 |
| FR-72 | Game | Player、SkillComponent、AIPlayer、NetworkManager、MountainMapRenderer | 情报授权、交接隐藏、AI同等信息边界及回溯后知识处理。 |
| FR-73 | AIPlayer | Game、Character、SkillComponent、JudgeRule | AI难度、指定参赛角色与公平策略输入边界。 |
| FR-74 | AccountManager | AccountProfile、Character、Game | 当前账号的测试解锁/重置及对局锁定约束。 |
| FR-75 | Game | AccountManager、NetworkManager、Player、SkillComponent | 重新开始确认、局内状态重置与旧局作废规则。 |
| FR-76 | Game | JudgeRule、Player、CardDeck、MountainBoard、CardLedger、SkillComponent、RoundSnapshot、AccountManager | 技能/锁牌/亮牌/结算/回溯/终局全过程一致性；回溯恢复含单向获胜的连胜状态及实际抽牌数量对应的资源账本。 |

## 5. 非功能需求—对象关注点

| 需求 | 主要对象 | 分析关注点 |
| --- | --- | --- |
| NFR-01 一致性 | Game、JudgeRule、Player、CardDeck、CardLedger、NetworkManager | 一次提交只产生一次状态变化；回溯前后账本一致；联机两端对公开结果一致。 |
| NFR-02 隐私 | Game、Player、SkillComponent、NetworkManager、MountainMapRenderer、BattleLog、AIPlayer | 数据状态与可见快照分离；仅公开/授权数据进入对手视图、日志和网络公开同步；AI无内存特权。 |
| NFR-03 持久性 | AccountManager、AccountProfile、Settings、MatchRecord | 账号隔离、已完成数据持久化；不把清理站点数据后的恢复能力扩展为需求。 |
| NFR-04 可理解性 | Game、Player、NetworkManager、MountainMapRenderer、GenshinAudioManager | 阶数、行动、锁定、倒计时、无效原因和结局清楚；无声时仍可完成对局。 |
| NFR-05 音画一致性 | Character、SkillComponent、CharacterModel3D、MountainMapRenderer、GenshinAudioManager、Game | 表现只读取已裁决状态；回溯/移动/技能效果后显示同步；音效与特效不泄露未授权信息。 |
| NFR-06 性能与兼容性 | MountainMapRenderer、CharacterModel3D、GenshinAudioManager、Game | 将桌面浏览器、分辨率、首屏、响应和帧率目标作为系统级验收约束，不在此阶段虚构性能设计。 |
| NFR-07 异常与自主运行 | AccountManager、Game、NetworkManager、GenshinAudioManager | 存储、断线、刷新、播放受限及MP3失败等已定义异常由对应控制对象反馈/收敛，不错误记账或改变胜负。 |

## 6. 对象关系要点

1. 一个 Game 管理一局内两名 Player、一个 MountainBoard、一个 CardDeck、规则裁决对象及牌记录；联机模式可关联一个 NetworkManager/RoomSession。AIPlayer 是 Player 的特化，不是第三席。
2. MountainBoard 由第0～40阶的 StepCell 构成；每个 StepCell 可关联0到多枚 Bomb，每枚在场 Bomb 有一个所有者 Player。
3. Player 当前选择一个 Character；Character 组合其局内 SkillComponent。融合角色用多个不同 sourceOrigin 的组件表达双来源能力。
4. AccountManager 管理多个 AccountProfile；AccountProfile 聚合单账号 Settings、MatchRecord与解锁状态。Player 席位与账号档案不是一对一关系，Guest_P2/AI没有独立 AccountProfile。
5. CardDeck 与 Player 的手牌和 CardLedger 共同表达 PlayingCard 单一归属与区间移动；BattleLog 只保留已允许公开的事件。
6. MountainMapRenderer/CharacterModel3D/GenshinAudioManager 是表现对象。它们读取业务状态，不反向裁决移动、抽牌、技能和胜负。

## 7. 分析边界与待系统设计承接项

- 账号认证数据和LocalStorage具体结构尚未在需求阶段指定；分析只确认 AccountManager 与 AccountProfile 的职责/归属。
- 联机通信允许同机跨标签页同步或轻量局域网同步；分析不替用户选方案、不引入外部数据库。
- AI仅明确简单/困难、手动选角与信息公平边界；没有指定搜索算法、策略树或胜率指标，分析不添加。
- 角色技能数值和约束以需求 v1.1 及本轮用户明确裁决为业务来源，冲突时以本轮裁决为准；融合压制依据 SkillComponent.sourceOrigin 精确处理。
- 3D/分层动画、BGM乐谱生成、音效和性能指标是需求验收要求；本阶段不转成渲染管线、音序器或优化方案。
- 对象与类图只用于确认职责及关系，用户确认本阶段成果后才能进入系统设计；不得由本说明直接开始程序开发。

