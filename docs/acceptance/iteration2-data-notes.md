# 迭代2地图数据与公开投影检查

日期：2026-10-28。负责子任务：map_data。

## 已创建

- `src/model/StepCell.js`：只读的 index/zone/name/canPlaceBomb/milestone，整数0～40校验。地貌 forest=0～15、snow=16～30、sky=31～40。0/40禁布雷；0/10/20/30/40为关键阶。没有炸弹、玩家、技能或对局状态。
- `src/model/MountainBoard.js`：只读41阶定义，`getStep(index)`查询且拒绝非法阶号。空间锚点由Renderer持有。
- `src/utils/InformationProjector.js`：`InformationProjector.mapPreview({p1Step=0,p2Step=0,activeSeat='P1'}={})`返回只读`{steps,positions:{P1,P2},activeSeat}`。只读取三个白名单字段，不透传或读取敌雷、手牌等额外字段。默认双席同在0阶，未创建真实对局。
- `tests/unit/mountain-board.test.js`：5项边界/不可变性测试。
- `tests/unit/information-projector.test.js`：4项默认状态、最小权限、不可变性和非法输入测试。

## 实际运行

1. 先写测试并运行`node --test tests/unit/mountain-board.test.js tests/unit/information-projector.test.js`：因实现文件尚不存在出现预期`ERR_MODULE_NOT_FOUND`，退出码1。
2. 实现后再次运行同一命令：9项通过、0失败，退出码0。
3. 运行`npm test`：全量38项通过、0失败，退出码0，Node.js v26.2.0。

测试覆盖15/16与30/31分区边界、31～39仍可布雷、0/40端点、五个里程碑、越界/小数/非数值拒绝、整个对象树防修改、使用抛错getter证明投影不会读取暗雷/手牌字段。

本子任务未删除文件、未改动账号系统、未实现布雷/战斗/角色模型，也未声明浏览器视觉验收。
