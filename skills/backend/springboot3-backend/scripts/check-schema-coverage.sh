#!/usr/bin/env bash
# check-schema-coverage.sh — 扫描对外 DTO/VO/Query/Cmd 的字段级 @Schema 覆盖率
#
# 背景：SpringDoc 不读 Javadoc，Scalar 只渲染 @Schema。没有 @Schema 的字段在文档页面
# 上显示裸类型（string/integer），前端对不上口径。人工逐字段核对在几百字段规模上必然
# 失守（真实事故：order + aftersale 两包 331 字段整包漏标）。此脚本做机械兜底。
#
# 用法:
#   check-schema-coverage.sh <目录 | .java 文件> [更多路径...]
# 示例:
#   check-schema-coverage.sh commerce-core/src/main/java/**/api/dto/order
# 退出码:
#   0 = 全部字段已标 @Schema
#   1 = 存在缺失（逐条打印文件与字段）
#   2 = 用法错误
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "用法: $0 <目录 | .java 文件> [更多路径...]" >&2
  exit 2
fi

# 只扫对外契约类；领域内部对象（PO/Entity/领域 Query）不在文档范围
name_re='(DTO|VO|Query|Cmd|Command|Request|Response)\.java$'

files=()
for p in "$@"; do
  if [ -d "$p" ]; then
    while IFS= read -r f; do files+=("$f"); done \
      < <(find "$p" -type f -name '*.java' | grep -E "$name_re" || true)
  elif [ -f "$p" ]; then
    files+=("$p")
  else
    echo "跳过（不存在）: $p" >&2
  fi
done

if [ "${#files[@]}" -eq 0 ]; then
  echo "未找到匹配 $name_re 的文件"
  exit 0
fi

awk '
  function trim(s){ sub(/^[ \t]+/,"",s); sub(/[ \t]+$/,"",s); return s }
  FNR==1 { schema=0 }                       # 换文件时重置注解状态
  {
    line=trim($0)
    if (line=="")            { schema=0; next }
    if (line ~ /^@Schema/)   { schema=1; next }
    if (line ~ /^@/)         { next }        # 其他注解：不清除 @Schema 命中状态
    # 字段声明：可见性修饰符开头、以 ; 结尾、不含 (（排除方法）、非 static/final 常量
    if (line ~ /^(private|protected|public)[ \t].*;[ \t]*$/ \
        && line !~ /\(/ && line !~ /(^| )(static|final)[ \t]/) {
      total++
      if (!schema) { miss++; printf("  \xE2\x9C\x97 %s\n      %s\n", FILENAME, line) }
    }
    schema=0
  }
  END {
    printf("\n扫描字段 %d，缺 @Schema %d\n", total+0, miss+0)
    exit (miss>0 ? 1 : 0)
  }
' "${files[@]}"
