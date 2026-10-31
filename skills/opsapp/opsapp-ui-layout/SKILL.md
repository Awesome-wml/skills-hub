---
name: opsapp-ui-layout
description: >-
  OpsApp 页面布局与字号规范。全局页边距 12px，卡片间距 8px，卡片内边距 12px（内容多可改 8px）；
  字号分 Title / SubTitle / Body / Minor / Tip。
  Use when creating or restyling pages/**/*.uvue or components/**/*.uvue,
  when the user mentions 布局、页边距、卡片间距、字号、UI规范、标题、正文, or when adding a new list / detail / form page.
---

# OpsApp 页面布局规范

后期开发新页面、新模块、新卡片，必须按本规范。已有页面只在用户要求统一样式时改间距和字号，不要顺手改无关字号。

颜色、间距优先写 `uni.scss` Token。规范值与 Token 对不上时，以本表为准，不要另造档位。

## 字号层级

| 层级 | 字号 (px) | 字重 | 颜色 | 使用场景 |
| --- | --- | --- | --- | --- |
| Title 标题 | 18 / 20 | 500 / bold | #1F2024 | 页面主标题、模块标题、弹窗标题 |
| SubTitle 副标题 | 16 | 500 / bold | #1F2024 | 卡片标题、列表主标题 |
| Body 正文 | 14 | 400 / Regular | #1F2024 | 列表内容、商品描述、表单文字 |
| Minor 辅助文字 | 12 | 400 / Regular | #71727A / #898989 | 标签、备注、详情次要信息 |
| Tip 提示小字 | 12 | 400 / Regular | #71727A / #898989 | 时间、说明、底部备注、提示文案 |

Token 对照：

| 规范 | 写法 |
| --- | --- |
| Title 18 | `$font-size-lg` + `$font-weight-bold` |
| Title 20 | `20px` + `$font-weight-bold`（无 20 档 Token） |
| SubTitle 16 | `$font-size-base` + `$font-weight-bold` |
| Body 14 | `14px` + `$font-weight-normal`（无 `$font-size-md`，禁止发明） |
| Minor / Tip 12 | `$font-size-sm` + `$font-weight-normal` |
| 主文字 #1F2024 | 先写 `#1F2024`；现有 `$color-foreground` 是 `#333`，不要用它冒充本规范 |
| 辅助 / 提示 | `#71727A` 或 `#898989`，按对比度选；不要用 `$color-muted-foreground`（`#999`）顶替 |

同一页面、同一层级只用一个字号。标题用 18 还是 20：导航栏 / 弹窗标题用 20，模块标题用 18。

## 间距

全局页边距 12px，卡片与卡片上下间距 8px，卡片内边距 12px，内容多的话可改 8px。

| 用途 | 值 | Token |
| --- | --- | --- |
| 页面左右 / 上下边距 | 12px | `$spacing-md` |
| 卡片与卡片上下间距 | 8px | `$spacing-sm` |
| 卡片内边距（默认） | 12px | `$spacing-md` |
| 卡片内边距（内容多、偏挤） | 8px | `$spacing-sm` |

不要把页边距写成 16px（`$spacing-lg`）。不要把卡片间距写成 16px / 24px。

## 列表页骨架

```uvue
<scroll-view class="page-body" direction="vertical">
  <view class="page-inner">
    <ops-card v-for="item in list" :key="item.id">
      <text class="card-title">{{ item.title }}</text>
      <text class="card-body">{{ item.desc }}</text>
    </ops-card>
  </view>
</scroll-view>
```

```scss
.page-body { flex: 1; }
.page-inner { padding: $spacing-md; }           // 页边距 12px
.page-inner ops-card,
.card-gap { margin-top: $spacing-sm; }          // 卡片间距 8px；首张不要上边距
.card {
  padding: $spacing-md;                         // 内边距 12px；挤则 $spacing-sm
}
.card-title { font-size: $font-size-base; font-weight: $font-weight-bold; color: #1F2024; }
.card-body { font-size: 14px; font-weight: $font-weight-normal; color: #1F2024; }
.card-tip { font-size: $font-size-sm; color: #71727A; }
```

首张卡片不要再加 `margin-top`。卡片圆角继续用现有 `$radius-lg` / `ops-card`，本规范不改圆角。

## 一行信息 + 操作

物流条、灰条、右侧按钮：文案单行，溢出 `...`，操作 `flex-shrink: 0`，不要挡住「查看物流」这类入口。

iOS 不要把 `flex: 1` 写在 `<text>` 上，剩余宽度给外层 `view`，否则字形会被压扁。

```scss
.row { display: flex; flex-direction: row; align-items: center; }
.text-wrap { flex: 1; min-width: 0; }
.text { font-size: 14px; color: #1F2024; lines: 1; text-overflow: ellipsis; }
.action { flex-shrink: 0; margin-left: $spacing-sm; }
```

## 不要做的事

- 不要用 `$font-size-base`（16px）当正文
- 不要用 `$spacing-lg`（16px）当页边距或卡片间距
- 不要把辅助字写成 10px（`$font-size-xs`）
- 不要为了「对齐旧页」把新页做成 16px 页边距 + 16px 卡片缝
