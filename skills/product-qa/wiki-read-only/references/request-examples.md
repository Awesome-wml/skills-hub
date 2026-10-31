# 请求示例

以下示例针对知识库只读白名单接口，使用 [服务信息](service-config.md) 中已配置的 BASE、x-api-key、conn_id。

## curl 示例

```bash
# 获取节点信息（必填 token=wiki_token 或 node_token，用于拿到 obj_token/document_id）
curl --location --request GET "${WIKI_BASE_URL}/api/wiki/nodes/info?token=你的node_token或wiki_token&conn_id=${WIKI_CONN_ID}" \
  --header "x-api-key: ${WIKI_API_KEY}" \
  --header 'Content-Type: application/json' \
  --header 'Accept: */*'

# 获取知识空间列表（与当前环境可通）
curl --location --request GET "${WIKI_BASE_URL}/api/wiki/spaces?conn_id=${WIKI_CONN_ID}&page_size=50" \
  --header "x-api-key: ${WIKI_API_KEY}" \
  --header 'Content-Type: application/json' \
  --header 'Accept: */*'

# 通过 wiki_token 获取节点文档内容
curl --location --request GET "${WIKI_BASE_URL}/api/wiki/node/你的wiki_token/content?conn_id=${WIKI_CONN_ID}" \
  --header "x-api-key: ${WIKI_API_KEY}" \
  --header 'Content-Type: application/json'
```

## Python 完整示例

```python
import os
import requests

BASE = os.environ["WIKI_BASE_URL"]
HEADERS = {
    "x-api-key": os.environ["WIKI_API_KEY"],
    "Content-Type": "application/json",
}
CONN_ID = os.environ["WIKI_CONN_ID"]

# 获取节点信息（token=wiki_token 或 node_token，返回中含 obj_token 可作 document_id）
r = requests.get(
    f"{BASE}/api/wiki/nodes/info",
    headers=HEADERS,
    params={"token": "你的node_token或wiki_token", "conn_id": CONN_ID},
)
print(r.json())

# 获取知识空间列表
r = requests.get(f"{BASE}/api/wiki/spaces", headers=HEADERS, params={"conn_id": CONN_ID, "page_size": 50})
print(r.json())

# 获取所有知识空间（自动分页）
r = requests.get(f"{BASE}/api/wiki/spaces/all", headers=HEADERS, params={"conn_id": CONN_ID})
print(r.json())

# 获取空间下节点树
space_id = "空间ID"  # 从 spaces 接口返回中获取
r = requests.get(f"{BASE}/api/wiki/spaces/{space_id}/tree", headers=HEADERS, params={"conn_id": CONN_ID})
print(r.json())

# 通过 wiki_token 获取节点文档内容（便捷）
wiki_token = "节点wiki_token"
r = requests.get(f"{BASE}/api/wiki/node/{wiki_token}/content", headers=HEADERS, params={"conn_id": CONN_ID})
print(r.json())

# 获取空间下全部节点及文档内容
r = requests.get(
    f"{BASE}/api/wiki/spaces/{space_id}/contents",
    headers=HEADERS,
    params={"conn_id": CONN_ID, "include_body": True},
)
print(r.json())
```
