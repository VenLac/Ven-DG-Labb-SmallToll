# AGENTS.md — AI 协作指南

本文件给 AI 编码助手（Claude Code 等）提供本项目的工作约定。**新对话开始时请先读本文件。**

## 环境

- 开发机：Windows + Git Bash。所有 shell 命令在 Git Bash 下执行，使用 Unix 语法（`/dev/null`、正斜杠路径、`cp`/`find`/`grep`）。
- 技术栈：前端 Vue 3 + Vite + TypeScript（`frontend/`）；后端 Koa + TypeScript（`server/`）。
- 包管理器：优先 pnpm（根目录 `pnpm-lock.yaml`），npm 亦可。

## 构建（最重要）

### 改了前端之后，必须执行

```bash
bash scripts/build.sh
```

该脚本会自动完成三步：

1. 构建前端（`vite build` + `vue-tsc` 类型检查）；
2. 清空 `server/public` 旧产物（保留 `.gitkeep`），避免旧 hash 文件堆积；
3. 把 `frontend/dist` 全量同步到 `server/public`。

**以后所有前端构建都走这个脚本，不要只跑 `npm run build`。**

### 为什么必须用脚本（踩坑记录）

- 前端的 `npm run build` 只把产物输出到 `frontend/dist`；
- 后端 `npm start`（`node server/dist/index.js`）通过 `koa-static` 托管的是 **`server/public/`**，不是 `frontend/dist`；
- 中间的迁移步骤（根 `package.json` 的 `build:migrate`）用 `shx cp`，而根目录 `node_modules` 通常未安装 `shx`，直接调用会报 `'shx' is not recognized`；
- 脚本用原生 `cp`/`find` 规避该依赖，并补上迁移这一关键步骤。只构建不迁移 → 浏览器永远看到旧界面。

### 看到效果

- 后端用 `koa-static` 实时读盘，**迁移后无需重启 server**；
- 浏览器 **Ctrl + Shift + R 强刷**（绕过 `index.html` 本地缓存）即可。
- `server/public` 与 `frontend/dist` 都是构建产物（见 `.gitignore`），由脚本从 `dist` 全量同步生成——不要手动修改、也不要提交它们。

### 改了后端（server）之后

仅在改动了 `server/src` 下的 TypeScript 时需要：

```bash
cd server && npm run build   # 编译 TS -> server/dist
```

然后重启 server（`npm start`）使新逻辑生效。

## 关键路径

| 内容 | 路径 / 命令 |
|------|------------|
| 前端源码 | `frontend/src` |
| 后端源码 | `server/src`（入口 `server/src/index.ts`） |
| 启动后端 | `npm start`（= `cd server && node dist/index.js`），默认 http://localhost:8920 |
| 静态产物 | `server/public`（脚本生成，gitignore） |
| 前端构建脚本 | `scripts/build.sh` |

## 代码规范

遵循全局工程基线：函数 ≤ 50 行、文件 ≤ 300 行、嵌套 ≤ 3 层、无魔法数字、早返回、依赖注入、不可变优先。失败要显式暴露（异常 / 报错 / 失败的测试），不要添加静默 fallback 或模拟成功路径。
