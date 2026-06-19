#!/usr/bin/env bash
# 前端构建 + 产物迁移脚本
#
# 作用：构建 frontend，并把产物干净地同步到 server/public
#       （后端 koa-static 实际托管的目录）。
#
# 用法：
#   bash scripts/build.sh
#
# 切换包管理器（默认按需检测 pnpm / npm）：
#   PM=pnpm bash scripts/build.sh
#
# 为什么需要它：
#   前端 `npm run build` 只输出到 frontend/dist；而后端 `npm start`
#   托管的是 server/public。中间的迁移步骤根 package.json 用 shx 实现，
#   但根目录通常未安装 shx 会失败。本脚本用原生 cp/find 规避该依赖，
#   并顺带清理旧 hash 产物。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
DIST="$FRONTEND/dist"
PUBLIC="$ROOT/server/public"

if [[ -t 1 ]]; then
  C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_RED=$'\033[31m'; C_RESET=$'\033[0m'
else
  C_CYAN=''; C_GREEN=''; C_RED=''; C_RESET=''
fi

log() { printf '%s==>%s %s\n' "$C_CYAN"  "$C_RESET" "$*"; }
ok()  { printf '%s[OK]%s %s\n'  "$C_GREEN" "$C_RESET" "$*"; }
die() { printf '%s[ERROR]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

cd "$ROOT"

# 选择包管理器：显式 PM > 检测到 pnpm > 默认 npm
if [[ -z "${PM:-}" ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    PM=pnpm
  else
    PM=npm
  fi
fi

# 1) 构建前端（vite build && vue-tsc 类型检查）
log "使用 $PM 构建前端"
( cd "$FRONTEND" && "$PM" run build )
[[ -f "$DIST/index.html" ]] || die "构建失败：未找到 frontend/dist/index.html"
ok "前端构建完成"

# 2) 清空 server/public 旧产物（保留 .gitkeep），避免旧 hash 文件堆积
log "清理 server/public 旧产物"
mkdir -p "$PUBLIC"
find "$PUBLIC" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -exec rm -rf {} +
ok "已清理旧产物"

# 3) 同步 frontend/dist -> server/public（含隐藏文件）
log "同步产物到 server/public"
cp -rf "$DIST"/. "$PUBLIC"/
ok "同步完成"

ok "全部完成 —— 浏览器 Ctrl+Shift+R 强刷即可，server 无需重启"
