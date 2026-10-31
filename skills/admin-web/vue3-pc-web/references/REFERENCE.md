# Vue3 PC Web 详细参考（Shop Vite 项目）

## 路由配置

### 路由入口（src/router/index.ts）

路由支持 Hash 和 History 两种模式，通过 `config/setting.config.ts` 中的 `isHashRouterMode` 配置。

```typescript
// router/index.ts
import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { isHashRouterMode, base } from '/@/config'
import { asyncRoutes } from '/@/router/modules'
import { setupPermissions } from '/@/router/permissions'

export const constantRoutes: VabRouteRecord[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('/@/views/login/Login.vue'),
    meta: { hidden: true },
  },
  {
    path: '/403',
    name: '403',
    component: () => import('/@/views/error/403.vue'),
    meta: { hidden: true },
  },
  {
    path: '/404',
    name: '404',
    component: () => import('/@/views/error/404.vue'),
    meta: { hidden: true },
  },
]

const router = createRouter({
  history: isHashRouterMode ? createWebHashHistory(base) : createWebHistory(base),
  routes: constantRoutes as RouteRecordRaw[],
})

export const setupRouter = (app: App<Element>) => {
  setupPermissions(router)
  app.use(router)
  return router
}

export default router
```

### 路由模块（src/router/modules/）

路由按功能模块拆分，每个模块导出路由数组。Layout 组件作为顶层包装。

```typescript
// router/modules/goods.ts
import Layout from '/@vab/layouts/index.vue'

export const goodsRoutes = [
  {
    path: '/goods',
    name: 'Goods',
    component: Layout,
    meta: {
      title: '商品',
      icon: 'shopping-bag-3-line',
      guard: ['Admin'],
    },
    children: [
      {
        path: 'goodsManagement',
        name: 'GoodsManagement',
        component: () => import('/@/views/goods/GoodsManagement.vue'),
        meta: {
          title: '商品管理',
          icon: 'shopping-basket-line',
        },
      },
    ],
  },
]
```

### 路由 Meta 字段说明

```typescript
meta: {
  title: string          // 菜单标题
  icon: string           // 菜单图标（RemixIcon 名称）
  hidden: boolean        // 是否在菜单中隐藏
  guard: string[]        // 角色权限守卫
  badge: string          // 菜单徽标文字
  dot: boolean           // 菜单红点提示
  fullscreen: boolean    // 是否全屏显示
}
```

### 权限控制（src/router/permissions.ts）

路由守卫处理 Token 校验、用户信息获取、权限路由加载。

```typescript
// router/permissions.ts
import VabProgress from 'nprogress'
import type { Router } from 'vue-router'
import { authentication, loginInterception, routesWhiteList } from '/@/config'
import { useRoutesStore } from '/@/store/modules/routes'
import { useUserStore } from '/@/store/modules/user'

export const setupPermissions = (router: Router) => {
  router.beforeEach(async (to, from, next) => {
    const { routes, setRoutes } = useRoutesStore()
    const { token, getUserInfo, resetAll } = useUserStore()

    VabProgress.start()

    if (token) {
      if (routes.length > 0) {
        if (to.path === '/login') next({ path: '/' })
        else next()
      } else {
        try {
          if (loginInterception) await getUserInfo()
          await setRoutes(authentication)
          next({ ...to, replace: true })
        } catch {
          await resetAll()
          next({ path: '/login', replace: true })
        }
      }
    } else {
      if (routesWhiteList.includes(to.path)) next()
      else next({ path: '/login', replace: true })
    }
  })

  router.afterEach((to) => {
    if (typeof to.meta.title === 'string') {
      document.title = to.meta.title
    }
    if (VabProgress.status) VabProgress.done()
  })
}
```

## Pinia 状态管理

### Store 入口（src/store/index.ts）

```typescript
import type { App } from 'vue'

const pinia = createPinia()

export function setupStore(app: App<Element>) {
  app.use(pinia)
}

export default pinia
```

### Store 模块定义（Options 风格）

本项目的 Pinia Store 使用 **Options API 风格**（state/getters/actions），而非 Setup 函数风格。

```typescript
// store/modules/user.ts
import { getUserInfo, login, logout } from '/@/api/user'
import { tokenName } from '/@/config'
import { getToken, removeToken, setToken } from '/@/utils/token'

export const useUserStore = defineStore('user', {
  state: (): UserModuleType => ({
    token: getToken() as string,
    username: '游客',
    avatar: './static/svg/avatar.svg',
  }),
  getters: {
    getToken: (state) => state.token,
    getUsername: (state) => state.username,
    getAvatar: (state) => state.avatar,
  },
  actions: {
    setToken(token: string) {
      this.token = token
      setToken(token)
    },
    async login(userInfo: any) {
      const {
        data: { [tokenName]: token },
      } = await login(userInfo)
      this.setToken(token)
      await this.getUserInfo()
    },
    async getUserInfo() {
      const {
        data: { username, avatar, roles, permissions },
      } = await getUserInfo()
      if (username) this.username = username
      if (avatar) this.avatar = avatar
    },
    async logout() {
      await logout()
      await this.resetAll()
    },
    async resetAll() {
      await removeToken()
      this.token = ''
      this.username = '游客'
    },
  },
})
```

### ACL 权限 Store

```typescript
// store/modules/acl.ts
export const useAclStore = defineStore('acl', {
  state: (): AclModuleType => ({
    admin: false,
    role: [],
    permission: [],
  }),
  getters: {
    getAdmin: (state) => state.admin,
    getRole: (state) => state.role,
    getPermission: (state) => state.permission,
  },
  actions: {
    setFull(admin: boolean) { this.admin = admin },
    setRole(role: string[]) { this.role = role },
    setPermission(permission: string[]) { this.permission = permission },
  },
})
```

### 在组件中使用 Store

```vue
<script lang="ts" setup>
import { useUserStore } from '/@/store/modules/user'

const userStore = useUserStore()

// 直接访问 state
console.log(userStore.token)
console.log(userStore.username)

// 调用 actions
await userStore.login({ username: 'admin', password: '123456' })
</script>
```

## Axios 请求封装

### 请求实例（src/utils/request.ts）

项目使用 Axios 实例，配置了请求拦截器（自动添加 Bearer Token）和响应拦截器（统一错误处理、Token 刷新）。

```typescript
// utils/request.ts
import { contentType, timeout } from '/@/config'

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_APP_BASE_URL}`,
  timeout,
  headers: {
    'Content-Type': contentType,
  },
})

// 请求拦截器：自动添加 Token
instance.interceptors.request.use((config: any) => {
  const userStore = useUserStore()
  const { token } = userStore
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一错误处理
instance.interceptors.response.use(
  (response) => {
    const { data, status } = response
    // code 200 正常返回
    // code 401 登录过期，跳转登录页
    // code 402 Token 过期，自动刷新
    // code 403 无权限，跳转 403 页
    return data
  },
  (error) => {
    // 网络错误处理
    return Promise.reject(error)
  }
)

export default instance
```

### API 接口定义

每个业务模块一个文件，放在 `src/api/` 目录下。

```typescript
// src/api/goodsManagement.ts
import request from '/@/utils/request'

export function getList(params: any) {
  return request({
    url: '/goodsManagement/getList',
    method: 'get',
    params,
  })
}

export function doAdd(data: any) {
  return request({
    url: '/goodsManagement/doAdd',
    method: 'post',
    data,
  })
}

export function doEdit(data: any) {
  return request({
    url: '/goodsManagement/doEdit',
    method: 'post',
    data,
  })
}

export function doDelete(data: any) {
  return request({
    url: '/goodsManagement/doDelete',
    method: 'post',
    data,
  })
}
```

## 表单处理

### 使用 Element Plus 表单

```vue
<template>
  <el-dialog v-model="dialogVisible" :title="title" width="500px">
    <el-form ref="formRef" label-width="80px" :model="form" :rules="rules">
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" clearable placeholder="请输入名称" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" clearable placeholder="请选择状态">
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button :loading="submitLoading" type="primary" @click="save">确认</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus'
import { doAdd, doEdit } from '/@/api/xxxManagement'

defineOptions({
  name: 'XxxEdit',
})

const emit = defineEmits(['fetch-data'])

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const submitLoading = ref(false)
const title = ref('')
const form = reactive<any>({
  id: '',
  name: '',
  status: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const showEdit = (row: any = {}) => {
  if (row.id) {
    title.value = '编辑'
    Object.assign(form, row)
  } else {
    title.value = '添加'
  }
  dialogVisible.value = true
}

const close = () => {
  dialogVisible.value = false
  formRef.value?.resetFields()
  Object.keys(form).forEach((key) => (form[key] = ''))
}

const save = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      submitLoading.value = true
      try {
        const fn = form.id ? doEdit : doAdd
        const { msg }: any = await fn(form)
        $baseMessage(msg, 'success', 'hey')
        emit('fetch-data')
        close()
      } finally {
        submitLoading.value = false
      }
    }
  })
}

defineExpose({ showEdit })
</script>
```

> 示例里「启用 / 禁用」两个固定选项仅作演示。业务状态这类会扩展的枚举，选项用 `getDictItemsByKey(DICT_KEY_XXX)`（`/@/api/dictManagement`）拉取；列表、详情的展示文案读后端注入的 `{field}Label`，不要在 `.vue` 里写 code→中文 map。

## 配置文件

### 网络请求配置（src/config/net.config.ts）

```typescript
export const netConfig = {
  contentType: 'application/json;charset=UTF-8',
  timeout: 10000,
  successCode: [200, 0, '200', '0'],
  statusName: 'code',
  messageName: 'msg',
}
```

### 全局设置（src/config/setting.config.ts）

```typescript
export const settingConfig = {
  title: 'Vue Shop Vite',
  isHashRouterMode: true,
  routesWhiteList: ['/login', '/register', '/404', '/403'],
  tokenName: 'token',
  storage: 'localStorage',
  loginInterception: true,
  authentication: 'intelligence',  // 'intelligence' 前端路由 | 'all' 后端路由
  i18n: 'zh',
}
```

## Vite 配置

### 路径别名

```typescript
// vite.config.ts
resolve: {
  alias: {
    '~/': `${resolve(__dirname, '.')}/`,
    '/@/': `/${resolve(__dirname, 'src')}/`,
    '/@vab/': `/${resolve(__dirname, 'library')}/`,
  },
},
```

### 自动导入配置（library/build/unplugin/index.ts）

```typescript
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export const createUnPlugin = (env) => {
  return unplugin({
    env,
    imports: [
      'vue',           // ref, reactive, computed, watch, onMounted 等
      'pinia',         // defineStore, createPinia 等
      'vue-i18n',      // useI18n 等
      'vue-router',    // useRouter, useRoute 等
      '@vueuse/core',  // 所有 VueUse 函数
      { axios: [['default', 'axios']] },
    ],
    resolvers: [
      ElementPlusResolver({ importStyle: false }),
    ],
  })
}
```

### 构建分包

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vsv-element-plus': ['element-plus'],
        'vsv-nprogress': ['nprogress'],
        'vsv-echarts': ['echarts'],
      },
    },
  },
},
```

## Mock 数据

项目使用 `vite-plugin-mock` 进行本地 Mock 开发。Mock 控制器放在 `mock/controller/` 目录。

```typescript
// mock/controller/user.ts
const users = [
  { username: 'admin', password: '123456', roles: ['Admin'], token: 'admin-token' },
]

export default [
  {
    url: '/login',
    type: 'post',
    response: (config) => {
      const { username, password } = config.body
      const user = users.find((u) => u.username === username && u.password === password)
      if (user) {
        return { code: 200, msg: '登录成功', data: { token: user.token } }
      }
      return { code: 500, msg: '用户名或密码错误' }
    },
  },
]
```

## 入口文件（src/main.ts）

```typescript
import { setupVab } from '~/library'
import App from './App.vue'
import { setupI18n } from '/@/i18n'
import { setupRouter } from '/@/router'
import { setupStore } from '/@/store'

const app = createApp(App)

setupVab(app)    // 1. Vab 组件库
setupI18n(app)   // 2. 国际化
setupStore(app)  // 3. Pinia 状态管理
setupRouter(app) // 4. 路由 + 权限

app.mount('#app')
```

## 环境变量

| 变量名 | 说明 | 文件 |
|---|---|---|
| `VITE_APP_BASE_URL` | API 接口基础地址 | `.env.development` / `.env.production` |
| `VITE_APP_GITHUB_USER_NAME` | 授权用户名 | `.env` |
| `VITE_APP_SECRET_KEY` | 授权密钥 | `.env` |

使用方式：`import.meta.env.VITE_APP_BASE_URL`
