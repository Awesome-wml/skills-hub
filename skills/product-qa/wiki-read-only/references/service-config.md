# 服务信息配置

调用知识库只读白名单接口前，需统一使用以下配置。请将各配置项替换为实际环境值。

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 基础 URL | `${WIKI_BASE_URL}` | 服务地址与端口，按实际环境修改 |
| 鉴权 | Header `x-api-key: ${WIKI_API_KEY}` | API Key 鉴权，必填；从环境变量 `WIKI_API_KEY` 读取，**禁止把真实 key 写进技能文件或提交到仓库** |
| 内容类型 | Header `Content-Type: application/json` | GET 请求可选；若后续扩展 POST 则需带 |
| **conn_id** | `${WIKI_CONN_ID}` | 飞书连接标识。多连接时必填；单连接可省略。用于 spaces、nodes、document 等接口的 query 参数 `conn_id`。 |
| **document_id** | 从接口获取 | 文档唯一标识（即 obj_token）。从 `GET /api/wiki/nodes/info?token=节点token` 或 `.../nodes/all` 等返回中取 `obj_token`，用于 `GET /api/wiki/document/{document_id}`、`.../raw_content`、`.../blocks` 等路径。 |

## 使用说明

- 所有白名单内的 GET 请求均需在 Header 中携带 `x-api-key`（取环境变量 `WIKI_API_KEY`）。
- **conn_id**：需访问知识库时，在请求的 query 中传入（如 `?conn_id=你的连接ID`）；若仅有一个连接，服务可能可不传。
- **document_id**：查看某文档内容前，先通过节点信息接口拿到该文档的 `obj_token`，再作为路径中的 `document_id` 使用。
- 其他可选参数（如 `page_size`、`page_token`、`include_body`）按接口文档追加在 URL query 中。
