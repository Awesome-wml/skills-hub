---
name: opsapp-timer-cleanup
description: >-
  OpsApp 页面里创建 setTimeout/setInterval（扫码看门狗、防抖、倒计时、数量同步、滚动锁等）时，
  必须在页面卸载时清理，避免内存泄漏与闪退（对应禅道 Bug #394：代采APP运行过程中频繁闪退）。
  Use when writing or reviewing any pages/**/*.uvue that calls setTimeout or setInterval,
  when adding a scan watchdog / debounce / countdown timer, or when the user mentions
  内存泄漏、闪退、定时器未清理、getNativePage、onUnload 定时器.
---

# OpsApp 页面定时器清理

## 根因

页面里 `setTimeout`/`setInterval` 创建的定时器，如果在触发前用户已经离开页面（`onUnload`），
定时器到点后仍会执行回调，回调里修改绑定在模板上的响应式变量（`xxx.value`），会导致框架尝试
操作已销毁的原生页面，抛出 `TypeError: null is not an object (evaluating 'this.getNativePage().document')`，
多次累积表现为「频繁闪退」。

## 强制规则

**任何页面新增 `let xxxTimer = 0` / `let xxxWatchdog = 0` 来存 `setTimeout`/`setInterval` 返回值，
必须在同一个文件的 `onUnload` 里用统一工具清理，禁止手写 `if (timer != 0) { clearTimeout(timer); timer = 0 }`。**

统一工具：`utils/timer-guard.uts`

```typescript
export function clearManagedTimeout(timer : number) : number
export function clearManagedInterval(timer : number) : number
```

用法（因为数字是值类型，必须用返回值赋回原变量）：

```typescript
import { clearManagedTimeout } from '../../utils/timer-guard.uts'
// 页面在 pages/<module>/<file>.uvue 时，相对路径固定为 '../../utils/xxx.uts'

let scanProductWatchdog = 0
let scanLocationWatchdog = 0

onUnload(() => {
	scanProductWatchdog = clearManagedTimeout(scanProductWatchdog)
	scanLocationWatchdog = clearManagedTimeout(scanLocationWatchdog)
})
```

若文件里还有 `setInterval`，用 `clearManagedInterval` 同样方式清理。

## 已有专用清理函数也要接入统一工具

如果文件里已经有 `clearScanXxxWatchdog()` 之类的清理函数（用于扫码成功/失败/超时回调里提前清理），
也要改成调用 `clearManagedTimeout`，不要在同一文件里保留两套写法：

```typescript
// ✅ GOOD
const clearScanSkuWatchdog = () : void => {
	scanSkuWatchdog = clearManagedTimeout(scanSkuWatchdog)
}

// ❌ BAD - 手写 if 判断，和 onUnload 里的统一写法不一致
const clearScanSkuWatchdog = () : void => {
	if (scanSkuWatchdog != 0) {
		clearTimeout(scanSkuWatchdog)
		scanSkuWatchdog = 0
	}
}
```

## 只清定时器不够：卸载时还要断开大对象

LeakCanary 在本项目反复报同一条框架链（`UniNativeDocumentImpl.calculatedCallback`
→ 已销毁的 `GenPagesXxx` → `Page.$nativePage` → 已销毁 Activity）。
这个 `calculatedCallback` 是**单个字段而不是列表**，框架同时只握住一个已销毁页面，
Activity 本体固定 47.9 kB，不随页面数累加，**前端注销不了**。

所以别在业务页为这条链继续打补丁。真正能改的是「被握住时页面拖着多少数据」，实测差 4 倍多：

| 页面 | 卸载时是否置空大对象 | 页面实例保留 |
| --- | --- | --- |
| `payment-success`（几乎无业务数据） | — | 166.6 kB / 3488 对象（渲染树基线） |
| `home`（改前，商品列表仍挂在实例上） | 否 | 741.2 kB / 19712 对象 |
| `cart`（改前） | 否 | 690.4 kB / 17919 对象 |
| `cart`（改后，同一条框架链） | 是 | **292.1 kB / 7344 对象** |

**判断有没有修好，只看引用链里 `GenPagesXxx` 那行的 `Retaining`，不要看日志文件名里的字节数。**
文件名那个数（本项目恒为 47893–47927 B）是被销毁 Activity 自身的保留量，业务侧清理再彻底也不会变，
拿它当验收标准会永远看到「没修好」。上表同一个购物车页就是证据：页面实例降了 58%，Activity 一个字节没动。

同理，收到泄漏日志时先判断是不是业务问题，两条判据：

- 引用链上有没有业务侧的东西（自己的闭包、定时器、`uni.$on` 回调）。
  全是 `appframe.*` / `IndexKt$$ExternalSyntheticLambda` / `PageFrameView` 这类框架类，就不是漏卸载
- LeakCanary 是因为 Activity 收到 `onDestroy()` 才开始 watch 的，
  报出来本身就说明卸载流程跑完了、`onUnload` 执行过，别再去查「是不是没卸载」

所以每个持有列表 / 详情 / 映射的页面，`cleanupPage()` 里除了清定时器，还要：

- 把 `products` / `items` / `orders` / `preview` / `detail` / `logisticsPackages` 等置空
- 把 `xxxMap`、`xxxCache` 这类 `UTSJSONObject` 置回 `{}`
- 关掉弹层、复位 `loading` / `submitting`
- 有防抖未落库的数据（购物车数量）先补发再置空，别把用户改动丢掉

```typescript
let disposed = false
let cleaned = false

/** 页面销毁后框架可能仍持有页面实例一段时间，大列表挂在实例上会一起被留住 */
function cleanupPage() : void {
	if (cleaned) return
	cleaned = true
	disposed = true
	qtySyncTimer = clearManagedTimeout(qtySyncTimer)
	flushListCartQtyOnExit(pendingQtyUpdates.value, syncedQtyMap.value)
	products.value = [] as UTSJSONObject[]
	cartQuantities.value = {} as UTSJSONObject
}

onUnload(() => { cleanupPage() })
onUnmounted(() => { cleanupPage() })
```

配套的 `disposed` 要挡在**每个请求回调开头**，尤其是自己会 `redirectTo` 的支付链路：
支付成功后本页已被替换，`.then` 里再弹 toast 就会去碰已拆掉的 document。

见 `docs/20260828-采购与订单页内存泄漏-bug修复方案.md`。

## 新增/修改页面时的检查清单

- [ ] 页面里每个 `setTimeout`/`setInterval` 调用都把返回值存进一个 `let` 变量（禁止裸调用不存句柄）
- [ ] 该文件已有 `import { clearManagedTimeout } from '../../utils/timer-guard.uts'`（按实际相对深度调整）
- [ ] `onUnload` 钩子里，把文件内**所有**定时器变量逐一清理一遍（不要漏掉，新增定时器时同步补充）
- [ ] 定时器回调里如果会修改响应式变量（`xxx.value`），额外确认清理后不会残留副作用（如 focus 状态、loading 状态）
- [ ] 页面持有列表 / 详情 / 映射时，`cleanupPage()` 里一并置空，并给请求回调加 `disposed` 判断
- [ ] 改完跑一次 `ReadLints` 确认无报错

## 参考

- 完整根因分析、影响范围、全仓库扫描结果：`docs/20260818-页面定时器未清理导致内存泄漏与闪退-bug修复方案.md`
- 对应任务清单：`dev-plan/20260818-页面定时器未清理导致内存泄漏与闪退-plan.md`
- 已接入统一工具的 18 个文件可作为参考范例：`pages/pick/execute.uvue`、`pages/sort/execute.uvue`、`pages/inventory/query.uvue` 等（含多定时器场景）
