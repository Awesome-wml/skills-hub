---
name: opsapp-debounce-throttle
description: >-
  OpsApp 页面/组件里实现防抖（搜索联想、数量同步、表单校验等只关心最后一次调用的场景）
  或节流（防止按钮/导航短时间内重复触发的场景）时，必须使用统一工具
  utils/debounce-guard.uts 的 scheduleDebounced 和 utils/throttle-guard.uts 的
  scheduleThrottleUnlock，禁止手写 clearTimeout/setTimeout 样板代码。
  Use when writing or reviewing any pages/**/*.uvue or components/**/*.uvue that
  implements search/input debounce, quantity sync delay, repeat-click prevention,
  navigation lock, or when the user mentions 防抖、节流、debounce、throttle、重复点击、防重复提交.
---

# OpsApp 防抖与节流

## 如何区分该用哪个

- **防抖（debounce）**：只关心「最后一次」触发，之前的调用全部作废。典型场景：搜索联想、输入校验、数量同步、地址解析。特征：用户停止操作一段时间后才执行一次。
- **节流（throttle）**：关心「立即执行第一次」，并在短时间窗口内屏蔽后续重复触发。典型场景：防止重复点击提交按钮、防止连续点击导航/切 tab。特征：点一下马上有反应，短时间内再点不生效。

## 防抖：scheduleDebounced

```typescript
import { scheduleDebounced } from '../../utils/debounce-guard.uts'

let searchTimer = 0
searchTimer = scheduleDebounced(searchTimer, () => {
	executeSearch()
}, 300)
```

## 节流：锁标记 + scheduleThrottleUnlock

节流没有天然的「数值句柄」可以复用判断，需要一个 `locked` 布尔量 + 一个解锁定时器配合：

```typescript
import { scheduleThrottleUnlock } from '../../utils/throttle-guard.uts'

let submitLocked = false
let submitUnlockTimer = 0

function onSubmit() {
	if (submitLocked) return   // 窗口期内直接忽略
	submitLocked = true
	doSubmit()                 // 立即执行一次
	submitUnlockTimer = scheduleThrottleUnlock(submitUnlockTimer, () => {
		submitLocked = false
	}, 400)
}
```

## 禁止的写法

```typescript
// ❌ BAD - 手写 clearTimeout/setTimeout，容易漏清理、延迟时间前后不一致
if (searchTimer != 0) {
	clearTimeout(searchTimer)
}
searchTimer = setTimeout(() => {
	executeSearch()
}, 300)
```

## 防抖落库期间禁止远程回刷

「先本地乐观改，防抖后再落库」的写法里，**防抖窗口内任何一次远程回刷都会把本地值打回旧值**：
请求跑在落库之前，服务端返回的还是改动前的数据，整表覆盖本地缓存后，用户看到的就是「点了没反应」或数字跳变。

排查时要把所有回刷入口都找出来，不只是本页那次显式调用：

- 页面成功回调里的整表回刷（`docs/20260815-进货加购连点数量回跳-bug修复方案.md`）
- **组件的「刷新 key」监听**：页面本地改完自增一个 `refreshKey`，组件 `watch` 到之后又去打接口。
  `refreshKey` 自增时缓存已经是最新值，监听里只该读缓存，远程回刷放在 `onMounted`。
  漏掉这条的案例见 `docs/20260828-购物车角标数量跳变-bug修复方案.md` 第 2.2 节：底栏角标每次加减都打一次 `cart/list`，角标比购物车少 1。
- 页面销毁只 `clearManagedTimeout` 会把未落库的最后一次改动直接丢掉，需要在销毁时补发（`flushListCartQtyOnExit`）。

## 检查清单

- [ ] 防抖场景用 `scheduleDebounced`，节流场景用「锁标记 + `scheduleThrottleUnlock`」
- [ ] 本地乐观值 + 防抖落库时，防抖窗口内没有任何远程回刷会覆盖它（含组件 `refreshKey` 监听）
- [ ] 页面销毁时未落库的改动有补发，不是只清定时器
- [ ] 定时器变量统一 `let xxxTimer = 0`，在 `onUnload` 用 `clearManagedTimeout` 清理（详见 `opsapp-timer-cleanup` skill）
- [ ] 节流场景的 `xxxLocked` 布尔量也要在 `onUnload` 里一并复位为 `false`
- [ ] 改完跑一次 `ReadLints` 确认无报错

## 参考

- `utils/debounce-guard.uts`、`utils/throttle-guard.uts`、`utils/timer-guard.uts`
- 已用防抖工具的文件：`pages/pick/execute.uvue`、`pages/procurement-mall/cart.uvue`、`pages/procurement-mall/home.uvue`、`pages/procurement-mall/search.uvue`、`pages/onboarding/onboarding.uvue`、`components/domain/ops-store-form/ops-store-form.uvue` 等
- 已用节流工具的文件：`utils/capability-guard.uts`（`guardNavigateTo`/`guardSwitchTab` 防重复点击导航/切 tab）
