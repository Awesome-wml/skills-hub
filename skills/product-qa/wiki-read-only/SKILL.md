---
name: wiki-read-only
description: "仅允许查看知识库（飞书 Wiki）内容时使用。当用户需要「只看知识库」「查知识库文档」「读飞书 wiki / PRD 链接」「列表/空间/节点/文档内容」且不调用其他业务接口时启用。仅允许调用下方白名单中的 GET 接口，禁止调用任何非知识库接口及知识库下的写/改/删接口。"
---

# 知识库只读技能（仅查看内容）

## 执行思路（Agent 接到「查看知识库」后怎么做）

1. **判断是否用本技能**  
   用户要「只看知识库」「查知识库文档」「列空间/节点/文档内容」且不写不改不删、不调其他业务接口 → 用本技能；否则不用。

2. **读配置再发请求**  
   从 [references/service-config.md](references/service-config.md) 取：**基础 URL**、**x-api-key**（Header 必带，值取环境变量 `WIKI_API_KEY`，不要写进文件）、**conn_id**（多连接时 query 必带）。每次请求都带 `x-api-key`，需要时加 `?conn_id=xxx`。

3. **按「手头有什么」选入口，不固定顺序**  
   - **只有 conn_id、想先看有哪些空间**：调 `GET /api/wiki/spaces` 或 `GET /api/wiki/spaces/all`。若返回空，可能当前连接下无空间或需检查 conn_id。  
   - **已有 space_id**：可调 `GET /api/wiki/spaces/{space_id}`、`.../tree`、`.../nodes`、`.../nodes/all`、`.../contents` 看该空间下节点/文档（注意：tree/nodes 可能因租户权限返回 permission denied）。  
   - **已有 node_token 或 wiki_token**：可直接调 `GET /api/wiki/nodes/info?token=该token`（**query 参数名是 token**，值是 wiki_token 或 node_token）；或调 `GET /api/wiki/node/{wiki_token}/content` 一次拿节点信息+文档纯文本+块。  
   - **已有 document_id（即 obj_token）**：可调 `GET /api/wiki/document/{document_id}`、`.../raw_content`、`.../blocks` 等。document_id 可从 nodes/info 返回的 `obj_token` 得到。
   - **白名单服务不可用 / 只拿到飞书 wiki 网页链接**：不要 `curl` 网页（会跳登录），改走下方「备选读法：lark-cli 以 bot 身份只读」。

4. **只调白名单内的 GET**  
   路径必须落在白名单表内，且仅 GET；不调登录、配置、连接管理、记录、表格、字段等非 wiki 接口，也不调 wiki 的 POST/PUT/DELETE。

5. **若用户要写/改/删**  
   明确回复：本技能仅支持查看，不调用写接口；如需创建/修改/删除请用其他方式。

**一句话**：读 service-config → 按手头是 space_id 还是 node_token 选对应白名单 GET → 带 x-api-key（和必要时 conn_id）发请求；没有的 ID 可先通过 spaces 或 nodes/info 获取（若权限允许）。

---

## 约束

- **只做查看**：仅允许调用知识库相关的**只读（GET）**接口，用于查看空间、节点、文档与内容。
- **禁止调用**：除下表白名单外的所有接口一律不得调用，包括但不限于：
  - 认证、配置、连接、记录、表格、字段等非 wiki 接口；
  - 知识库下的 POST/PUT/DELETE（创建空间、创建/移动/复制/删除节点、文档写入、上传、成员增删等）。

## 允许调用的接口（白名单）

以下均为 **GET** 请求，且路径均以 `/api/wiki/` 为前缀。规范来源：`api.json`（飞书多维表格 API 服务）。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/wiki/spaces` | 获取知识空间列表（分页，可选 conn_id、page_size、page_token） |
| GET | `/api/wiki/spaces/all` | 获取所有知识空间（自动分页，可选 conn_id） |
| GET | `/api/wiki/spaces/{space_id}` | 获取知识空间详情（可选 conn_id、lang） |
| GET | `/api/wiki/nodes/info` | 获取节点信息（query 参数名 **token**，值为 wiki_token 或 node_token） |
| GET | `/api/wiki/spaces/{space_id}/nodes` | 列出空间下节点（分页） |
| GET | `/api/wiki/spaces/{space_id}/nodes/all` | 列出空间下所有节点 |
| GET | `/api/wiki/spaces/{space_id}/tree` | 获取空间节点树 |
| GET | `/api/wiki/document/{document_id}` | 获取文档基本信息（标题、版本等） |
| GET | `/api/wiki/document/{document_id}/raw_content` | 获取文档纯文本内容 |
| GET | `/api/wiki/document/{document_id}/blocks` | 获取文档块列表（分页） |
| GET | `/api/wiki/document/{document_id}/blocks/all` | 获取文档全部块 |
| GET | `/api/wiki/document/{document_id}/blocks/{block_id}` | 获取单个块 |
| GET | `/api/wiki/document/{document_id}/blocks/{block_id}/children` | 获取块的子块 |
| GET | `/api/wiki/node/{wiki_token}/content` | 通过 wiki 节点 token 获取文档内容（便捷，含纯文本+块） |
| GET | `/api/wiki/spaces/{space_id}/contents` | 获取空间下所有节点及文档内容（可选 parent_node_token、include_body） |
| GET | `/api/wiki/tasks/{task_id}` | 获取异步任务状态 |
| GET | `/api/wiki/spaces/{space_id}/members` | 列出空间成员 |
| GET | `/api/wiki/spaces/{space_id}/members/all` | 列出空间全部成员 |

**说明**：`document_id` 即文档的 obj_token，可通过 `GET /api/wiki/nodes/info` 获取节点信息得到；可选参数 `conn_id` 表示连接 ID 或名称。

- **可主动调用**：`GET /api/wiki/nodes/info` 用于根据节点 token（query 参数 `token`，即 wiki_token 或 node_token）获取节点详细信息（含 obj_token，用作 document_id）。调用时传 `token` 必填，`conn_id` 按配置可选。示例见 [references/request-examples.md](references/request-examples.md)。

## 备选读法：lark-cli 以 bot 身份只读（白名单服务不可用时）

产品 PRD 多在飞书 wiki，网页链接直接 `curl` 会跳登录页，拿不到正文。上面的白名单服务不可用、或手里只有一个 wiki 链接时，可改用 `lark-cli` 以 **bot** 身份读取（user token 已过期，只能用 `--as bot`）：

```bash
# 1. wiki 节点 token（链接 /wiki/ 后那段）→ 取 obj_token
LARK_CLI_NO_PROXY=1 lark-cli api GET /open-apis/wiki/v2/spaces/get_node \
  --params '{"token":"<wiki node token>"}' --as bot
# 2. obj_token → 文档纯文本
LARK_CLI_NO_PROXY=1 lark-cli api GET /open-apis/docx/v1/documents/<obj_token>/raw_content --as bot
```

- **只读约束同样适用**：只允许 `GET /open-apis/wiki/v2/spaces/get_node` 与 `GET /open-apis/docx/v1/documents/{obj_token}`（及其 `raw_content` / `blocks`）这类读接口；禁止用 lark-cli 调任何 POST/PUT/PATCH/DELETE 或非 wiki/docx 接口。
- 需关闭 sandbox 并绕过本机代理（`LARK_CLI_NO_PROXY=1`），否则请求会失败。
- 返回无权限时如实报告（bot 可能未获该文档的阅读权限【待确认】），不要换其他接口或写接口硬试。

## 配置与示例

- **服务信息配置**（基础 URL、X-API-Key、Content-Type）：见 [references/service-config.md](references/service-config.md)
- **请求示例**（curl、Python）：见 [references/request-examples.md](references/request-examples.md)

## 工作流程

1. **确认需求**：用户只查看知识库内容、不写不改不删 → 启用本技能，严格按白名单调用。
2. **读配置**：BASE、x-api-key、conn_id 见 [references/service-config.md](references/service-config.md)。
3. **选接口**：按「执行思路」根据手头是否有 space_id、node_token、document_id 选对应白名单 GET，不固定「先 spaces 再 nodes」——有 token 可直接调 nodes/info 或 node/{token}/content。
4. **禁止**：不调用白名单外的接口；不替用户执行登录、配置、创建/修改/删除知识库等操作。

## 注意事项

- 调用前需已有有效鉴权（本技能使用 **x-api-key**，见 service-config；不涉及登录或获取 Token）。
- 若用户要求「创建/修改/删除空间或节点」「写入文档」「上传文件」等，应明确告知：当前仅支持查看知识库内容，不调用写接口。
