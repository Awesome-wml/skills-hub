#!/usr/bin/env python3
"""把 Gitee 合并 PR 列表渲染成「发版内容」markdown（前后端合并）。

输入：单个 JSON（stdin 或文件参数），结构：
{
  "version": "v1.4.0",          # 本次发版版本号（可选，缺省留占位）
  "since":   "2026-06-20",      # 统计起点（上次发版时间/tag，仅用于展示）
  "operator":"张三",            # 操作人（可选）
  "tapd":    "https://...",     # TAPD 发版迭代链接（可选）
  "groups": [                    # 一个 repo 一组，前后端各一组
    {
      "label": "后端 octopus-cloud",
      "prs": [
        {"number":1174,"title":"refactor(order): 去掉取消原因分类",
         "merged_at":"2026-06-23T11:52:33+08:00","author":"youwei",
         "url":"https://gitee.com/lengfeng_2/octopus-cloud/pulls/1174"}
      ]
    },
    { "label": "前端 octopus-admin", "prs": [...] }
  ]
}

输出：发版内容 markdown 到 stdout。
用法：python3 render-release-notes.py [input.json]    （无参数则读 stdin）
"""
import json
import re
import sys

# conventional-commit 前缀 → 中文分类（顺序即输出顺序）
TYPE_MAP = [
    ("feat",     "✨ 新功能"),
    ("fix",      "🐛 缺陷修复"),
    ("perf",     "⚡ 性能优化"),
    ("refactor", "♻️ 重构"),
    ("style",    "💄 样式/格式"),
    ("docs",     "📝 文档"),
    ("test",     "✅ 测试"),
    ("build",    "📦 构建"),
    ("ci",       "👷 CI/部署"),
    ("chore",    "🔧 杂项"),
    ("revert",   "⏪ 回滚"),
]
TYPE_LABEL = dict(TYPE_MAP)
OTHER = "📋 其它"

PREFIX_RE = re.compile(r"^\s*(\w+)(?:\([^)]*\))?!?:", re.IGNORECASE)
# 需重点关注（审批判定 + smoke 重点）：功能变化 / 接口 / 数据结构变更
WATCH_RE = re.compile(
    r"(migration|flyway|接口|数据结构|表结构|字段|schema|breaking|不兼容|破坏)",
    re.IGNORECASE,
)


BREAKING_RE = re.compile(r"^\s*\w+(?:\([^)]*\))?!:|BREAKING", re.IGNORECASE)


def classify(title: str) -> str:
    m = PREFIX_RE.match(title)
    if m:
        t = m.group(1).lower()
        if t in TYPE_LABEL:
            return t
    return OTHER


def is_breaking(title: str) -> bool:
    return bool(BREAKING_RE.search(title))


def is_watch(title: str) -> bool:
    t = classify(title)
    return t == "feat" or bool(WATCH_RE.search(title)) or is_breaking(title)


def parse_semver(v: str):
    """'v1.3.2' / '1.3.2' → (1,3,2)。解析失败回退 (0,0,0)。"""
    m = re.search(r"(\d+)\.(\d+)\.(\d+)", v or "")
    return tuple(int(x) for x in m.groups()) if m else (0, 0, 0)


def decide_version(last_version: str, all_titles: list):
    """按 §六 语义化版本规则自动定版。返回 (next_version, bump_kind, reason)。
       - 破坏性变更（feat!:/BREAKING）→ 主版本号 +1
       - 有 feat / 接口 / 数据结构变更       → 次版本号 +1
       - 仅修复/杂项                          → 补丁号 +1
    """
    major, minor, patch = parse_semver(last_version)
    if any(is_breaking(t) for t in all_titles):
        return f"v{major + 1}.0.0", "major", "含破坏性变更（!: / BREAKING）"
    if any(classify(t) == "feat" or WATCH_RE.search(t) for t in all_titles):
        return f"v{major}.{minor + 1}.0", "minor", "含功能变化 / 接口 / 数据结构变更"
    return f"v{major}.{minor}.{patch + 1}", "patch", "仅缺陷修复 / 杂项"


def render(data: dict) -> str:
    # 收集所有标题用于自动定版
    all_titles = [pr["title"] for g in data.get("groups", []) for pr in g.get("prs", [])]

    last_version = data.get("last_version")
    bump_line = None
    if data.get("version"):
        version = data["version"]
        if last_version:
            bump_line = f"上一版本 `{last_version}` → 本次 `{version}`（手动指定）"
    elif last_version:
        version, kind, reason = decide_version(last_version, all_titles)
        bump_line = f"上一版本 `{last_version}` → 本次 `{version}`（自动 +{kind}：{reason}）"
    else:
        version = "v_._._（缺 last_version，无法自动定版）"

    since = data.get("since") or last_version or "（上次发版 tag）"
    out = []
    out.append(f"# 发版内容 {version}")
    out.append("")
    if bump_line:
        out.append(f"> 版本号：{bump_line}")
    out.append(f"> 统计范围：{since} → 现在（按合并到 dev 的 PR）")
    out.append("")

    # ---- 发版记录表（对齐 发版与运维 §六）----
    out.append("## 发版记录")
    out.append("")
    out.append("| 字段 | 值 |")
    out.append("|---|---|")
    out.append(f"| 版本号 | {version} |")
    out.append("| 发版时间 | （部署时填） |")
    out.append(f"| 统计起点 | {since} |")
    out.append(f"| 对应 TAPD 迭代 | {data.get('tapd') or '（填迭代链接）'} |")
    out.append("| 镜像 tag | 本次 `{ver}` ＋ 上一稳定 tag（回退点） |".replace("{ver}", version))
    out.append(f"| 操作人 | {data.get('operator') or '（填）'} |")
    out.append("")

    watch_items = []
    total = 0

    for g in data.get("groups", []):
        label = g.get("label", "未命名仓库")
        prs = g.get("prs", [])
        total += len(prs)
        out.append(f"## {label}（{len(prs)} 项）")
        out.append("")
        if not prs:
            out.append("_本次无合并 PR_")
            out.append("")
            continue
        # 按类型分桶
        buckets = {}
        for pr in prs:
            buckets.setdefault(classify(pr["title"]), []).append(pr)
            if is_watch(pr["title"]):
                watch_items.append((label, pr))
        order = [t for t, _ in TYPE_MAP if t in buckets] + ([OTHER] if OTHER in buckets else [])
        for t in order:
            out.append(f"### {TYPE_LABEL.get(t, OTHER)}")
            out.append("")
            for pr in buckets[t]:
                num = pr.get("number")
                url = pr.get("url", "")
                author = pr.get("author", "")
                title = pr["title"]
                ref = f"  [!{num}]({url})" if num else ""
                who = f" — @{author}" if author else ""
                out.append(f"- {title}{ref}{who}")
            out.append("")

    # ---- 需重点关注 ----
    out.append("## ⚠️ 需重点关注（审批判定 + QA smoke 重点）")
    out.append("")
    out.append("> 含功能变化 / 接口变更 / 数据结构变更的 PR——决定是否走审批（§三），并作为 smoke 测试重点。")
    out.append("")
    if watch_items:
        for label, pr in watch_items:
            ref = f"  [!{pr['number']}]({pr.get('url','')})" if pr.get("number") else ""
            out.append(f"- [{label}] {pr['title']}{ref}")
    else:
        out.append("- 无（本次均为缺陷修复/杂项，可视为免审批，仍需记录 §八）")
    out.append("")
    out.append(f"---")
    out.append(f"_共 {total} 项，{len(watch_items)} 项需重点关注。由 release-notes-gen 生成。_")
    return "\n".join(out)


def main():
    raw = open(sys.argv[1], encoding="utf-8").read() if len(sys.argv) > 1 else sys.stdin.read()
    data = json.loads(raw)
    print(render(data))


if __name__ == "__main__":
    main()
