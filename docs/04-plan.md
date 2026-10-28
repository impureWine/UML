# 《40阶登山博弈游戏》开发迭代计划

> **For agentic workers:** 后续获准编码后，使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans` 按本计划逐轮执行；核对任务使用复选框记录。当前只交付计划，不执行开发。

**版本：** v1.2（Godot 4混合架构与第一人称视角）  
**日期：** 2026-10-28  
**Goal（目标）：** 将已确认的需求、分析和设计拆为恰好10个可独立检查、逐轮人工测试与验收的开发迭代。  
**Architecture（架构）：** 完整保留第7步（迭代1）的游戏首页UI、白昼天空岛动态视觉与AccountManager；第8步（迭代2）至第16步（迭代10）采用Godot 4.x四层结构。宿主仅导航、桥接和账号持久化，Godot Game统一校验提交，角色能力组合及授权投影沿用设计。对局Camera3D默认采用当前行动角色第一人称视角（First-Person Perspective, FPP），保留准备阶段战术俯瞰布雷。  
**Tech Stack（计划技术栈）：** 已有首页：HTML/CSS/JavaScript ES Modules、Vite、LocalStorage、Web Crypto、Web Locks；后续游戏：Godot Engine 4.x、GDScript、.tscn场景、.gd脚本、Godot 3D及音频系统；嵌入桥接：JavaScriptBridge为主，WebSocket/LocalStorage为备用适配。联机默认同源双窗口，由Godot执行协议与规则，浏览器仅转发消息。  
**Spec（依据）：** [需求v1.1](01-requirements.md)、[系统分析](02-analysis.md)、[系统设计](03-design.md)，并参考[用例图](01-usecasediagram.puml)和[分析类图](02-classdiagram.puml)。

## 1. 全局约束与验收解释

### 1.1 阶段与授权

- 本次仅同步03-design.md与本文。第7步（迭代1）已实现并经用户验收，完整保留。代码中已有旧Three.js迭代2预览；该成果保留为历史参考，不视为Godot版本已实现或验收。
- 本次不安装引擎/依赖、不修改程序、不生成Godot源码或Web导出；下列Godot及桥接路径均为后续实施计划。
- 后续从第8步（迭代2）的Godot工程与地图桥接开始；不重新实施迭代1。每轮遵循“AI生成本轮程序 → 人工运行测试 → 按反馈修改 → 用户验收”；未经本轮验收确认，不进入下一轮。
- 不删除任何文件；若未来确需删除文件，依据用户AGENTS指令先取得允许。测试重置融合锁态不删除账号、战绩或其他资料。
- 不增加新模式、新角色、新技能、云账号、外部数据库、公网联机或未确认的曲目触发条件。
- FR、AC沿用已确认文档编号，不另造一套编号替代。下文“阶段验证”只表示指定子项通过，不能把尚未实现的角色、模式、音画或性能子项记为整条AC已通过。

### 1.2 已确认规则与旧文字的适用顺序

以系统设计第1.1节及系统分析勘误为准，不把需求文档中残留的旧边界重新当成规则。以下解释适用于每轮实施和验收，保留原FR/AC编号以便追踪。

| 主题 | 实施与验收口径 | 需按此解释的编号 |
| --- | --- | --- |
| 地图布局 | 用户已再次明确确认：沿用**笔直0～40阶立体天梯**，与三阶段已确认文档一致；迭代2据此执行。默认FPP从双眼位置沿阶梯仰望第40阶天空岛大门，两侧为高耸多立克式白石廊柱与翻涌云海；战术俯瞰为辅助，路径不弯折 | FR-12、FR-13、FR-55；AC-11、AC-60 |
| 单向推进 | 对手无牌时，出牌方计本轮获胜；风剪刀4、岩石头6、水布5；火计入连胜，第2次连续获胜起额外+2并可焚毁所选落脚雷。平/负才中断火连胜 | FR-37、FR-38、FR-58、FR-59、FR-62、FR-63；AC-40、AC-63、AC-65、AC-72、AC-74 |
| 普通雷换牌 | 公共库至少2张才允许，消耗1库存雷抽2张；余0/1拒绝且不扣雷 | FR-28、FR-29；AC-23、AC-24 |
| 生命来源雷换牌 | 未受压制且库至少2张时，抽取不超过3张：余2抽2，至少3抽3；余0/1禁用且不扣雷。被冰压制时恢复普通2张规则 | FR-28、FR-68、FR-70；AC-24、AC-25、AC-78、AC-87、AC-92、AC-93 |
| 生命主动 | 手中0～9张、次数可用、未压制且公共库非空时，抽取不超过3张；余1/2抽尽，余0禁用且不扣次数 | FR-38、FR-68、FR-70；AC-88、AC-89、AC-104 |
| 技能与锁牌 | 出牌界面先按硬币顺序完成双方技能操作窗口，再确定应出牌者、选牌与锁牌。后手预选不提前施法或获取情报；时间回溯位于同界面的结果展示区 | FR-36、FR-57、FR-76；AC-31、AC-62、AC-104 |
| 冻结与单向 | 冻结基础步数减半向上取整仅作用于真实双向猜拳胜，之后再叠角色加成；不扩大到单向推进，护盾平局1步也不减半 | FR-64；AC-77 |
| 回溯与终局 | 允许撤销本轮登顶/耗尽候选终局；回溯机会结束后才最终记账。恢复领域资源及普通技能状态，不返还任何已消耗的时间次数，不抹去合法已知信息 | FR-42～FR-44、FR-65、FR-76；AC-39、AC-42、AC-79～AC-81、AC-101 |
| 信息公开 | 选牌、准备期间只公开公共库总数；双方准备齐锁后首次统一公开库花色分项和双方手牌总数。默认UI/日志不直接展示对手组成、库存雷、暗雷；允许算牌 | FR-23、FR-32～FR-35、FR-72；AC-18、AC-29、AC-30 |

### 1.3 全局质量要求

- NFR-01：实体牌、兑换、锁定、雷销毁、终局及记账只提交一次；资源非法时整笔拒绝。
- NFR-02：本地交接先清私有展示再罩遮罩；按住查看松开/失焦即隐藏；AI、远端、地图、音频不能获得超出授权的数据。验收不扩展至防F12。
- NFR-03：同浏览器同源LocalStorage分账号持久化已完成战绩、解锁和设置；不恢复未完Game。
- NFR-04：行动方、阶数、锁定、无效原因及终局可理解，无声仍可完整操作。
- NFR-05：模型、动作、技能、实际结算一致；同阶左右分立；默认FPP、13套角色专属Viewmodel与周身元素粒子、回头可见对手完整3D模型。逐阶抛物线跳跃、贴脸爆炸、强烈Camera Shake与快速退格匹配裁决；准备阶段可切战术俯瞰精确布雷。音乐切换1.5秒平滑过渡。
- NFR-06：PC现代Chrome/Edge/Firefox/Safari，1920×1080及1366×768；首屏≤2秒、可见操作反馈≤100ms、动画≥45FPS。每轮检查新增内容，迭代10按实际环境完成全矩阵，不以文档检查替代测量。
- NFR-07：六曲和SFX无外部音频文件也可发声，首次手势唤醒、MP3失败静默回退；存储失败明确反馈，音频失败不改变规则。

## 2. 文件规划与迭代协作

### 2.1 未来文件组织

后文每个路径均相对项目根目录；第7步已有文件继续复用，第8～16步的游戏源码统一置于godot_project/。本次不创建目录或文件。

| 未来路径 | 职责 | 首次涉及迭代 |
| --- | --- | --- |
| `package.json`、`index.html`、`src/main.js` | 最小本机同源启动、模块装配及开发/构建入口 | 1 |
| `godot_project/project.godot`、`godot_project/export_presets.cfg`、`godot_project/scenes/Main.tscn` | 完整Godot 4.x工程、Compatibility渲染及Web嵌合导出；实际4.x小版本与模板配套固定 | 2 |
| `src/utils/GodotHostBridge.js`、`godot_project/scripts/bridge/WebAccountBridge.gd` | JavaScriptBridge握手、五入口路由、安全AccountProfile传入、保存/返回回执；备用传输复用同一协议 | 2；6/8/10扩充 |
| `public/godot/` | Web导出JS/WASM/PCK，部署时与首页同源；不作为工程源码替代 | 2起 |
| `godot_project/scenes/MountainMap.tscn`、`godot_project/scenes/characters/*.tscn`、`godot_project/scenes/ui/*.tscn` | 地图、13角色、图鉴/设置等实际场景与资源装配 | 2～10 |
| `src/styles/theme.css`、`src/styles/layout.css` | 完整保留首页白昼天空岛动态视觉、布局及适配；仅补嵌入容器样式 | 1已实现；2接桥 |
| `src/view/GameView.js` | 保留第7步完整登录、首页UI及天空岛动态视觉；五个导航按钮接入桥接 | 1已实现；2仅接入桥接 |
| `godot_project/scenes/GameView.tscn`、`godot_project/scripts/view/GameView.gd` | 后续全部游戏操作界面、图鉴与设置，以Control/CanvasLayer及signals接入Game | 2～10 |
| `godot_project/scenes/FirstPersonRig.tscn`、`godot_project/scripts/view/FirstPersonCamera.gd`、`godot_project/scripts/view/CameraShake.gd` | EyeAnchor双眼位、默认FPP/战术切换、自由观察、逐阶抛物线/后退及独立震屏偏移 | 2骨架；6真实裁决；7技能例外 |
| `godot_project/scenes/characters/viewmodels/*.tscn`、`godot_project/scripts/view/CharacterViewmodel.gd` | 13套专属3D手部/袖口/持物、近景可见层与元素粒子，和世界角色共享身份及有效技能状态 | 3交齐；6～8实战接线 |
| `godot_project/scripts/view/MountainMapRenderer.gd` | 笔直天梯、地貌、云海、相机、台阶高亮及授权标记 | 2 |
| `godot_project/scripts/view/CharacterModel3D.gd`、`godot_project/resources/character_specs.tres`、`godot_project/scripts/view/CharacterAnimations.gd`、`godot_project/scripts/view/CharacterEffects.gd` | 模型控制器及13角色只读外观规格、公共骨骼动画、独立特效构建 | 3（第9步） |
| `src/controller/Game.js` | 保留现有认证及首页导航；不扩展为JS对局引擎 | 1已实现 |
| `godot_project/scripts/Game.gd` | 游戏状态机、阶段门禁、命令去重、资源事务与回合/终局流程 | 2建立入口；4～8扩充 |
| `godot_project/scripts/NetworkManager.gd` | 两窗口房间、权威同步、计时、离开与共享终局 | 10（第16步） |
| `src/model/AccountProfile.js`、`src/model/Settings.js`、`src/model/MatchRecord.js` | 账号档案、偏好、已确认对局记录 | 1；MatchRecord在6落地 |
| `godot_project/scripts/model/MountainBoard.gd`、`godot_project/scripts/model/StepCell.gd`、`godot_project/scripts/model/Bomb.gd` | 41阶领域路径、同阶雷队列、带归属的雷 | 2；Bomb在5落地 |
| `godot_project/scripts/model/Character.gd`、`godot_project/scripts/model/characterCatalog.gd` | 角色身份/组合及13角色名称、技能说明、来源等只读资料 | 3 |
| `godot_project/scripts/model/Player.gd`、`godot_project/scripts/model/AIPlayer.gd` | 席位资源；AIPlayer在4仅保存指定角色/难度配置，决策在10落地 | 4（第10步） |
| `godot_project/scripts/model/PlayingCard.gd`、`godot_project/scripts/model/CardDeck.gd`、`godot_project/scripts/model/CardLedger.gd` | 90实体牌、公共牌库、可用/待揭示/公开/秘密区账本 | 4 |
| `godot_project/scripts/model/JudgeRule.gd`、`godot_project/scripts/model/BattleLog.gd`、`godot_project/scripts/model/RoundSnapshot.gd` | 落脚与回合裁决、公开日志、回合快照 | 5；RoundSnapshot在6落地 |
| `godot_project/scripts/model/RoomSession.gd` | 房间两席、就绪及有效期数据 | 10 |
| `godot_project/scripts/model/skills/SkillComponent.gd`、`godot_project/scripts/model/skills/ActiveSkillComponent.gd`、`godot_project/scripts/model/skills/PassiveSkillComponent.gd` | 组合组件契约，统一来源、压制、条件与次数规则 | 4～5建立最小契约，7完整接线 |
| `godot_project/scripts/model/skills/`下的20个与具体技能类同名的文件 | 系统设计第6.3节的20个具体技能，每类一文件；具体名单见迭代4、7、8 | 4、7、8 |
| `src/utils/AccountManager.js`、`src/utils/LocalStorageStore.js` | 本窗口身份、账号级事务持久化 | 1 |
| `godot_project/scripts/utils/InformationProjector.gd`、`godot_project/scripts/utils/RandomSource.gd` | 分席/分阶段白名单投影、公平随机 | 2最小投影；4公平随机 |
| `godot_project/scripts/utils/GenshinAudioManager.gd`、`godot_project/scripts/utils/ScoreSynthesizer.gd`、`godot_project/scripts/utils/LocalMp3Source.gd`、`godot_project/resources/audio/scores.tres`、`godot_project/resources/audio/sfx_specs.tres` | BGM双音源、六份多轨乐谱、合成SFX | 9（第15步） |
| `tests/unit/`、`tests/integration/`、`tests/fixtures/` | 浏览器账号、宿主桥接及首页回归测试/夹具 | 1保留；2起扩展 |
| `godot_project/tests/run_tests.gd`、`godot_project/tests/unit/`、`godot_project/tests/integration/`、`godot_project/tests/fixtures/` | GDScript测试入口、游戏规则/隐私/场景检查及内存夹具；失败须非零退出 | 2起 |
| `docs/acceptance/iteration-01.md`至`docs/acceptance/iteration-10.md` | 每轮人工环境、AC子项、结果、反馈与用户验收记录 | 对应轮交付时 |

未增加与分析/设计冲突的主要业务类。只读规格与动画辅助模块不是新的业务对象；不要为每个角色复制一套Game或规则引擎。测试数据不写成正式战绩或作为常驻作弊入口。

### 2.2 跨轮接口与依赖

| 提供轮 → 使用轮 | 已确定的协作契约 | 约束 |
| --- | --- | --- |
| 1 → 4/6/8/10 | 复用AccountManager的login、switchAccount、saveSettings；经桥接按需扩展bindMatchOwner、commitCompletedMatch、setFusionTestUnlock | currentAccountId仅窗口内存；Game绑定账号后不能切换；存储事务锁内重读并一次写入 |
| 2 → 3/5/6/7 | MountainMapRenderer接授权位置、锚点及表现事件；FirstPersonCamera提供bind_view_seat、set_view_mode、play_step_path、reset_after_rewind，CameraShake提供play_shake、cancel_attempt；参数使用授权席位、路径及attemptId | 业务阶号固定0～40，站位偏移和相机不改变领域状态；动画不得查雷 |
| 3 → 4/6/7/8 | CharacterModel3D的buildCharacter、setIdle、playClimbJump、playKnockback、playSkillEffect、cancelAttempt；CharacterViewmodel提供bind_character、apply_visible_state、play_action、cancel_attempt，与世界模型使用同一characterId | 13模型均在3交付；7/8把真实技能事件接入，8集成融合左右特征与状态 |
| 4 → 5/6/7/10 | Game控制选角/硬币/DRAFT，CardLedger维护90实体归属，InformationProjector按席位输出副本 | 不把完整Player、Game或全场雷表交给View/AI；快速补齐仍逐张交替 |
| 5 → 6/7/8 | JudgeRule的selectLandingBomb、resolveLanding、resolveBombChain及准备资源校验 | 5验证基础雷规则；6接真实移动；7/8挂角色修正，不复制另一套爆炸规则 |
| 6 → 7/8/10 | beginRound、finishSkillPhase、lockCard、resolveRound、finalizeRound、finalizeMatch及RoundSnapshot锚点 | 技能前快照；候选/最终结果分离；末张已锁仍揭示；一次记账 |
| 7 → 8/10 | Character组合技能列表、sourceOrigin、isSuppressed及技能统一门禁 | 融合四个独立组件保留原来源；冰只禁NABERIUS；策略不能绕过统一校验 |
| 9 → 10 | GenshinAudioManager消费授权场景/到达事件，Settings为播放器与设置页共同数据 | 实际到达高区即记录；音频不参与胜负；不在两处重复保存设置 |

“独立测试”指每轮能使用前轮成果及明确夹具单独验收本轮交付，不表示10轮互不依赖，也不表示前几轮已是完整可验收游戏。

## 3. 迭代总览

| 迭代 | 单一交付焦点 | 可独立评审的成果 | 主要依赖 |
| --- | --- | --- | --- |
| 1（第7步） | 已实现账号与首页，完整保留 | 登录/注册/切号、首页UI和白昼天空岛动态视觉 | 已验收成果 |
| 2（第8步） | Godot工程、桥接与40阶地图 | 五入口携账号进入Godot、返回原首页；Godot笔直天梯、柱廊云海、默认FPP与战术俯瞰交互 | 1保留成果 |
| 3（第9步） | 13模型与图鉴预览 | 全13独立立体造型及专属Viewmodel、元素粒子、基础动作和完整资料 | 1～2 |
| 4（第10步） | 开局至初选完成 | 选角、AI角色指定配置、硬币、交替各取30 | 1～3 |
| 5（第11步） | 唯一准备与基础炸弹 | 普通兑换/布雷及规则级基础连爆 | 2、4 |
| 6（第12步） | 本地完整基础对局 | 出牌→移动→结算→记账→重开闭环 | 1～5 |
| 7（第13步） | 前11角色能力 | 18组件与出牌界面技能流程、回溯、生命压制 | 4～6 |
| 8（第14步） | 黄金与隐藏融合 | 两黄金组件、账号解锁、四组件融合与局部压制 | 1、3、6～7 |
| 9（第15步） | 音乐和音效 | 六曲合成/MP3、悬浮播放器、动态切歌、SFX | 1～8 |
| 10（第16步） | AI、联机及设置收口 | 两档公平AI、同源双窗口房间、全设置与全体验收 | 1～9 |

## 4. 第7步（迭代1）：已实现的账号与首页导航（保留基线）

本节为既有交付与验收基线，不重新生成、替换或重做。完整保留全部游戏首页UI、白昼天空岛动态视觉与AccountManager本地多账号登录/注册/切换；其复选框保留为原验收事项，不表示本轮重新开发。

### 本轮目标与需求

交付可运行的本机页面、LocalStorage多账号注册/登录/切换和白昼天空岛圣殿风格首页。对战、图鉴、设置与播放器仅保留明确占位，不能伪装为已实现功能。

- 核心：FR-01、FR-02、FR-03的账号隔离与数据结构、FR-04的首页结构、FR-05的统计/历史展示结构、FR-45的存储失败反馈。
- 衔接：FR-06的P1/Guest_P2身份约定、FR-11的Settings数据结构、FR-12的首页视觉；真实对局身份绑定在4、战绩写入在6、融合解锁在8、音频在9、设置页完成在10。
- 质量：NFR-03、NFR-04；首次检查NFR-06的两分辨率和首页反馈。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `package.json`、`index.html`、`src/main.js`、`src/styles/theme.css`、`src/styles/layout.css` | 最小启动、模块装配、首页视觉和布局；只引入本轮需要的工具 |
| `src/view/GameView.js`、`src/controller/Game.js` | 登录模态框、HOME、账号栏、导航及空占位；不运行对局状态 |
| `src/utils/AccountManager.js`、`src/utils/LocalStorageStore.js` | 注册、登录、切号、退出、错误反馈与单键账号事务 |
| `src/model/AccountProfile.js`、`src/model/Settings.js` | 稳定accountId、口令校验资料、初始统计/角色锁态/偏好字段 |
| `tests/unit/account-manager.test.js`、`tests/unit/account-storage.test.js` | 格式、重名、认证、隔离、写失败与并发覆盖风险测试 |
| `docs/acceptance/iteration-01.md` | 首页与账号人工验收记录 |

- [ ] 配置最小ES Modules/Vite开发和构建入口，完成登录模态框与首页导航，各子页提供占位说明和返回首页。
- [ ] 实现用户名2～16位字母/数字/中文、唯一且区分大小写，密码≥4；使用Web Crypto独立salt和PBKDF2，不存明文密码；注册不绕过显式登录。
- [ ] 使用`climb40.accounts.v1`版本化文档及命名Web Lock，锁内重读后一次写入；LocalStorage失败明确反馈，不覆盖既有账号。
- [ ] 登录身份只在窗口内存中保存；刷新返回登录框；同源另一窗口切号不改变本窗口身份。账号A/B各自装载档案，不串统计/解锁/设置。
- [ ] 运行必要账号测试，再人工检查首页、错误反馈和两目标分辨率；记录真实结果并提交用户验收。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-01 | 空值、1/2/16/17位、非法字符、重名、3/4位密码均按边界处理；错误不覆盖账号 | 10复查双窗口并发注册 |
| AC-02 | 未登录不能进首页；错误口令拒绝；首页切号/退出正确，刷新需登录 | 4/6验对局账号锁，10验联机 |
| AC-03 | A/B档案及偏好可分别恢复，存储失败不伪报成功 | 6补真实战绩，8补解锁，9～10补全设置 |
| AC-04 | 账号栏、三模式、图鉴、设置、播放器占位齐全，导航与返回有效 | 播放9、AI/联机/设置10，不能本轮记整条通过 |
| AC-47 | 只验存储异常分支，失败明确可理解 | 音频异常9 |
| AC-60 | 阶段检查首页两分辨率与操作可见反馈，记录环境 | 2/3增量测量，10全矩阵 |

## 5. 第8步（迭代2）：40阶笔直立体天梯地图

### 本轮目标与需求

完成Godot工程、首页桥接及地图表现与交互：0～40共41个阶位沿笔直轴线上升，三段地貌、多立克式白石廊柱、云海、双眼位FPP及战术俯瞰切换、辅助五焦点/缩放与台阶高亮。采用Godot场景及GDScript测试投影验证，不新增业务模式；旧Three.js预览不参与后续对局渲染。

- 核心：FR-12、FR-13、FR-55。
- 阶段部分：FR-14的站位/运动接口、FR-15的授权标记接口、FR-11的镜头偏好持久化；实际角色3、私有布雷5、真实对局运动6接入。
- 质量：NFR-02、NFR-04～NFR-06。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/project.godot`、`godot_project/export_presets.cfg`、`godot_project/scenes/Main.tscn`、`godot_project/scenes/MountainMap.tscn` | 创建完整Godot 4.x工程、Web嵌合导出和3D场景生命周期 |
| `src/main.js`、`src/view/GameView.js`、`src/utils/GodotHostBridge.js`、`godot_project/scripts/bridge/WebAccountBridge.gd` | 原首页五入口接入，ready/init握手、安全档案传入、返回及错误恢复；不重做原UI |
| `godot_project/scripts/model/MountainBoard.gd`、`godot_project/scripts/model/StepCell.gd` | 固定41阶、地貌区间及禁布雷端点数据；不实现炸弹操作 |
| `godot_project/scripts/view/MountainMapRenderer.gd` | 笔直锚点、材质、背景、云粒子、相机、缩放/高亮、resize/dispose |
| `godot_project/scripts/utils/InformationProjector.gd` | 最小公开阶位/站位投影和授权标记契约，视图不持有全场私有状态 |
| `godot_project/scripts/view/GameView.gd`、`godot_project/scenes/ui/CharacterGuide.tscn`、`godot_project/scenes/ui/Settings.tscn`、`src/model/Settings.js`、`src/styles/layout.css` | Godot地图/HUD、五焦点、图鉴/设置场景入口与账号偏好桥接；功能按对应迭代补齐 |
| `godot_project/tests/unit/mountain-board.gd`、`godot_project/tests/fixtures/map-preview.gd`、`docs/acceptance/iteration-02.md` | 0～40及分区边界检查、投影夹具和视觉/性能记录 |

- [ ] 创建上述Godot工程与Web导出配置，固定Godot 4.x版本及模板，检查源码可由编辑器打开并独立运行。
- [ ] 按03-design第2.4节完成engine_ready→initialize→initialized、五入口route及sessionId/requestId校验；当前账号投影不含credential，失败时原首页仍可操作。
- [ ] 五入口均进入对应Godot场景，尚未到实施轮次的对战/图鉴/设置功能明确显示未开放，不将占位当作完整功能；通过return_home恢复原首页和天空岛动态视觉，不重新登录。
- [ ] 新增tests/integration/godot-host-bridge.test.js及Godot桥接夹具，覆盖未就绪、协议版本错误、旧session、重复消息、错误accountId、返回与保存失败；夹具使用内存档案，不写真实账号。
- [ ] 对比第7步首页两分辨率基线，回归注册、登录、切号、账号隔离及LocalStorage数据；进入引擎期间冻结切号，返回后解除绑定。
- [ ] 建立41个笔直上升的空间锚点，0山脚、40终点门与王座，连续顺序与阶号可读。
- [ ] 完成0～15山林石阶、16～30覆雪冰阶、31～40浮空玉阶与白昼圣殿背景、受控云海粒子。
- [ ] 实现FirstPersonRig.tscn与FirstPersonCamera.gd：默认FPP从EyeAnchor双眼位沿天梯仰望40阶大门，可平视/回头；镜头观察与HUD点击明确切换，失焦释放指针。两侧柱廊不遮台阶及对手位置。
- [ ] 保留“战术俯瞰 / 返回第一人称”按钮；准备阶段可俯瞰射线拾取远端1～39阶，山脚/山顶/P1/P2/全局五焦点与缩放仅为战术辅助，退出准备恢复FPP。autoFollow偏好只控制战术跟随，不解除FPP眼位绑定。
- [ ] 完成台阶悬停/选中高亮及合法目标意图接口；用双站位标识验证同阶左右偏移，标识不代替迭代3角色模型。
- [ ] 检查两分辨率可读性、帧率与交互反馈；确保相机和标记不依据未授权暗雷自动提示。

- [ ] 用Godot内存夹具验证FPP眼高/朝向、TACTICAL切换不修改位置、准备结束恢复FPP、旧attempt取消后镜头归位；迭代2使用眼位与站位夹具，13套真实Viewmodel在迭代3验收。
- [ ] 本轮新增FPP验收证据：两目标分辨率从0/15/30/39阶仰望40阶大门，柱廊/云海纵深可辨；战术俯瞰可准确选远端阶位且不出现未授权暗雷。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-11 | 笔直41阶、三分区、0/40与高亮正确；同阶左右锚点不重叠 | 3真人物模型，6移动/退格/胜者停40 |
| AC-10 | 仅验镜头偏好：A/B分别设置不同自动跟随值，切号及重新登录后各自恢复 | 9音频偏好，10完整设置页 |
| AC-60 | 五焦点、缩放、跟随开关与两目标分辨率可用；实测本轮场景帧率/反馈 | 3/9增量性能，10四浏览器完整矩阵 |
| AC-12、AC-30 | 只检查接口不接收敌雷全表、无默认暗雷提示 | 5真实按住查看，7技能授权 |

## 6. 第9步（迭代3）：13角色建模与图鉴3D预览

### 本轮目标与需求

一次交齐CH-01～CH-13的独立可辨模型与图鉴。包含融合左右双生造型，不把第13模型全部推迟到8；8负责融合模型与真实技能/解锁的联动校正。

- 核心：FR-10、FR-56；FR-14的模型/基础动作。
- 阶段部分：FR-47的模型与锁定预览、FR-57～FR-70的只读技能说明；本轮不实现技能收益或更改规则。
- 质量：NFR-04～NFR-06，特效预览仍遵守NFR-02。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/model/Character.gd`、`godot_project/scripts/model/characterCatalog.gd` | 13角色身份、元素/阵营、技能说明、次数、来源及压制描述 |
| `godot_project/scripts/view/CharacterModel3D.gd`、`godot_project/resources/character_specs.tres` | 共同关节与13份独立造型，hair/costume/accessories等构建 |
| `godot_project/scripts/view/CharacterAnimations.gd`、`godot_project/scripts/view/CharacterEffects.gd` | 待机、跳跃攀爬、击退、落脚、登顶及技能动作/特效预览，不做领域裁决 |
| `godot_project/scripts/view/GameView.gd`、`godot_project/scripts/view/MountainMapRenderer.gd` | 图鉴选择、3D观察、模型切换及地图双席站位接入 |
| `godot_project/tests/fixtures/character-preview.gd`、`docs/acceptance/iteration-03.md` | 固定姿态/动作输入和13模型逐项人工核对记录 |

- [ ] 按系统设计第7.3节逐名完成13份外观：发型发色、服饰披风、环翼与已指定持物；不以通用人偶换色或平面立绘替代，不额外发明武器。
- [ ] 重点核对风双辫/琴、岩黑金/盾、雷麻花辫/百眼轮/刀、草精灵侧马尾/法阵、水水母头/礼帽/权杖、火红金/太阳轮、冰皇冠/皇袍、时间六翼/日晷、空间立方体、死亡骨翼/猩红眼、生命王冠/白翼、黄金四角星、融合左黑金右翠白。
- [ ] 支持共同骨骼联动，发辫/披风/裙摆/翼环附属动作，以及待机、跳跃攀爬、击退、落脚、技能、登顶预览；无主动角色只展示实际被动表现。
- [ ] 图鉴完整呈现13角色规则、技能次数/条件、融合继承、冰压制与信息边界，初始锁定融合仍可查看资料和模型。
- [ ] 逐模型录制/截图并核对两角色同阶辨识、材质遮挡与帧率；测试输入不消耗游戏技能次数。

- [ ] 创建characters/viewmodels/下CH-01～CH-13独立.tscn与CharacterViewmodel.gd；在FPP视口下方呈现专属3D手部、袖口与已指定武器/法器，未指定持物者用角色专属手势，不额外发明武器。同步角色ID与有效技能状态。
- [ ] 建立本人头部/穿入眼位几何剔除及近景可见层；必要时以SubViewport独立渲染Viewmodel并合成。对手完整3D世界模型始终按正常可见性渲染，平视/回头和同阶两侧可辨，无重影或手部穿墙。
- [ ] 周身元素粒子围绕角色锚点分布，FPP边缘可感知而不遮住台阶、对手及HUD；逐名截图/录制13套手部、持物、粒子及融合双侧差异。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-09 | 全13角色资料与v1.1及勘误一致，技能说明完整，锁定状态正确 | 7/8复验实际技能与资料一致 |
| AC-61 | 全13造型、骨骼/层次、基础动作、融合两侧差异可辨；不能只交前11模型 | 7/8用真实结算触发对应特效后整条闭合 |
| AC-11、AC-48 | 模型可预览、同阶左右分立、起止姿态及地图接入正确 | 4实际选角，6实际攀爬，10三模式 |
| AC-60 | 记录双模型与云海同时渲染的性能、两分辨率界面 | 10全环境验收 |

## 7. 第10步（迭代4）：选角、硬币与交替初选

### 本轮目标与需求

打通“登录首页→选角→初始化→抛硬币→一人一张交替各取30”，止于初选完成。AI界面本轮只保存难度/指定角色配置，不提前实现AI决策；自动取牌可通过既有快速补齐或测试驱动检查。

- 核心：FR-20～FR-24、FR-47、FR-06的席位绑定。
- 阶段部分：FR-02/FR-03账号绑定、FR-07/FR-73指定AI配置、FR-32～FR-34初选信息边界、FR-45非法/重复提交；FR-60仅初始化雷容量。
- 质量：NFR-01～NFR-04。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/Game.gd`、`godot_project/scripts/view/GameView.gd` | CHARACTER_SELECT、COIN、DRAFT及选角确认后的初始化动作与保密交互 |
| `godot_project/scripts/model/Player.gd`、`godot_project/scripts/model/AIPlayer.gd`、`godot_project/scripts/model/Character.gd` | P1主账号/Guest_P2、选角实例、AI配置；未开放真实AI对局决策 |
| `godot_project/scripts/model/PlayingCard.gd`、`godot_project/scripts/model/CardDeck.gd`、`godot_project/scripts/model/CardLedger.gd` | cardId、90实体牌、取花色与随机取牌、分区账本 |
| `godot_project/scripts/model/skills/SkillComponent.gd`、`godot_project/scripts/model/skills/PassiveSkillComponent.gd`、`godot_project/scripts/model/skills/ThunderBombCapacity.gd` | 最小组件契约及雷初始4/上限5修正；其他技能7/8完成 |
| `godot_project/scripts/utils/RandomSource.gd`、`godot_project/scripts/utils/InformationProjector.gd`、`src/utils/AccountManager.js` | 公平硬币/实体抽样、分席投影、选角开始锁定账号 |
| `godot_project/tests/unit/card-deck.gd`、`godot_project/tests/unit/random-source.gd`、`godot_project/tests/integration/draft-flow.gd`、`docs/acceptance/iteration-04.md` | 硬币/随机映射、60次交替、幂等与隐私测试及人工记录 |

- [ ] 选角展示全部13模型和技能，12常规可选、融合按账号当前状态可选；保存手动AI角色/难度，不让合法指定被随机替换。
- [ ] 本地固定主账号P1、Guest_P2；从选角至返回首页锁定账号；每局建立独立Character/组件实例。
- [ ] 初始化各花色30总90、双方0阶；默认3雷上限4、巴尔泽布4雷上限5，其他技能运行状态由后续迭代补齐。
- [ ] 公平硬币用随机位产生正/反各1/2；实体索引用无取模偏差的均匀抽样。正面P1、反面P2先取，不赋予登顶胜负优先。
- [ ] 每次只取当前玩家1张后交替；花色耗尽、错轮、超30及重复提交不改变资源；本地每次私有交接清屏后遮罩。
- [ ] 快速补齐保留已手选牌，按当前交替顺序随机补足双方30；只公开公共总数，不显示分项/敌所取花色/完整公开牌数栏；初选结束库30。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-02、AC-05 | 选角后账号不可切换；本地席位身份正确、不建Guest档案 | 6真实战绩只写主账号 |
| AC-15、AC-68 | 初始90/0阶及默认3/4、雷4/5正确，新开初选无旧资源 | 7完整技能重置，9音乐重置 |
| AC-16、AC-17 | 两种硬币结果及完整交替60张；公平规则不以少量样本恰好各半替代证明 | 10联机权威随机 |
| AC-18、AC-19 | 本地初选私密、快速补齐保留已选且轮次正确 | 5验准备未齐锁仍保密；10联机同意流程 |
| AC-48、AC-95 | 先选角后硬币，显示模型/锁态、记录合法AI角色/难度配置 | 8测试解锁；10AI实战/联机就绪 |

## 8. 第11步（迭代5）：唯一准备阶段与基础炸弹

### 本轮目标与需求

完成普通准备、兑换、4/5总雷额度、同阶多雷和基础落脚连锁规则。连锁通过规则输入独立测试，下一轮接真实出牌移动；本轮不提前实现整局猜拳循环。

- 核心：FR-25～FR-31、FR-51、FR-52的普通准备部分；FR-39～FR-41的基础落脚/10格连锁。
- 阶段部分：FR-15、FR-26/FR-60雷容量、FR-32～FR-35公开/秘密区、FR-45原子失败。
- 角色准备修正分工明确：LifeExchangeBonus和DivineSuppression在7接入并重验准备；GoldenFirstExchangeDiscount和融合继承在8接入。不能把本轮普通2牌/2张规则宣称为全角色最终行为。
- 质量：NFR-01、NFR-02、NFR-04、NFR-05。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/Game.gd`、`godot_project/scripts/view/GameView.gd` | PREPARATION、双向兑换、布雷/移雷/撤回与不可撤销锁定 |
| `godot_project/scripts/model/Bomb.gd`、`godot_project/scripts/model/MountainBoard.gd`、`godot_project/scripts/model/StepCell.gd`、`godot_project/scripts/model/Player.gd` | 带归属/标识的雷、同阶队列、库存与场上共同计额 |
| `godot_project/scripts/model/JudgeRule.gd`、`godot_project/scripts/model/BattleLog.gd` | 选1雷、敌雷优先、自雷、退10、连锁及公开爆炸日志 |
| `godot_project/scripts/model/CardDeck.gd`、`godot_project/scripts/model/CardLedger.gd`、`godot_project/scripts/model/skills/ThunderBombCapacity.gd` | 实体随机兑换、秘密销毁、4/5额度修正 |
| `godot_project/scripts/utils/InformationProjector.gd`、`godot_project/scripts/view/MountainMapRenderer.gd` | 齐锁公开、本人按住雷标记及交接/失焦清除 |
| `godot_project/tests/unit/preparation-rules.gd`、`godot_project/tests/unit/bomb-chain.gd`、`godot_project/tests/integration/preparation-privacy.gd`、`docs/acceptance/iteration-05.md` | 资源边界、基础连爆、公开时点与私密性 |

- [ ] 初选满30后仅进入一次准备；本地硬币先手锁定→遮罩→后手锁定；本人锁定不可撤销，齐锁才退出准备。
- [ ] 实现指定2牌换1库存雷、1库存雷等概率不放回抽2牌；库0/1拒绝，场上雷不能直接兑换；资源允许时不限兑换次数。
- [ ] 所有新增按库存＋本人场上合计校验默认4/雷5；布雷不释放额度；指定牌不足、无库存、已锁定等整笔拒绝。
- [ ] 1～39任意阶可同阶多雷，0/40禁布；准备未锁定可移动/撤回本人雷，保留归属；普通准备结束后入口关闭。
- [ ] 按住查看仅己雷，松开、取消指针、失焦、交接立即隐藏；敌库存/坐标/同阶枚数不通过图标或日志公开。
- [ ] 双方齐锁前只有公共总数，齐锁后一次公开库总数/花色分项/双方手牌总数；准备消耗进入秘密销毁，不能写进公开出牌历史。
- [ ] 用规则夹具验证只查落脚、一次1雷/敌雷优先、自雷可炸、退10最低0、实际回退后才查新落脚；保留角色免疫/焚毁/退13修正钩子。

- [ ] 将战术俯瞰射线选阶接入真实准备布雷/移雷/撤雷意图；只有领域验证成功才提交，0/40禁布雷，1～39远端可准确选取，FPP/俯瞰切换都不暴露敌方暗雷。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-12、AC-18、AC-29、AC-30 | 按住/交接隐藏及首次公开时点正确，普通UI不泄露敌库存/雷位 | 7合法技能授权与回溯计数 |
| AC-20～AC-24 | 普通准备仅一次、总雷4/5、秘密耗牌、实体等概率、普通库2/1/0边界 | AC-24生命剩2在7按勘误补验 |
| AC-25～AC-27、AC-55 | 普通兑换不限次，实际手牌保留；合法阶/多雷；本地先后锁定、普通撤回/移动门禁 | 7/8准备被动；10独立准备/并发/计时 |
| AC-35～AC-38 | 规则级途经不炸、自雷/敌雷优先、同阶余雷及35→25→15→5→0正确 | 6真实出牌驱动整合，不把夹具当成整局通过 |
| AC-56、AC-68 | 准备销毁花色秘密；雷4库存/5上限与普通3/4不串用 | 7弃牌/回溯和雷完整技能 |

## 9. 第12步（迭代6）：本地基础猜拳、移动、终局与重开

### 本轮目标与需求

形成第一个本地双人基础规则闭环：从已有开局/准备进入连续暗选、齐锁揭牌、攀爬与踩雷，到确认结果、账号记账和重新开始。本轮按不改变基础裁决的角色状态/规则夹具验收；角色能力尚未齐备，不能宣称v1.1所有角色已可完整对战。

- 核心：FR-06、FR-36～FR-46、FR-52、FR-75的本地部分。
- 衔接：FR-05真实统计与历史、FR-14/FR-20动作与新局重置、FR-32～FR-35回合公开/私密、FR-57/FR-76的技能前置流程及候选终局结构。
- 质量：NFR-01～NFR-05、NFR-07的非音频异常。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/Game.gd`、`godot_project/scripts/model/JudgeRule.gd` | ROUND_SKILLS→CARD_LOCK→RESOLVE→ROUND_REVIEW→下一轮/FINAL；非法操作和命令去重 |
| `godot_project/scripts/model/RoundSnapshot.gd`、`godot_project/scripts/model/Player.gd`、`godot_project/scripts/model/CardLedger.gd`、`godot_project/scripts/model/BattleLog.gd` | 技能前快照契约、待揭示末牌、公开历史、候选结果与领域账本 |
| `src/model/MatchRecord.js`、`src/utils/AccountManager.js`、`src/utils/LocalStorageStore.js`、`src/model/AccountProfile.js` | 账号席位视角、matchId幂等、统计/历史一次提交；正常解锁条件8接入 |
| `godot_project/scripts/view/GameView.gd`、`godot_project/scripts/view/MountainMapRenderer.gd`、`godot_project/scripts/view/CharacterModel3D.gd`、`godot_project/scripts/utils/InformationProjector.gd` | 本地私有交接、选牌/锁定/揭示、运动/击退/登顶、结果与重开确认 |
| `godot_project/tests/unit/judge-rule.gd`、`godot_project/tests/unit/match-record.gd`、`godot_project/tests/integration/local-match.gd`、`godot_project/tests/integration/restart.gd`、`docs/acceptance/iteration-06.md` | 基础结果、末牌、连爆后耗尽、幂等记账及重开验证 |

- [ ] 完成出牌界面：先技能操作子阶段，再确定requiredActors并开放选牌；本轮无已实现主动时直接完成相应技能窗口，不制造永久“跳过技能”规则。
- [ ] 可改选至确认；确认只扣1张进入待揭示区、不可反悔；锁末牌至0仍参与本轮，全部应出牌者锁定前不亮牌、不写公开历史。
- [ ] 齐锁后统一亮牌，剪刀/布/石头获胜2/3/5；普通平/负不动，原地不查雷；单向推进计本轮获胜，基础状态仍按2/3/5前进。
- [ ] 将5的落脚规则接入真实移动与模型动画：只在终点查雷、一次1雷、敌雷优先、连退10最低0，动画经过格不产生额外结算。
- [ ] 接入match_completed→AccountManager.commitCompletedMatch→save_ack/save_error；固定原accountId/localSeat，以(accountId, matchId)幂等保存。验证重复/晚到消息、保存失败重试、终局自动保存及返回首页统计刷新，不覆盖其他账号。
- [ ] 达到/超过40停40；本轮无回溯资格时无需新增确认等待。双方牌尽则在全部移动/连爆后比高，同阶平；预留同时登顶为平局的统一结果入口。
- [ ] 建立候选/最终结果分离和技能前RoundSnapshot；7接入时间技能后，候选不能提前写档。公开日志不带秘密销毁花色或未揭示牌。
- [ ] 仅最终确认的本账号视角记录一次统计/历史；本地仅主账号P1，Guest不建档。存储失败明确显示并可重试，不伪报保存成功。
- [ ] 本地退出/重开二次确认；取消不变，确认未完局作废、新局回选角并重置牌/雷/临时状态；保留账号资料和已完成历史。刷新不恢复旧局。

- [ ] 从真实授权移动路径驱动FPP逐阶跳跃：每阶起跳—腾空—落脚呈抛物线镜头起伏，手部同步摆动，视觉经过格不触发额外查雷。
- [ ] 实际踩雷时播放贴脸爆炸粒子、强烈短时Camera Shake及快速向后倒退10格，最低停0；连锁按裁决事件逐次播放。震屏偏移独立叠加并最终归零，HUD保持可读；镜头和粒子不改变阶位/胜负。
- [ ] 本地交接在遮罩内切换眼位、Viewmodel及私有投影；回溯/重开取消旧attempt的跳跃、爆炸、后退、震屏及粒子。验证0阶截断、连续爆炸、双角色同阶和切换中退出无残留。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-05、AC-03、AC-50 | 本地已确认胜/负/平只写主账号；统计恒等式、历史字段和刷新后恢复正确；同matchId只一次 | 8解锁原子提交，10AI/联机主账号P2 |
| AC-31～AC-34、AC-45 | 改选/锁定/末牌/齐锁时点正确，基础2/3/5，出牌入公开区且不回库；重复提交不双扣 | 7技能前后顺序、护盾平局；10自动与人工竞争 |
| AC-35～AC-38、AC-41、AC-43、AC-44 | 真实出牌触发基础连爆；完成末轮全部移动/连爆再判耗尽，不按中间高度误判 | 7角色爆炸例外 |
| AC-39、AC-42 | 无时间资格时登顶/越40停40、登顶优先于耗尽；有资格路径只建立结构，不冒充回溯实现 | 7真实撤销候选终局 |
| AC-40 | 普通基础状态单向2/3/5，计本轮获胜；不能沿用旧“不计胜”口径 | 7验风4/岩6/水5及火连胜 |
| AC-29、AC-30、AC-56、AC-102 | 公开计数真实、私有交接清除、原地不触雷；有效出牌与秘密耗牌分离 | 7/8技能/回溯/转化 |
| AC-15、AC-46、AC-97 | 取消/确认退出和重开、刷新、保留档案及基础新局重置正确 | 7/8技能重置，9音乐区间，10AI/联机分支 |
| AC-11、AC-60 | 真实攀爬/退格/登顶姿态与逻辑阶数一致，记录本轮性能 | 10全矩阵 |

## 10. 第13步（迭代7）：前11名角色技能与来源压制

### 本轮目标与需求

把CH-01～CH-11的18个技能组件接入同一Game/Rule链和出牌界面，完成真实施放、被动、特效、时间回溯及冰对生命来源压制。对5/6已有基础流程增量修正，不建立第二套技能对局。

- 核心：FR-57～FR-68、FR-71、FR-72、FR-76。
- 关联：FR-14/FR-56前11特效、FR-20/FR-25～FR-43/FR-51～FR-52的角色例外；FR-44候选终局不得记账。
- FR-64的纯生命压制本轮完成；涉及黄金/融合的AC分支在8闭合。联机超时和AI决策在10复验。
- 质量：NFR-01、NFR-02、NFR-04～NFR-06。

### 文件与组件分工

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/model/skills/SkillComponent.gd`、`godot_project/scripts/model/skills/ActiveSkillComponent.gd`、`godot_project/scripts/model/skills/PassiveSkillComponent.gd`、`godot_project/scripts/model/Character.gd` | 完整组合契约，sourceOrigin/isSuppressed、触发、次数、目标与状态捕获/恢复 |
| 下表18个同名技能文件 | 各角色能力；ThunderBombCapacity复用4/5成果 |
| `godot_project/scripts/Game.gd`、`godot_project/scripts/model/JudgeRule.gd`、`godot_project/scripts/model/RoundSnapshot.gd`、`godot_project/scripts/model/CardLedger.gd`、`godot_project/scripts/model/BattleLog.gd` | 技能先于锁牌、角色修正、资源事务、回溯与有效历史 |
| `godot_project/scripts/view/GameView.gd`、`godot_project/scripts/utils/InformationProjector.gd`、`godot_project/scripts/view/CharacterModel3D.gd`、`godot_project/scripts/view/CharacterEffects.gd`、`godot_project/scripts/view/MountainMapRenderer.gd` | 主动面板、私有情报、次数/禁用原因、有效特效与撤销动画 |
| `godot_project/tests/unit/skills-first-eleven.gd`、`godot_project/tests/integration/skill-order.gd`、`godot_project/tests/integration/rewind.gd`、`godot_project/tests/integration/skill-privacy.gd`、`docs/acceptance/iteration-07.md` | 组件边界、组合裁决、知识/资源回溯差别与人工验收 |

| 角色 | 具体技能文件（均位于`godot_project/scripts/model/skills/`） | 必须实现的规则 |
| --- | --- | --- |
| 巴巴托斯 | `WindScissorsBonus.gd`、`WindFirstBombGrace.gd` | 剪刀双向/单向胜4；首次选中雷正常爆但免退，仍可雷弃牌 |
| 摩拉克斯 | `RockVictoryBonus.gd`、`JadeShield.gd` | 石头双向/单向胜6；1次盾含当轮2轮，平局进1，选中雷销毁且免退/雷弃牌 |
| 巴尔泽布 | `ThunderBombCapacity.gd`、`ThunderBombDiscard.gd` | 复验4/5；其所有雷实际爆炸使踏雷者随机秘密弃可用1牌，含自踩，0不负数 |
| 布耶尔 | `NatureRecon.gd` | 2次，当下前方1～10格且不越39，私下去重雷坐标；只报对手最多一种花色，不报数量，0报无牌 |
| 芙卡洛斯 | `WaterVictoryBonus.gd`、`WaterDefeatDraw.gd` | 布双向/单向胜5；2次激活本轮真实败局抽1，库0抽0，未触发不退已激活次数 |
| 赫布里穆 | `FlameWinStreak.gd` | 双向胜与单向胜都计连胜；第2胜起+2且仅焚选中1雷，不爆/不弃；平/负清连胜 |
| 瓦沙嘉 | `FreezeCard.gd`、`DivineSuppression.gd` | 冻结1次，锁牌前限制；仅冻牌可强制出，真实双向胜基础半数向上取整后加成；持续压制NABERIUS来源 |
| 伊斯塔露 | `TimeRewind.gd` | 1次，仅结果区恢复本轮技能前资源/普通技能状态，可撤销候选终局，所有时间已用次数不返还 |
| 阿斯莫代 | `SpaceOperation.gd` | 共享2次，移己雷至不同的1～39空阶，或差≤5换位且不触雷；首次显示己雷坐标暂扣、取消退、成功保留扣次 |
| 若娜瓦 | `DeathRetreat.gd`、`DeathCardBomb.gd` | 对手实际爆炸退13；1次耗指定1牌直接布雷，遵守总上限，耗末牌后本轮可跳过 |
| 纳贝里士 | `LifeExchangeBonus.gd`、`LifeReplenish.gd` | 准备库≥2抽至多3；主动1次手牌0～9且库非空抽至多3；冰压制时被动回普通2、主动禁用 |

### 工作顺序

- [ ] 统一组件来源、压制、阶段、次数及原子资格校验；先在领域层拦截，再投影按钮状态，不能只禁UI而后台仍给收益。
- [ ] 接入全部18组件；补齐生命准备兑换和冰压制，按第1.2节重验库余0/1/2/3及普通/生命差别。
- [ ] 双方按硬币顺序完成技能操作后才锁牌；即时技能后重新确定requiredActors，生命0牌补得后可出、死亡耗末牌后跳过；锁末牌仍揭示。
- [ ] 统一爆炸优先级：先火焚毁、再盾完整免疫、再风首次免退、再普通爆炸；实际爆炸才按归属雷弃牌，实际回退才受死亡13并继续连锁。
- [ ] 完成草/空间私有授权；空间源只列己雷、目标提交后由Game检查全场空格，不用目标颜色预先标出敌雷。无合法移雷方案不扣，换位仍按自身条件判断。
- [ ] 回溯恢复本轮技能前位置、牌、雷、公共库、账本、普通技能；同roundNo增加attemptId，废弃旧消息/动画/计时令牌，不回退已消耗时间次数、去重记录或合法已知信息。
- [ ] 时间可撤销本轮登顶/耗尽候选；无资格不新增等待。双盾同轮到40为平局，同雷冲突按设计硬币次序且不重复销毁。
- [ ] 将有效技能/压制/回溯表现接入模型，复验私有花色/雷位不经特效、日志、镜头泄露；按AC逐项人工验收。

- [ ] 验证FPP爆炸例外：死亡修正快速退13格，火焚毁/完整盾无实际受爆击退，风免退可爆炸但不退；不因“默认退10格”的表现要求覆盖技能裁决。主动技能同步Viewmodel、世界模型及本人周身粒子，私有情报不经镜头/持物/粒子泄露。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-62～AC-77 | 前11相关入口、次数、风/岩/雷/草/水/火/冰规则及模型特效正确；AC-63/65/74按单向计胜勘误执行，另验水单向布5 | 10AI/联机同等约束 |
| AC-78、AC-87～AC-89 | 纯生命对冰压制正确；兑换库2抽2/库1禁，主动库1/2抽尽、0禁且不耗次 | 8融合分支 |
| AC-79～AC-81、AC-39、AC-42 | 快照恢复、普通次数恢复、时间次数不返还；候选终局可撤销且无残留战绩 | 8融合/黄金回溯，10联机等待/超时 |
| AC-82～AC-86 | 空间仅己雷、暂扣/取消退款/共享2次、换位不炸；死亡退13和耗牌布雷整笔校验 | 10AI同等授权 |
| AC-20、AC-24、AC-25、AC-30、AC-55、AC-56 | 专属技能不重开普通准备；生命边界、授权与秘密耗牌不混公开历史 | 8黄金/融合准备 |
| AC-99～AC-104、AC-29 | 已实现技能组合下90实体守恒、双登顶、回溯知识/日志、脚下雷不重复触发、技能后重算出牌者 | 8炼金/融合分支，10全模式 |
| AC-61、AC-09、AC-15、AC-40、AC-97 | 前11真实特效/资料一致；新局技能/连胜/盾/首触标记重置；单向加成/连胜正确 | 8剩余角色，9音乐 |

## 11. 第14步（迭代8）：黄金技能、账号解锁与融合组合

### 本轮目标与需求

完成CH-12/CH-13在实际对局中的完整能力和账号闭环。复用3已交付的融合双生模型，接入黄金/生命两侧状态及特效，不重新建另一套规则系统。

- 核心：FR-48、FR-69、FR-70、FR-74。
- 关联：FR-03、FR-27～FR-28、FR-44、FR-47、FR-56、FR-64、FR-68、FR-71～FR-72、FR-76。
- 质量：NFR-01～NFR-05。正常解锁、测试改锁态和局内压制是三种不同状态。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/model/skills/GoldenFirstExchangeDiscount.gd`、`godot_project/scripts/model/skills/AlchemyTransmutation.gd` | 黄金首次成功准备优惠与每局2次、每次1～2张实体转化 |
| `godot_project/scripts/model/Character.gd`、`godot_project/scripts/model/characterCatalog.gd`、`godot_project/scripts/model/skills/DivineSuppression.gd` | 融合挂四个独立组件：黄金优惠/转化、生命兑换/补牌；保留各原来源 |
| `src/utils/AccountManager.js`、`src/utils/LocalStorageStore.js`、`src/model/AccountProfile.js`、`src/model/MatchRecord.js` | 正常胜利条件与战绩同事务解锁、当前账号测试开关 |
| `godot_project/scripts/Game.gd`、`godot_project/scripts/model/CardLedger.gd`、`godot_project/scripts/model/RoundSnapshot.gd`、`godot_project/scripts/utils/InformationProjector.gd` | 转化资源守恒、可回溯状态及精准来源门禁 |
| `godot_project/scripts/view/GameView.gd`、`godot_project/resources/character_specs.tres`、`godot_project/scripts/view/CharacterEffects.gd`、`godot_project/scripts/view/CharacterModel3D.gd` | 双主动、锁态、设置/选角测试入口、双生两侧实际状态与特效 |
| `godot_project/tests/unit/golden-skills.gd`、`godot_project/tests/unit/fusion-composition.gd`、`godot_project/tests/integration/fusion-unlock.gd`、`docs/acceptance/iteration-08.md` | 优惠/转化、组合压制、账号与候选结果反例 |

- [ ] 黄金首次成功准备牌换雷只耗1，失败不占优惠，之后恢复2；主动2次每次转1～2张未锁定手牌为指定其他花色，cardId/手牌数/公共库不变。
- [ ] 融合实例持有四个独立组件；黄金转化2次、生命主动1次两个按钮同时显示，互不消耗对方额度，不用多继承或同一可变组件共享。
- [ ] 冰对融合仅设置NABERIUS来源组件isSuppressed；生命兑换降普通2、生命主动禁用并说明原因，黄金首次优惠和转化2次继续生效；每次执行路径再次校验。
- [ ] 只对本账号本人以纯黄金击败纯纳贝里士的已确认有效胜利永久解锁；败/平/Guest胜/本人融合/对手融合/作废/候选胜均不误触。与战绩统计在同一账号事务提交且幂等。
- [ ] 选角页与设置页都提供测试解锁/重置融合锁态；只改当前账号，不造胜场、不清历史，不影响其他账号；未确认融合选择被重置后需重选，已确定角色不允许局中改锁态。
- [ ] 复验3的双生模型在真实对局中左右特征、双主动及局部压制表现；回溯恢复转化/普通次数和账本，取消候选胜不得残留解锁。

- [ ] Godot提交不可回溯结果，宿主在战绩同一事务核验黄金胜纳贝里士并解锁CH-13；回传profile_updated，返回原首页立即刷新隐藏角色状态。覆盖败/平/Guest/候选胜利、P2视角、重复消息及跨账号请求反例。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-90、AC-91 | 首次优惠成功/失败、1～2张转化、3张/不存在/原花色/已锁牌拒绝、次数独立正确 | 10AI黄金策略 |
| AC-92、AC-93、AC-78、AC-87 | 融合四组件全部继承；生命兑换余2抽2；冰只压生命来源，黄金照常 | 10联机分席一致 |
| AC-49、AC-03、AC-50 | 本地已确认条件胜利与统计原子解锁，反例不解锁、刷新/切号隔离、重复结果不双记 | 10AI及联机本人P2胜利 |
| AC-94、AC-48 | 两处测试入口、当前账号持久化、重置不删资料、不改已确定角色，解锁后可选 | 10完整设置页整合 |
| AC-09、AC-61 | 13模型/完整技能资料与真实能力、融合两侧/双主动/局部压制一致 | 10全模式复查 |
| AC-25、AC-56、AC-99、AC-101、AC-104 | 黄金/融合准备、秘密耗牌、转化、补牌及回溯下实体守恒和有效历史正确 | 10远端/AI授权与全组合回归 |

## 12. 第15步（迭代9）：六曲BGM、悬浮播放器与交互音效

### 本轮目标与需求

实现可独立试听、无外部音频文件也能发声的六曲多轨合成，以及旋曜玉帛悬浮播放器、可选本地MP3、动态切歌和全套SFX。此前各轮音频占位在本轮替换为真实控制。

- 核心：FR-16～FR-19、FR-53、FR-54。
- 关联：FR-04播放器、FR-11音频偏好、FR-20/FR-75新局音乐重置、FR-33/FR-72音频私密性。
- 质量：NFR-02～NFR-07。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/utils/GenshinAudioManager.gd` | 场景/高度选曲、两个播放槽、音量/暂停/静音/模式、SFX、首次手势及生命周期 |
| `godot_project/scripts/utils/ScoreSynthesizer.gd`、`godot_project/resources/audio/scores.tres` | 六份对应指定旋律的音高/时值/休止/速度/分轨/乐器/和声/循环谱，按音频时钟调度 |
| `godot_project/scripts/utils/LocalMp3Source.gd` | Web适配器转交文件字节，GDScript用AudioStreamMP3解码、AudioStreamPlayer播放，失败回退并释放临时引用；不删除用户文件 |
| `godot_project/resources/audio/sfx_specs.tres` | 点击、币、取牌、兑换、布雷、锁牌/揭牌、移动、爆炸、技能/回溯/终局合成规格 |
| `godot_project/scripts/view/GameView.gd`、`src/model/Settings.js`、`src/utils/AccountManager.js`、`godot_project/scripts/utils/InformationProjector.gd`、`godot_project/scripts/Game.gd` | 共用偏好和授权事件，真实播放器状态、保存/切号同步 |
| `godot_project/tests/unit/audio-policy.gd`、`godot_project/tests/integration/audio-lifecycle.gd`、`docs/acceptance/iteration-09.md` | 曲目策略/区间/会话生命周期；旋律、音量与声画人工试听记录 |

- [ ] 独立完成六曲可辨旋律多轨谱：《Twilight Serenity》《Bustling Afternoon in Mondstadt》《Moonlike Smile》《Rex Incognito》《Termination of Desires》《Rage Beneath the Mountains》；不以六个名字复用一段通用音替代。
- [ ] Godot AudioStreamGenerator内置合成为默认；本地MP3按选定曲目挂载，正常同曲只用一种音源；无效文件静默回退同曲合成并保留暂停/静音/音量。
- [ ] 首页/图鉴/选角/候选或最终终局用黄昏；选牌/准备及0～15用蒙德午后，16～30笑颜，31～39尘世；特殊两曲可手动播放，不增加角色自动映射。
- [ ] 记录已实际到达的最高音乐区间，含本轮35后炸回25；踩雷和回溯均不降区。候选终局回溯后恢复登山场景并按保留高区选曲。
- [ ] 1.5秒双槽平滑切换，两槽独立游标；暂停同时冻结两槽/过渡，自动切歌不擅自解除主动暂停。
- [ ] 播放/暂停、上下首、单曲循环、自动/手动锁曲、BGM/SFX各0～100%和各静音完整；手动选曲锁到恢复自动或新局，新局保留账号音量偏好。
- [ ] 按03-design第8.4节验证Godot Web自动播放限制；异步引擎加载后如需新手势，提供点击启用音频入口。Godot维护真实等待/播放/暂停状态；原首页播放器经桥接控制同一引擎音频管理器，尊重暂停/静音。
- [ ] 全套SFX消费授权事件，暗选不以音色编码花色、布雷不以声像编码暗坐标；声音关闭仍可对战。检查音频调度与3D同时工作时的帧率/响应。

### 本轮验收

| AC编号 | 本轮通过条件 | 后续补充 |
| --- | --- | --- |
| AC-13、AC-57 | 场景/高度映射、1.5秒过渡、实际到达高区不回切、候选回溯、手动锁曲/恢复/新局/暂停正确 | 10AI/联机同等事件集成 |
| AC-14、AC-58 | 六曲独立可辨、全部SFX，无外部音频可完整发声；有效MP3可用、失败静默回退 | 10全模式交互覆盖 |
| AC-47、AC-59 | 首次受限→按钮唤醒及真实状态；用户主动暂停/静音不被取消；音频异常不改游戏资源 | 10四浏览器实测 |
| AC-10、AC-03 | BGM/SFX各控件独立、设置/播放器一致、按账号恢复 | 10设置页完整性 |
| AC-15、AC-97、AC-60 | 重开重置音乐区间/手动锁曲，保留音量；记录音画同时运行的性能 | 10兼容性完整矩阵 |

## 13. 第16步（迭代10）：公平AI、双窗口联机与设置完善

### 本轮目标与需求

在已有完整本地规则/角色/音画基础上增加两档公平AI与同源双窗口房间码对战，补齐设置页面，并关闭跨模式AC。此轮共用一个Game和一套规则，不再分别实现AI版/联机版技能。

- 核心：FR-07～FR-09、FR-11、FR-49、FR-50、FR-73。
- 联机/AI分支：FR-20～FR-24、FR-27～FR-36、FR-44～FR-48、FR-51、FR-55、FR-57～FR-76；FR-74已有测试入口与正式设置页合并。
- 回归范围：FR-01～FR-76、AC-01～AC-104；按第1.2节修正旧预期。质量为NFR-01～NFR-07。

### 文件、类与工作顺序

| 拟建/修改文件 | 类与职责 |
| --- | --- |
| `godot_project/scripts/model/AIPlayer.gd`、`godot_project/scripts/utils/InformationProjector.gd`、`godot_project/scripts/utils/RandomSource.gd` | 简单/困难策略，只消费本人、公开及合法技能返回值 |
| `godot_project/scripts/NetworkManager.gd`、`godot_project/scripts/model/RoomSession.gd` | 6位字母数字码、两席、双方就绪、有效期、双通道、权威命令与计时 |
| `godot_project/scripts/Game.gd`、`godot_project/scripts/model/RoundSnapshot.gd`、`godot_project/scripts/model/JudgeRule.gd` | 远端命令统一门禁、步骤期限/去重、回溯新attempt及正常/离开终结协调 |
| `src/utils/AccountManager.js`、`src/utils/LocalStorageStore.js`、`src/model/MatchRecord.js` | 各客户端主账号记账、联机P2解锁、共享终局写锁和重复结果处理 |
| `godot_project/scripts/view/GameView.gd`、`src/model/Settings.js`、`godot_project/scripts/utils/GenshinAudioManager.gd`、`godot_project/scripts/view/MountainMapRenderer.gd` | 房间/连接/倒计时、完整设置、播放器同步及各模式表现接线 |
| `godot_project/tests/unit/ai-observation.gd`、`godot_project/tests/unit/room-session.gd`、`godot_project/tests/integration/network-sync.gd`、`godot_project/tests/integration/network-timeout.gd`、`godot_project/tests/integration/network-final-result.gd` | AI受限输入、房间边界、双通道去重、计时竞争、关闭与终局一致性 |
| `docs/acceptance/iteration-10.md`、`docs/PROGRESS.md` | 最终跨模式、四浏览器/两分辨率证据及用户验收状态 |

- [ ] 简单AI采用合法资源内随机/基础策略；困难AI利用公开历史、库余量、位置、自身资源和合法情报规划。两档均遵守同一冻结、压制、次数、雷上限，不承诺固定胜率。
- [ ] AI策略入口只收不可变/深复制授权值对象，不持有Game、敌Player、全场雷或秘密账本引用；困难假设模拟不能注入真实隐藏分布。合法手动指定AI角色必须照用，锁定融合不可选。
- [ ] 实现同一浏览器配置文件、同源站点的双窗口/标签页通信：BroadcastChannel主通道、LocalStorage事件备用；不是跨浏览器或公网房间。
- [ ] 系统生成6位字母数字码、活动冲突重生成，可复制/手输；房主P1、加入P2，仅2席无观战；各自就绪立即选角；无效/失效/满员/已开局拒入。闲置超10分钟或房主离开失效，等待期离开不记胜负。
- [ ] 房主权威Game定序随机/命令，只向各席投递其授权投影；不广播完整Game或账号凭据。消息校验roomId/matchId/席位/commandId/revision/attemptId/stepToken，双通道重复消息只一次。
- [ ] 初选当前单步15秒，其余等待选角/准备/技能/锁牌/回溯决定45秒，绝对deadline且操作不续期。超时随机合法选角/实体取1、准备保留结果并锁定、技能不乱施法、未完空间取消退款、合法最多花色锁牌、放弃回溯不扣次。
- [ ] 联机快速补齐默认仅代本人当前1张，双方同意才能整批；一方准备锁定不影响另一方独立操作，齐锁才统一公开。人工/自动竞争只有首个合法完成动作生效。
- [ ] 关闭/刷新/退出识别后判留存方胜，无续连；不把单次心跳迟到或普通操作超时当离线。正常终局和离开判胜先在同一命名Web Lock内写共享最终记录；已有结果沿用，无结果才提交留存胜。
- [ ] 专测房主已确认正常结果、尚未广播就关闭：P2读既有结果，不误判自己获胜。晚到消息不得覆盖最终结果；存储失败不伪报两套结果。每端只写本端主账号，P2按P2视角记账/解锁，不替关闭端补造败绩。
- [ ] 联机重开按退出旧局判胜后重建/加入/就绪，不提供单方清空。AI重开回选角、保留可编辑配置，重新初始化全部局内状态。
- [ ] 完整设置页汇合BGM/SFX各音量与静音、镜头跟随、音乐模式及测试锁态；与播放器共用Settings并按账号保存，不重复建档。
- [ ] 在目标四浏览器/两分辨率记录首屏、反馈、帧率、三模式全流程及音频受限情形；逐条整理全量AC证据、反馈修正后交最终验收，不自动宣布课程项目已验收。

- [ ] 三模式验收FPP席位边界：本地按交接后行动角色切换；AI回合保留人类眼位，联机每端保持本人眼位并观看对手完整模型公开动作，不跳入对手私有视角。独立锁牌不因先锁者切换相机。
- [ ] 在Chrome/Edge/Firefox/Safari与两目标分辨率实测FPP、13套Viewmodel、柱廊云海、战术远端布雷、逐阶跳跃、贴脸爆炸震屏与快速10/13格后退；记录帧率、可见反馈、近裁剪/遮挡及回溯取消结果，未测项明确保留待验。

### 本轮验收

| AC编号 | 本轮通过条件 |
| --- | --- |
| AC-06、AC-95、AC-96 | 两档AI完整对局、指定角色不被替换、不超量/不读敌秘密，合法草情报/空间己雷授权与人类一致 |
| AC-07、AC-08、AC-51 | 房间码、两席就绪/失效/拒入正确；亮牌/位置/连爆/结果/分席私有数据同步一致 |
| AC-19、AC-27、AC-28 | 联机快速补齐同意边界、独立准备、竞争最后2张牌及重复兑换原子处理 |
| AC-45、AC-52～AC-54 | 15/45秒按步骤生效，自动/人工竞争只一次，准备不重置计时，冻结合法锁牌/无牌跳过正确 |
| AC-39、AC-42、AC-79～AC-81、AC-100 | 联机候选/回溯及超时一致，旧attempt消息/动画作废，同轮双登顶/同雷冲突正确 |
| AC-46、AC-50、AC-98 | AI中断不记；联机离开留存胜、无续连、重开不能单方重置；正常终局与离开冲突只一最终结果、一次记账 |
| AC-03、AC-48、AC-49、AC-94 | 双窗口账号不串、各席按本人解锁列表选角；AI和联机主账号P2正常条件解锁，测试入口只改当前账号 |
| AC-04、AC-09、AC-10、AC-13～AC-15、AC-47、AC-57～AC-61 | 原占位全部由对应功能替换，完整图鉴/设置/播放器一致；四浏览器两分辨率、六曲/音效与3D性能实测 |
| AC-01～AC-104 | 汇总每条原始AC及第1.2节勘误后的预期，三模式覆盖适用分支；未执行/失败/无法测量的项据实记录，不记通过 |

## 14. 全量追踪与验收出口

### 14.1 FR覆盖索引

“主要完成轮”表示完成相应功能主体；所有跨模式分支在10收口，不把早期阶段样例替代全模式验收。

| 需求编号 | 主要完成轮及后续接线 |
| --- | --- |
| FR-01～FR-03 | 1账号基础，4账号锁，6真实战绩，8解锁，9/10完整偏好和双窗口 |
| FR-04～FR-06 | 1首页/统计结构，4席位绑定，6本地记账，9播放器，10三模式完整导航/资料 |
| FR-07～FR-09 | 4AI配置，10AI决策与房间/通信 |
| FR-10～FR-11 | 3完整资料/模型预览，2镜头偏好、9音频偏好、10全设置；7/8复核技能说明 |
| FR-12～FR-15 | 1首页视觉、2地图镜头、3模型、5己雷查看、6真实移动、7授权技能标记 |
| FR-16～FR-19 | 9六曲/切歌/播放器/SFX；10全模式接线 |
| FR-20～FR-24 | 4初始化/硬币/初选；7/8技能重置，9音乐重置，10AI/联机分支 |
| FR-25～FR-31 | 5普通准备/上限/布雷，7生命及冰、8黄金及融合准备修正，10并发/独立准备 |
| FR-32～FR-35 | 4初选投影、5统一公开、6公开历史、7/8技能授权/回溯、10AI与远端 |
| FR-36～FR-38 | 6基础锁牌/裁决/单向，7技能顺序/加成与特殊资源变化，8融合，10全模式 |
| FR-39～FR-41 | 5规则级基础落脚，6真实移动集成，7角色炸弹例外、8融合组合 |
| FR-42～FR-44 | 6候选/最终及记账，7时间回溯，8解锁原子提交，10共享联机结果 |
| FR-45～FR-46 | 1存储异常、4～8命令与资源拒绝、6本地中断，9MP3例外，10联机离开与无续连 |
| FR-47～FR-48 | 3模型/资料，4选角，8正常/测试解锁，10三模式本人席位 |
| FR-49～FR-50 | 10就绪、房间有效期与步骤计时 |
| FR-51～FR-52 | 5普通雷调整/秘密销毁，6出牌历史，7空间/死亡/雷弃/回溯，8炼金与融合 |
| FR-53～FR-54 | 9本地MP3、内置六曲合成与首次手势，10四浏览器实测 |
| FR-55～FR-56 | 2默认FPP/战术俯瞰及辅助五焦点，3全13模型与Viewmodel，6第一人称跳跃/爆炸/震屏/退格，7/8技能例外与融合，10三模式/性能收口 |
| FR-57～FR-68 | 7前11角色完整技能，4/5已先做雷容量；8补黄金/融合相关分支，10AI/联机 |
| FR-69～FR-70 | 8黄金与融合四组件、双主动及冰局部压制 |
| FR-71～FR-72 | 4实体/投影基础，5/6资源账本，7/8技能组合和授权，10策略/远端公平边界 |
| FR-73～FR-74 | 4AI指定配置，8两处测试锁态入口，10AI决策与完整设置 |
| FR-75～FR-76 | 6基础重开和回合顺序，7/8技能/回溯/融合，9音乐重置，10AI/联机 |

### 14.2 AC覆盖索引

| AC编号 | 首验与补充/最终闭合 |
| --- | --- |
| AC-01～AC-04 | 1首验账号/首页；3/4/6/8/9增量，10补全所有入口/偏好/并发 |
| AC-05～AC-08 | 4身份、6本地；10AI/联机 |
| AC-09～AC-12 | 2地图/镜头、3图鉴模型、5己雷；7/8技能，10全设置与实战 |
| AC-13～AC-14 | 9首验，10全模式音频 |
| AC-15～AC-19 | 4开局/初选，5保密时点、6～9重置；10联机初选与快速补齐 |
| AC-20～AC-28 | 5普通准备，7生命/空间，8黄金/融合，10独立准备/并发；AC-24采用第1.2节勘误 |
| AC-29～AC-38 | 5首次公开/基础雷、6锁牌/揭示/真实移动；7/8技能与资源例外；10远端/AI |
| AC-39～AC-45 | 6基础终局/末牌/幂等，7回溯/单向加成，10全模式；AC-40采用单向计胜 |
| AC-46～AC-50 | 6本地退出/战绩、8解锁、9音频异常，10AI/联机/主账号P2 |
| AC-51～AC-54 | 10联机房间、15/45秒与合法代操作 |
| AC-55～AC-56 | 5普通调整/秘密区，6公开出牌，7空间/耗弃牌/回溯，8黄金/融合，10联机 |
| AC-57～AC-59 | 9真实音频首验，10四浏览器与全模式 |
| AC-60～AC-61 | 2地图性能、3全13造型/动作，6真实运动、7/8技能特效，9音画并行，10完整实测 |
| AC-62～AC-77 | 7完整人类技能，10AI/联机；AC-63/65/74按单向计胜勘误，AC-72补单向水布5 |
| AC-78～AC-81 | 7纯生命压制/时间，8融合/黄金，10联机回溯及超时 |
| AC-82～AC-89 | 7空间/死亡/生命，8融合，10AI授权；AC-87/89按最新牌库余量边界 |
| AC-90～AC-94 | 8黄金/融合/测试解锁，10全模式与设置页 |
| AC-95～AC-98 | 4AI指定配置、6本地重开、7～9完整状态重置；10AI实战/联机重开 |
| AC-99～AC-104 | 7已有技能组合，8补炼金/融合，10全模式资源/信息/终局顺序 |

### 14.3 每轮交付与用户验收

1. **开始门槛：** 前一轮有用户验收确认，当前轮获得开发授权；只实现本轮范围。
2. **开发者验证：** 对规则、持久化、去重和信息边界使用有价值的自动化用例；纯视觉/旋律以人工检查为主，不为低影响文字改动堆实现镜像测试。
3. **运行说明：** 每轮提供实际可运行命令、入口、前置账号/角色/夹具与具体AC样例。保留首页开发`npm run dev`、构建`npm run build`及Node账号测试`npm test`。Godot检查使用`godot --headless --path godot_project --editor --quit`；规则测试入口在迭代2创建`godot_project/tests/run_tests.gd`，运行`godot --headless --path godot_project --script res://tests/run_tests.gd`；Web导出`godot --headless --path godot_project --export-release Web ../public/godot/index.html`（前提为安装匹配模板并配置Web预设）。Godot可执行名按本机实际路径替换，Web端另验真实浏览器桥接、音频、图形及焦点；Node测试不能代替Godot规则测试。
4. **人工反馈：** `docs/acceptance/iteration-NN.md`记录版本、环境、操作、对应AC/子项、预期/实际、证据和待修问题；不伪造未执行的浏览器或音频测试结果。
5. **修正回归：** 修复本轮失败并复验受影响的前轮功能；有新变更/失败/未决风险才扩大测试，不在已通过后无依据反复重跑。
6. **状态更新：** PROGRESS先记“待人工测试/待用户验收”，仅在用户明确认可后记“已验收”；跨轮AC逐项记录已验子项与剩余分支。
7. **停止点：** 交付本轮结果并等待确认，不自动启动下一轮。第10轮功能完备也仍须最终人工验收，不能由代理自行代签。

## 15. 当前状态

第7步（迭代1）已实现并经用户验收：首页UI、白昼天空岛动态视觉及本地多账号系统完整保留。已有旧迭代2 Three.js预览与历史证据继续保留，但第8～16步现统一按Godot 4.x重新组织后续实施与验收。**本次仅更新两份文档，Godot工程、桥接、FPP/Viewmodel及其验收尚未实施；不把既有Web预览证据当作Godot通过证据。** 动态历史状态仍参考PROGRESS.md；技术方案冲突以本次用户指令及03/04的v1.2为准。

