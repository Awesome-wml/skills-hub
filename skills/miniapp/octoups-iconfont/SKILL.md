---
name: octoups-iconfont
description: >-
  Integrates or updates Alibaba iconfont (Font class) in the octoups-user WeChat
  miniprogram. Use when the user downloads a new iconfont zip, adds project icons
  on iconfont.cn, mentions iconfont/阿里图标/字体图标, or asks to sync icons
  into the repo.
---

# octoups-user：iconfont 接入与更新

## 同时启用

- 如果本次 iconfont 改动还会落到页面或组件代码，同时加载
  `../octoups-miniapp-standards/SKILL.md`

## 约定路径（本仓库）

| 用途 | 路径 |
|------|------|
| 字体与清单 | `miniprogram/assets/iconfont/` |
| 样式入口 | `miniprogram/assets/iconfont/iconfont.wxss` |
| 全局引入 | `miniprogram/app.wxss` 中 `@import './assets/iconfont/iconfont.wxss';`（已存在则勿重复） |

`@font-face` 里 `url()` **相对 `iconfont.wxss` 所在目录**，字体文件与 `iconfont.wxss` 同目录即可。

## 首次接入或替换整包

1. 在 iconfont 项目页 **下载至本地**（Font class），解压。
2. 将 **`iconfont.woff2`、`iconfont.woff`、`iconfont.ttf`** 复制到 `miniprogram/assets/iconfont/`（覆盖旧文件）。
3. 可选：复制 **`iconfont.json`** 到同目录，便于查 `font_class` / `unicode`。
4. 打开解压包里的 **`iconfont.css`**，更新 `iconfont.wxss`：
   - **`@font-face`**：整段替换（注意 `?t=` 时间戳与文件名与磁盘一致）。
   - **`.iconfont` 基类**：保留或按产品规范调整默认 `font-size`（小程序常用 `rpx`）。
   - **每个图标的规则**：把 `.icon-xxx:before` 改为 **`.icon-xxx::before`**（与现有 wxss 一致），`content` 保持 `\eXXX` 不变。
5. **不要**把 `demo_index.html`、`demo.css`、`iconfont.js`（Symbol 用）拷进小程序业务目录，除非另有用途。
6. 在开发者工具里编译预览，确认图标显示；若空白，检查字体是否提交、路径是否相对 `iconfont.wxss`。

## 仅新增图标（已有字体包）

若用户在网站上 **只加了新图标** 并重新生成了包：

- 仍建议 **整包替换** 三个字体文件 + 合并 **完整的** `iconfont.css` 中新增/变更的 `.icon-*` 规则（避免遗漏 glyph）。
- 同步更新 `@font-face` 若下载包里的 `?t=` 或文件哈希已变。

## 页面中使用

> ⚠️ **两个关键限制**：
> 1. 微信小程序 **不支持 `::before` 伪元素**渲染字体字符（`view` / `text` 上写 `::before { content }` 均无效）。
> 2. 微信小程序 WXML **不解析 HTML 实体**（`&#xe619;` 会直接显示为字符串，而不是图标字符）。

正确做法：在 **TypeScript `data` 里用 `String.fromCharCode` 生成真实 Unicode 字符**，再通过数据绑定传给 `text` 标签。

```ts
// page.ts
data: {
  icons: {
    xiangmuguanli: String.fromCharCode(0xe6b2),
    jiazaizhong:   String.fromCharCode(0xe619),
  },
},
```

```html
<!-- page.wxml — ✅ 正确 -->
<text class="iconfont">{{icons.xiangmuguanli}}</text>

<!-- ❌ 错误：HTML 实体在 WXML 中不解析 -->
<text class="iconfont">&#xe6b2;</text>

<!-- ❌ 错误：view/text 上的 ::before 在小程序中无效 -->
<view class="iconfont icon-xiangmuguanli"></view>
```

unicode 十六进制值来自 `iconfont.json` 的 `unicode` 字段，加 `0x` 前缀传入 `String.fromCharCode`。

## 演示页

`pages/profile/index` 中有「项目图标（iconfont）」演示区块；新增图标后可在该页加一行 `iconfont-demo__item` 便于自测（可选）。
