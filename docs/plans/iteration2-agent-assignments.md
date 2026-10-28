# 并行任务分工

任务传输可能出现不可读 token，请各代理按自己的 task_name 读取以下任务。所有任务禁止删除文件，不需要等待用户确认，主对话已授权迭代2，主代理负责集成。

## mountain_scenery

只创建 src/view/MountainScenery.js。导出 buildMountainScenery(scene) 返回 {update(elapsedSeconds),dispose()}，自身管理Group和资源。Three.js 已由主代理安装。阶梯由主代理创建，i阶锚点(0,i*1.15,-i*1.8)，宽8/深1.85/厚0.8；保持路径x±4.5范围无遮挡。创建精致低多边形原神风格地景：0～15浮空草地岩壁、松树与山脚侧边帐篷；16～30旁侧雪峰冰晶；31～39浮岛；40阶后方(z<-75,y46)有象牙金色门廊和王座。共享材质/几何，适度云海和远山、细金轨道。根代理管理灯光相机。禁止角色与玩法。控制绘制调用，重复树叶可用实例。仅写此源文件与docs/acceptance/iteration2-scenery-notes.md说明。

## map_data

只负责src/model/StepCell.js、MountainBoard.js、src/utils/InformationProjector.js、tests/unit/mountain-board.test.js和信息投影测试。StepCell只读index/zone/name/canPlaceBomb/milestone；zone为forest(0..15)、snow(16..30)、sky(31..40)，0/40不可布雷，0/10/20/30/40 milestone=true。MountainBoard.steps为41只读阶，getStep(index)拒绝越界/小数。InformationProjector.mapPreview({p1Step=0,p2Step=0,activeSeat='P1'}={})输出{steps,positions:{P1:0,P2:0},activeSeat:'P1'}且不透传任何私有字段，输出只读/防修改。可static方法。Renderer只消费该结构，不传入整个Game。先写有意义的边界测试、运行失败、实现后再次运行。禁止游戏规则、角色、布雷操作。记录验证至docs/acceptance/iteration2-data-notes.md。
