# Validation Commands

`.pen` 改完后，先看磁盘，不要只看编辑器。

## 1. JSON 结构

```bash
jq empty octoups-user-spec.lib.pen
jq empty octoups-user-results.pen
```

## 2. 重复 `id` / 正式组件名 / 缺失 `ref`

```bash
node -e 'const fs=require("fs"); const doc=JSON.parse(fs.readFileSync("octoups-user-spec.lib.pen","utf8")); const ids=new Set(), names=new Set(), dupIds=[], dupNames=[], refs=[]; (function walk(n){ if(!n||typeof n!=="object") return; if(n.id){ if(ids.has(n.id)) dupIds.push(n.id); ids.add(n.id);} if(n.name && n.reusable){ if(names.has(n.name)) dupNames.push(n.name); names.add(n.name);} if(n.ref) refs.push(n.ref); if(Array.isArray(n.children)) n.children.forEach(walk); })(doc); const missingRefs=[...new Set(refs.filter(ref=>!ids.has(ref)))]; console.log(JSON.stringify({dupIds,dupNames,missingRefs},null,2));'
```

```bash
node -e 'const fs=require("fs"); const doc=JSON.parse(fs.readFileSync("octoups-user-results.pen","utf8")); const ids=new Set(), dupIds=[], refs=[]; (function walk(n){ if(!n||typeof n!=="object") return; if(n.id){ if(ids.has(n.id)) dupIds.push(n.id); ids.add(n.id);} if(n.ref) refs.push(n.ref); if(Array.isArray(n.children)) n.children.forEach(walk); })(doc); const missingRefs=[...new Set(refs.filter(ref=>!ids.has(ref)))]; console.log(JSON.stringify({dupIds,missingRefs},null,2));'
```

预期结果：

- `dupIds: []`
- `dupNames: []`
- `missingRefs: []`

## 3. 节点定位

```bash
rg -n "Component/|Bar/|Sheet/|Result/" octoups-user-spec.lib.pen octoups-user-results.pen
```

## 4. 可视复核

优先给这些节点出图：

- 当前主要 `Result/*`
- 当前新增 family demo
- 有固定底栏 / 弹层 / 长列表的页面
