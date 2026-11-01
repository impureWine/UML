# 迭代11：部署与跨设备联机指南

## 本地启动

要求 Node.js >=22.12，终端进入项目根目录：

```powershell
npm ci
npm run build
npm start
```

浏览器打开 http://localhost:3000 。同一端口提供 dist 静态资源、/health 健康检查及 /ws WebSocket。修改源码后重新 build；npm run dev 仅提供 Vite 前端，联调需将高级地址设置为 ws://localhost:3000/ws。
端口被占用时使用 `$env:PORT='3001'; npm start`。出现 EADDRINUSE 应换端口，不终止未知进程。

## 手机与电脑局域网测试

1. 电脑运行上述服务，执行 ipconfig 查当前 Wi-Fi IPv4。
2. 手机连接同一 Wi-Fi，双方访问 http://电脑IPv4:3000 。只在信任的局域网为 Node 入站 TCP 3000 放行；关闭路由器客户端隔离。
3. 两端分别注册/登录本地账号，电脑建房，手机输入六位码加入，双方就绪。
4. 地址栏 localhost 在手机上指向手机本身，不能用于连接电脑。房间状态应显示公网服务器连接（含局域网服务），不能是本地回退。
5. HTTP 局域网地址下部分浏览器不支持安全上下文 Web Crypto/本地账号操作；此时使用可信 HTTPS 反向代理或下面的云端 HTTPS 地址完成手机测试。不要修改浏览器安全设置。

## Render 公网部署

1. 将项目与锁文件提交到自己的 Git 仓库（不要上传 node_modules、dist 或账号导出数据）。
2. 登录 Render，New → Blueprint，关联仓库，选择根目录 render.yaml，检查服务名与免费套餐后创建；也可 New → Web Service 手工选择 Node。
3. 手工配置 Build Command：`npm ci && npm run build`；Start Command：`npm start`；Node 22，健康路径 /health。
4. 等待日志出现 Game server listening；平台提供 PORT，勿硬编码覆盖。
5. 打开分配的 HTTPS 域名，默认自动使用同域 wss://域名/ws。双方分别使用家庭 Wi-Fi 和手机移动数据打开同一地址测试。
6. 免费实例可能休眠、冷启动或因额度停用；首次等待唤醒并刷新，确认连接成功后再建房。内存房间在重启或部署时消失，本轮不支持恢复。
7. 不要扩容成多实例：房间存在单进程内存；扩容需另做共享房间存储与会话路由。

## Railway 部署

1. 登录 Railway，新建项目并关联仓库；根目录 Dockerfile 可用于容器构建。
2. 如果自动识别为 Node，指定构建 `npm ci && npm run build`、启动 `npm start`，Node >=22.12。
3. 在服务 Networking/公共网络设置中生成公开域名，应用监听平台 PORT 与 0.0.0.0；健康检查 /health。
4. 访问 HTTPS 域名，按 Render 同样的跨网流程验证。查看日志排查 build、PORT、WebSocket 升级失败。
5. Railway 的试用额度、免费资格与计费以账号控制台为准，不能保证长期免费；无可用额度时选 Render 免费实例。

## Docker

```powershell
docker build -t climb40 .
docker run --rm -p 3000:3000 -e PORT=3000 climb40
```

## 高级地址与隐私边界

高级设置可填完整 ws://主机:端口/ws 或 wss://域名/ws；HTTPS 前端必须连接 wss。留空恢复同域。此设置保存在当前浏览器；独立后端需配置代理允许 Upgrade/Connection、长连接超时及TLS。
公网连接建立失败才会自动退到同机 BroadcastChannel；已进入公网房间断线不会创建第二局。回退依赖同源、Web Locks，仅适用于支持这些API的桌面浏览器，不具备跨网能力。
服务器不接收账号密码，不同步 LocalStorage。解锁池由客户端申报，不能防止用户篡改自己的本地账号/角色权限；服务器负责规则与对手私有状态保护，不提供云端身份认证、反DDoS或持久化战绩认证。
网络黑洞的判定最多一个2秒周期加1秒Pong等待；健康进程调度和网络传输是三秒时限的前提。免费平台休眠/服务端断网不能保证向客户端送达结果。

官方参考（2026-11-01核对）：[Render Node部署](https://render.com/docs/deploy-node-express-app)、[Railway部署指南](https://docs.railway.com/guides/deploy)。云端界面及免费政策可能变化。
