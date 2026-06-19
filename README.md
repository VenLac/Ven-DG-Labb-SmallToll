# VenWolf

> DG-Lab 郊狼游戏惩罚中心 —— 把游戏里每一次「失误」变成真实的电流反馈。

VenWolf 是一个基于 Web 的 DG-Lab 郊狼（Coyote）设备游戏联动控制台：把游戏内的事件（受伤、战败、自定义触发条件等）通过 HTTP / WebSocket 上报到本中心，由中心统一调度强度与波形，并输出到已连接的 DG-Lab 设备。

本项目二次开发自 [hyperzlib/DG-Lab-Coyote-Game-Hub](https://github.com/hyperzlib/DG-Lab-Coyote-Game-Hub)，感谢原作者的开源贡献。

## 功能特性

- **Web 控制台**：浏览器即开即用，无需额外安装客户端。
- **强度控制**：基础强度 + 随机强度区间，支持设备/通道强度上限钳制。
- **波形系统**：内置波形列表，支持单波形 / 顺序 / 随机播放，可自定义波形。
- **游戏模式**
  - **Minecraft 受伤惩罚**：通过 KubeJS 监听玩家受伤并上报，按惩罚倍数临时叠加电击强度，支持普通 / 超叠两种叠加模式。
  - **小游戏**：敬请期待。
- **多端连接**：支持 DG-Lab 第三方便利协议 WebSocket 客户端、本地客户端连接。
- **MCP API**：支持 Model Context Protocol，可由兼容 MCP 的 AI 客户端接入控制。
- **第三方插件 HTTP API**：启动后访问 `/api/docs` 查看 OpenAPI / Swagger 文档。
- **皮肤 / 通知**：自定义控制台皮肤主题、站点通知。

## 注意事项

请遵守直播平台的相关规定，不要违规使用本组件；因使用本组件造成的任何后果（如直播间封禁等）与本项目作者无关。

## 使用方法

### Windows 二进制发行版

1. 从 [Releases](https://github.com/VenLac/VenWolf/releases) 下载 `venwolf-windows-amd64-dist.zip`。
2. 解压后运行 `start.bat` 启动服务器。
3. 浏览器打开 `http://localhost:8920`。

### Linux / macOS（Node.js）

1. 安装 Node.js（推荐 v22+）。
2. 从 [Releases](https://github.com/VenLac/VenWolf/releases) 下载 `venwolf-nodejs-server.zip`。
3. 在解压目录执行 `node server/index.js`。

### 从源码编译

> 以下示例使用 `pnpm`，也可使用 `npm` 或 `yarn`。

1. 分别在 `server/`、`frontend/` 与项目根目录执行 `pnpm install`。
2. 在 `server/` 目录执行 `npm run build` 编译后端。
3. 改动前端后，在项目根目录执行 `bash scripts/build.sh` 构建前端并同步产物到 `server/public/`（详见 `AGENTS.md`）。
4. 在项目根目录执行 `npm start` 启动服务器。
5. 浏览器打开 `http://localhost:8920`。

## 项目结构

```
.
├── server/      # 后端：Koa + TypeScript（DG-Lab/Web WebSocket、HTTP API、游戏调度）
├── frontend/    # 前端：Vue 3 + Vite + TypeScript
├── scripts/     # 构建辅助脚本
├── docs/        # 文档（插件 API、截图）
└── AGENTS.md    # AI 协作 / 开发约定
```

## 开发约定

构建流程、关键路径与代码规范详见 [AGENTS.md](AGENTS.md)。插件 HTTP API 详见 [docs/api.md](docs/api.md)。

## 致谢

- 原项目：[hyperzlib/DG-Lab-Coyote-Game-Hub](https://github.com/hyperzlib/DG-Lab-Coyote-Game-Hub)
- DG-Lab 协议与设备生态
- [LinuxDo](https://linux.do) 社区在推广方面对本项目的支持
## License

本项目沿用原项目的 [GPL-3.0](LICENSE) 协议。按 GPLv3 要求，二次分发与二开版本须以相同协议开源，并保留原版权与协议声明。
