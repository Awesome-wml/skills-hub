# 按钮 / 状态 / 反馈规范

> 工程实现参考：[master-conventions.mdc 十一、权限控制](../../cursor-rules/master-conventions.md) / [copywriting-normalization.mdc](../../cursor-rules/copywriting-normalization.md)
> 状态字典：[status-dictionary.md](./status-dictionary.md) | 标准文案：[copy.md](./copy.md)

## 1. 按钮分类

| 按钮类型 | 使用场景 | 执行要求 |
|---|---|---|
| **主按钮** | 页面最核心操作 | 每个操作区域**最多 1 个**，`type="primary"`（主色）|
| **次按钮** | 辅助性操作 | 与主按钮保持明显层级区分（默认边框按钮，不写 type） |
| **文字按钮** | 弱化操作 / 行内操作 | 用于表格操作列、"更多"入口（`el-button text`，统一不使用 `link`） |
| **危险按钮** | 不可逆操作 | `type="danger"`（危险色），**必须二次确认** |

色值映射见 [design-tokens.md](./design-tokens.md)。

## 2. 按钮位置

- **页面级按钮**：位于查询区下方或标题区右侧。
- **行内按钮**：位于表格操作列。
- **表单按钮**：位于表单底部，默认**右对齐**。
- 同一区域按钮**超过 3 个时**，应使用"更多"收纳低频操作。

## 3. 按钮状态语义

| 操作类型 | type | 示例 |
|---|---|---|
| 查看 / 编辑 / 启用 / 跳转 | `primary` | 编辑、查看详情、启用、收货记录 |
| 停用 / 冻结 / 关闭 | `warning` | 停用、冻结、关闭单据 |
| 删除 / 禁用（不可逆） | `danger` | 删除（仅在"更多"下拉中使用） |
| 更多入口 | `info` | 更多 ▾ |

**保存、提交、导入等动作触发后按钮进入 loading 状态**，防止重复点击。

## 4. 状态规范

### 4.1 总则

- 同一状态名称在**全系统语义必须一致**。
- 同类状态使用**同一颜色体系**。
- 状态名称建议控制在 **2~4 个字**内。

### 4.2 通用语义色

| 语义 | 对应 Element Plus type | 场景 |
|---|---|---|
| 默认 / 草稿 / 停用 | `info` | 初始状态、非激活 |
| 进行中 / 审批中 / 待处理 | `warning` | 流程进行中 |
| 成功 / 完成 / 启用 | `success` | 流程完成、正常 |
| 失败 / 驳回 / 作废 / 异常 | `danger` | 失败结果 |

色值映射见 [design-tokens.md](./design-tokens.md)。

### 4.3 状态字典

详见 [status-dictionary.md](./status-dictionary.md)。

## 5. 反馈规范

| 反馈类型 | 建议方式 | 示例文案 | 工程实现 |
|---|---|---|---|
| **成功反馈** | 轻量消息提示，停留 2~3 秒 | 保存成功 / 提交成功 / 删除成功 | `$baseMessage('...', 'success', 'hey')` |
| **失败反馈** | 说明原因，必要时给出建议 | 暂时无法保存，请检查必填项后重试 | `$baseMessage('...', 'error', 'hey')` |
| **警告反馈** | 二次确认提示 | 删除后无法恢复，是否继续？ | `$baseConfirm('...', null, async () => {...})` |
| **加载反馈** | 整页 / 区块 / 按钮级 loading | 提交中，请稍候… | `$baseLoading` / 按钮 `:loading="..."` |
| **空状态反馈** | 占位提示 | 暂无数据 / 未查询到符合条件的数据 | `<el-empty class="vab-data-empty" />` |
| **异常反馈** | 明确异常类型 | 暂时无法加载，请稍后重试 | — |

### 5.1 文案要求

- **禁止使用**"操作失败"这类无信息增量的提示，**必须尽量说明失败原因**。
- 权限异常统一提示"**当前账号暂无此操作权限**"。
- 离开未保存页面时，**必须弹出确认提醒**。
- 完整文案参考 [copy.md](./copy.md) 和 [copywriting-normalization.mdc](../../cursor-rules/copywriting-normalization.md)。

## 6. 权限控制

权限按钮用 `v-permissions` 指令，详见 [master-conventions.mdc 十一、权限控制](../../cursor-rules/master-conventions.md)。

**禁止**使用 `v-if="userStore.role === 'Admin'"` 或 `computed(() => aclStore.getPermission.includes('...'))`，统一走 `v-permissions`。
