#!/usr/bin/env bash
# 生成 Flyway 迁移文件的版本号（精确到秒，14 位）
# 用法:
#   ./new-migration-version.sh                       # 仅输出 14 位时间戳
#   ./new-migration-version.sh repair_sys_region     # 输出完整文件名 V{ts}__repair_sys_region.sql
set -euo pipefail

TS="$(date +%Y%m%d%H%M%S)"

if [[ $# -eq 0 ]]; then
  echo "$TS"
else
  DESC="$1"
  echo "V${TS}__${DESC}.sql"
fi
