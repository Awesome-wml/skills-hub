#!/usr/bin/env bash
# Octopus 飞书 wiki 节点抓取辅助
# Usage: fetch.sh <node_token> [section_regex]
#   <node_token>     wiki URL 末尾那段（如 WOW1wNGhfiMYWfk8Mg5cR3utnpR）
#   [section_regex]  可选，jq 风格的章节过滤（按行匹配后输出）
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <node_token> [section_regex]" >&2
  exit 2
fi

node_token="$1"
section_regex="${2:-}"

meta=$(lark-cli api GET /open-apis/wiki/v2/spaces/get_node \
  --params "{\"token\":\"${node_token}\"}")

ok=$(echo "$meta" | jq -r '.code // 1')
if [[ "$ok" != "0" ]]; then
  echo "wiki node lookup failed:" >&2
  echo "$meta" | jq '.' >&2
  exit 1
fi

obj_token=$(echo "$meta" | jq -r '.data.node.obj_token')
obj_type=$(echo "$meta" | jq -r '.data.node.obj_type')
title=$(echo "$meta" | jq -r '.data.node.title')

echo "# ${title}" >&2
echo "# obj_type=${obj_type} obj_token=${obj_token}" >&2

case "$obj_type" in
  docx)
    content=$(lark-cli api GET "/open-apis/docx/v1/documents/${obj_token}/raw_content" --jq '.data.content')
    ;;
  sheet)
    content=$(lark-cli api GET "/open-apis/sheets/v3/spreadsheets/${obj_token}/sheets/query" --jq '.data')
    ;;
  *)
    echo "unsupported obj_type: ${obj_type}" >&2
    exit 1
    ;;
esac

if [[ -n "$section_regex" ]]; then
  echo "$content" | grep -E "$section_regex" || {
    echo "no lines matched regex: $section_regex" >&2
    exit 3
  }
else
  echo "$content"
fi
