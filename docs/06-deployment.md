# 迭代11：部署与跨设备联机

## 本地运行

需要 Node.js >=22.12。

```sh
npm ci
npm test
npm run build
npm start
```

打开 http://localhost:3000。服务端监听 0.0.0.0，端口由 PORT 指定（默认3000）。两台同一局域网设备可以访问电脑的局域网 IP:3000（需允许防火墙入站）。公网必须部署，不能把 localhost 发给朋友。

联机页可选择：自动、P2P、WebSocket、同机。自动先检查同源 /health 协议，再尝试 PeerJS 公网信令，失败后回退同机；双方必须使用同一模式。跨网失败请选择 WebSocket，不能把同机回退当作跨设备成功。WebSocket 地址留空使用当前域名 /ws，也可以填写 wss://服务域名/ws。HTTPS 页面必须使用 WSS。

## Vercel 静态部署（推荐 P2P）

1. 将项目推送到自己的 Git 仓库。
2. Vercel 新建项目并导入仓库，选择 Vite；仓库中的 vercel.json 指定 npm run build 和 dist。
3. 部署后打开生成的 HTTPS 地址。双方选择公网P2P，房主建房并分享6位码，另一台设备加入并各自就绪。
4. 可用 https://vercel.com/new/clone?repository-url=你的仓库HTTPS地址 建立自己的部署入口。

静态部署不运行 server.js。Peer ID 为 genshin-climb-room-加房间码，PeerJS 打包到前端，信令使用 PeerJS 默认公共服务。它不是完全离线或不依赖第三方的服务。不同 NAT/运营商可能阻断直连；当前未配置付费 TURN，遇到此情况改用服务器模式。

官方说明：https://vercel.com/docs/frameworks/frontend/vite ，https://peerjs.com/docs/

## GitHub Pages

推荐建立 用户名.github.io 根站点仓库或配置自定义域名：当前已有图片/音频采用 /images、/audio 根路径。

1. 本地运行 npm ci 和 npm run build。
2. 把 dist 的内容发布到 Pages 发布分支根目录，在仓库 Settings → Pages 选该分支。
3. 等待发布完成，使用 HTTPS 地址进行 P2P 测试。
4. 普通 /仓库名/ 子路径站点虽可运行 build:pages，但现有根路径媒体不会自动改写；请使用根站点/自定义域名保证所有资源正常。

## Render 全栈部署

1. 将仓库连接到 Render，选择 New → Blueprint 导入 render.yaml；也可选择 Web Service 手动配置。
2. Build Command：npm ci && npm run build；Start Command：npm start；健康检查：/health。
3. 等待 HTTPS 服务上线。两设备打开同一地址，自动模式将探测服务器，也可显式选择 WebSocket。
4. 静态前端与服务器分开部署时，双方填写相同的 wss://你的服务.onrender.com/ws。

官方步骤：https://render.com/docs/deploy-node-express-app 。免费方案及限额以平台控制台为准；休眠、唤醒或服务重启会中断内存房间，不能当作持久化竞技服务。

Railway 可导入仓库并使用 Dockerfile，或本地执行 docker build -t climb40 . 然后 docker run -p 3000:3000 climb40。平台提供 PORT 时程序自动采用。Docker构建前请先安装依赖生成锁文件；不需要提交 node_modules。

## 权威、隐私与账号边界

P2P由P1执行原有规则、随机数、15/45秒超时；WebSocket由Node中相同Game与NetworkManager规则执行，浏览器仅发送命令和阶段token。服务器将连接绑定席位，拒绝冒充其他席位、过期token、非法命令；限制包大小和请求频率。两种网络仅发送 getSnapshot + project 按席位过滤的视图，禁止直接序列化match、账本或牌库对象。手牌、库存、己雷和技能情报只进入本席位视图。对手未亮牌、秘密销毁区、未引爆敌雷不随状态发送。

P2P房主仍能检查自己的完整权威内存并修改程序；静态P2P不能提供对房主的防作弊保障。服务器只信任基础12角色，不采信本地账号的CH-13解锁声明。本地账号、密码和战绩不上传、不跨设备同步；战绩仍由原AccountManager幂等写入本设备。没有云端账号认证或服务器持久化排行榜。

心跳每500ms发送，250ms检查，超过2500ms未收到包视为断线；正常关闭连接会立即处理。在活动页面和正常调度条件下目标小于3秒。系统休眠、浏览器后台冻结、断电或本端自身断网无法严格保证3秒；P2P网络分区可能双方各自本地判胜，需可信服务端才能仲裁。服务端掉线不属于对手投降。当前不支持断线续局或多实例房间共享；部署只运行一个实例。

## 跨设备验收清单

1. 电脑用家庭Wi-Fi、手机用移动数据，同一部署版本分别注册/登录，各自就绪。
2. 逐一测试P2P和WS：建房、错误码、第三人入房、选角、硬币、抽牌、准备、同时锁牌、技能、结算、战绩仅记一次。
3. 查看状态栏Ping；开发者工具Network检查WS帧或调试PeerJS数据，P2视图不得含P1手牌花色、库存、暗雷、销毁账本。布耶尔/空间授权情报应仅本人可见。
4. 分别关闭P1/P2页面，活动对手端应在约3秒内处理判胜并入账；再测选角期间离开、主动退出、重复断线事件。
5. 断外网后选择同机模式，在同一浏览器同源两个窗口验证原流程；另复测本地/AI与本地账号切换。
6. npm test 包含真实本地WS双客户端测试；它不替代手机跨运营商、TURN穿透、后台节流与完整技能人工验收。
