---
name: vue3-pc-web
description: Vue3 PC web application development with TypeScript, Element Plus, and Vab component library. Use when building or modifying this shop-vite project (octopus-admin) — pages, components, styles/flex layout fixes, status label/dict display, and UI change verification.
metadata:
  last-updated: "2026-10-31"
---

# Vue3 PC Web 开发（Shop Vite 项目）

基于 Vue3 + Vite + TypeScript 的企业级中后台前端框架。使用 Element Plus 作为 UI 组件库，包含自定义 Vab 组件库。

## When to Use

- 用户提到 "vue3"、"vue 3"、"web应用"、"PC端"、"桌面网页"
- 需要使用 Vue3 Composition API 构建现代 Web 应用
- 桌面浏览器端的前端项目
- **注意**：如果是 UniApp 项目，请使用 `uniapp-vue2` 或 `uniappx-vue3` skill
- **注意**：如果是微信小程序原生项目，请使用 `wechat-miniprogram` skill

## Official Documentation

- Vue3: https://vuejs.org/
- Vue Router: https://router.vuejs.org/
- Pinia: https://pinia.vuejs.org/
- Vite: https://vitejs.dev/
- Element Plus: https://element-plus.org/
- VueUse: https://vueuse.org/
- Vue I18n: https://vue-i18n.intlify.dev/

## 强制规则（Constraints）

### 语法与架构

1. **【强制】使用 `<script lang="ts" setup>` 语法**，所有 Vue 组件必须加 `lang="ts"`
2. **【强制】使用 Composition API**（`ref`、`reactive`、`computed`、`watch`）
3. **【强制】组件必须使用 `defineOptions({ name: 'XxxYyy' })` 声明组件名**
4. **【强制】路由使用懒加载**：`component: () => import('/@/views/Xxx.vue')`
5. **【强制】状态管理使用 Pinia**，Store 放在 `src/store/modules/` 目录
6. **【强制】HTTP 请求封装在 `src/api/` 目录**，使用 `/@/utils/request` 封装的 axios 实例
7. **【禁止】使用 Vue2 Options API 语法（Vue 组件中）**
8. **【强制】使用 Element Plus 组件**，图标使用 `@element-plus/icons-vue`

### 路径别名

9. **【强制】使用项目定义的路径别名**：
   - `/@/` → `src/`（源码目录）
   - `~/` → 项目根目录
   - `/@vab/` → `library/`（Vab 组件库）

### 自动导入

10. **【重要】以下模块已配置自动导入，无需手动 import**：
    - `vue`：`ref`、`reactive`、`computed`、`watch`、`onMounted`、`createApp` 等
    - `pinia`：`defineStore`、`createPinia` 等
    - `vue-router`：`useRouter`、`useRoute` 等
    - `vue-i18n`：`useI18n` 等
    - `@vueuse/core`：所有 VueUse 函数
    - `axios`：默认导出
11. **【重要】Element Plus 组件已通过 `ElementPlusResolver` 自动注册**，无需手动导入组件
12. **【注意】`/@/hooks` 中的函数（`$baseMessage`、`$baseConfirm` 等）也是自动导入的**

### 代码质量

13. **【强制】组件保持单一职责**，过大时拆分子组件到 `vabAutoComponents/` 子目录
14. **【强制】组件命名使用大驼峰且包含多个单词**（如 `GoodsManagement.vue`）
15. **【强制】派生状态使用 `computed`**，不在模板中计算
16. **【强制】使用 `scoped` 样式**，样式语言使用 SCSS：`<style lang="scss" scoped>`
17. **【强制】Props 使用 `defineProps()` 声明类型**
18. **【强制】事件使用 `defineEmits()` 声明**
19. **【推荐】遵循 Vue3 官方风格指南**: https://vuejs.org/style-guide/

### 性能与工程化

20. **【推荐】频繁切换用 `v-show`**，条件渲染用 `v-if`
21. **【推荐】长列表使用虚拟滚动**
22. **【推荐】搜索输入使用防抖/节流**（推荐使用 VueUse）
23. **【推荐】使用 `<KeepAlive>` 缓存非活跃组件**，配合 `onActivated` 生命周期

### 业务数据展示

24. **【禁止】在 `.vue` 里写状态 code→中文 map**。展示文案读后端 `@DictLabel("dict_key")` 自动注入的 `{字段名}Label`（如 `settleStatus` → `settleStatusLabel`），写成 `row?.settleStatusLabel || ''`；下拉选项用 `getDictItemsByKey(DICT_KEY_XXX)`（`/@/api/dictManagement`，key 常量在 `src/constants/dictKeys.ts`）拉取，再按 code 取 label。只有 `el-tag` 的颜色 `type` 可以留前端小 map。没有字典就让后端新建字典 + 加注解。为什么：前端 map 会与后端枚举漂移，漏一个键页面就裸露英文 code。
25. **【强制】界面元素要有来源**：新加的按钮、跳转、弹窗、文案、通知、列都要能指到用户原话 / PRD / 原型；没有来源的先作为「建议（待产品确认）」提给用户，不直接写进代码。

### 样式与布局易错点

26. **【重要】flex 子项被挤没 / 挤到 0 宽时，先怀疑比例 flex-grow**（如 `flex: 1.4` 对 `flex: 1`）。内容有上限的元素给固定宽度（`flex: 0 0 280px`），弹性空间只留给唯一需要伸缩的输入元素（`flex: 1` + `min-width` 兜底）；不要在比例数字上反复调参，只加 `min-width: 0` 往往不够。为什么：2026-10 一个编辑抽屉第一次只加 `min-width: 0` 就宣称修好，用户实测仍被挤没。
27. **【强制】可视化改动不自称「已修复」**：编译后 CSS 正确 ≠ 浏览器渲染正确。改完说「已改，请你验证」，优先起本地 `pnpm dev` 让用户在 localhost 实测，用户确认后才算修好。

## 项目结构

```
project-root/
├── library/              # Vab 自定义组件库
│   ├── build/            # Vite 构建配置与插件
│   ├── components/       # 全局组件（Vab 系列）
│   ├── layouts/          # 布局组件
│   ├── plugins/          # 插件（gp.$base* 方法等）
│   └── styles/           # 全局样式
├── mock/                 # Mock 数据
│   └── controller/       # Mock 控制器
├── public/               # 静态资源（不经过构建）
├── src/
│   ├── api/              # API 接口定义（按模块拆分）
│   ├── assets/           # 构建时资源（图片、SVG）
│   ├── config/           # 配置文件
│   │   ├── cli.config.ts     # CLI/构建配置
│   │   ├── net.config.ts     # 网络请求配置
│   │   ├── setting.config.ts # 全局设置配置
│   │   └── theme.config.ts   # 主题配置
│   ├── hooks/            # 组合式函数（$base* 工具函数）
│   ├── i18n/             # 国际化配置
│   ├── icon/             # 图标资源
│   ├── plugins/          # 业务插件（VabChart、VabPdf 等）
│   ├── router/           # Vue Router 配置
│   │   ├── modules/      # 路由模块（按功能拆分）
│   │   ├── index.ts      # 路由入口
│   │   └── permissions.ts # 权限控制
│   ├── store/            # Pinia 状态管理
│   │   ├── modules/      # Store 模块
│   │   └── index.ts      # Store 入口
│   ├── utils/            # 工具函数
│   │   └── request.ts    # Axios 封装
│   ├── views/            # 页面组件（业务相关）
│   │   └── [module]/
│   │       ├── XxxPage.vue
│   │       └── vabAutoComponents/  # 子组件目录
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口
├── types/                # TypeScript 类型定义
├── .env                  # 环境变量（主文件）
├── .env.development      # 开发环境配置
├── .env.production       # 生产环境配置
├── index.html
├── tsconfig.json
├── vite.config.ts        # Vite 主配置
└── package.json
```

## 核心开发模式

### 页面组件模板（CRUD 列表页）

```vue
<template>
  <div class="xxx-container auto-height-container">
    <vab-query-form>
      <vab-query-form-left-panel :span="10">
        <el-button :icon="Plus" type="primary" @click="handleAdd">添加</el-button>
        <el-button :icon="Delete" type="danger" @click="handleDelete">删除</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel :span="14">
        <el-form inline :model="queryForm" @submit.prevent>
          <el-form-item>
            <el-input v-model="queryForm.name" clearable placeholder="请输入名称" />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="listLoading" native-type="submit" type="primary" @click="queryData">查询</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-right-panel>
    </vab-query-form>

    <el-table v-loading="listLoading" border :data="list" @selection-change="setSelectRows">
      <el-table-column type="selection" width="38" />
      <el-table-column align="center" label="名称" prop="name" />
      <el-table-column align="center" label="操作" width="180">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" description="暂无数据" />
      </template>
    </el-table>
    <vab-pagination
      :current-page="queryForm.pageNo"
      :page-size="queryForm.pageSize"
      :total="total"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />
    <xxx-edit ref="editRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { Delete, Plus, Search } from '@element-plus/icons-vue'
import { doDelete, getList } from '/@/api/xxxManagement'

defineOptions({
  name: 'XxxManagement',
})

const editRef = ref<any>(null)
const list = ref<any>([])
const listLoading = ref<boolean>(true)
const total = ref<number>(0)
const selectRows = ref<any>([])
const queryForm = reactive<any>({
  pageNo: 1,
  pageSize: 20,
  name: '',
})

const fetchData = async () => {
  listLoading.value = true
  const { data } = await getList(queryForm)
  list.value = data.list
  total.value = data.total
  listLoading.value = false
}

const handleSizeChange = (value: number) => {
  queryForm.pageNo = 1
  queryForm.pageSize = value
  fetchData()
}

const handleCurrentChange = (value: number) => {
  queryForm.pageNo = value
  fetchData()
}

const queryData = () => {
  queryForm.pageNo = 1
  fetchData()
}

const setSelectRows = (value: any) => {
  selectRows.value = value
}

const handleAdd = () => {
  editRef.value.showEdit()
}

const handleEdit = (row = {}) => {
  editRef.value.showEdit(row)
}

const handleDelete = (row: any) => {
  if (row.id) {
    $baseConfirm('您确定要删除当前项吗', null, async () => {
      const { msg }: any = await doDelete({ ids: row.id })
      $baseMessage(msg, 'success', 'hey')
      await fetchData()
    })
  }
}

onBeforeMount(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.xxx-container {
}
</style>
```

### API 接口模板

```typescript
// src/api/xxxManagement.ts
import request from '/@/utils/request'

export function getList(params: any) {
  return request({
    url: '/xxxManagement/getList',
    method: 'get',
    params,
  })
}

export function doAdd(data: any) {
  return request({
    url: '/xxxManagement/doAdd',
    method: 'post',
    data,
  })
}

export function doEdit(data: any) {
  return request({
    url: '/xxxManagement/doEdit',
    method: 'post',
    data,
  })
}

export function doDelete(data: any) {
  return request({
    url: '/xxxManagement/doDelete',
    method: 'post',
    data,
  })
}
```

### Pinia Store 模板（Options 风格）

```typescript
// src/store/modules/xxx.ts
import { getXxxList } from '/@/api/xxx'

export const useXxxStore = defineStore('xxx', {
  state: (): { list: any[]; loading: boolean } => ({
    list: [],
    loading: false,
  }),
  getters: {
    getList: (state) => state.list,
  },
  actions: {
    async fetchList() {
      this.loading = true
      try {
        const { data } = await getXxxList()
        this.list = data
      } finally {
        this.loading = false
      }
    },
  },
})
```

## 常用 Vab 组件

项目内置的 Vab 组件（来自 `library/components/`），常用的有：

- `<vab-query-form>` / `<vab-query-form-left-panel>` / `<vab-query-form-right-panel>` — 查询表单布局
- `<vab-pagination>` — 分页组件
- `<vab-card>` — 卡片组件
- `<vab-app>` — 应用包装组件

## Hooks 工具函数

`src/hooks/index.ts` 导出的工具函数（自动导入，可在组件中直接使用）：

- `$baseMessage(message, type, customClass)` — 消息提示
- `$baseConfirm(content, title, callback1, callback2)` — 确认对话框
- `$baseAlert(content, title, callback)` — 警告对话框
- `$baseNotify(message, title, type, position, duration)` — 通知
- `$baseLoading(text, background)` — 加载中
- `$pub(...args)` / `$sub(...args)` / `$unsub(...args)` — 发布/订阅

## 详细参考

更多内容请查阅 `references/REFERENCE.md`，包括：
- 路由配置（模块拆分、权限控制、路由守卫）
- Pinia 状态管理完整示例
- Axios 请求封装（拦截器、Token 刷新、错误处理）
- 表单处理模式
- Vite 配置详解

## Resources

- Vue3 Playground: https://play.vuejs.org/
- VueUse: https://vueuse.org/
- Element Plus: https://element-plus.org/
- Vue DevTools: 浏览器调试扩展
