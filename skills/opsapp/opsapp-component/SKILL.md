---
name: opsapp-component
description: >-
  创建 OpsApp 的 UniApp-X 组件，包括基础 primitives 和业务 domain 组件。
  Use when the user asks to create a new component, add a UI component, 
  新建组件, 创建组件, or mentions ops- prefix components.
---

# OpsApp 组件创建工作流

## 步骤 1：确定组件类别

| 类别 | 目录 | 特征 |
|------|------|------|
| **Primitives** | `components/primitives/ops-{name}/` | 通用 UI 组件，无业务逻辑 |
| **Domain** | `components/domain/ops-{name}/` | 特定业务场景组件 |

## 步骤 2：创建组件文件

在对应目录下创建 `ops-{name}/ops-{name}.uvue`。

### Primitives 模板

```uvue
<template>
  <view :class="rootClass">
    <slot />
  </view>
</template>

<script setup lang="uts">
  const props = defineProps({
    // 定义 props，必须提供 type 和 default
    variant: {
      type: String,
      default: 'default'
    }
  })

  const rootClass = computed(() : string => {
    let cls = 'ops-{name}'
    cls += ' ops-{name}--' + props.variant
    return cls
  })
</script>

<style lang="scss">
  .ops-{name} {
    // 使用 uni.scss 中的 Design Token
  }
</style>
```

### Domain 模板（含 v-model）

```uvue
<template>
  <view class="ops-{name}">
    <text class="ops-{name}__label">{{ label }}</text>
    <view class="ops-{name}__content">
      <slot>
        <text class="ops-{name}__value">{{ modelValue }}</text>
      </slot>
    </view>
  </view>
</template>

<script setup lang="uts">
  const props = defineProps({
    label: { type: String, default: '' },
    modelValue: { type: String, default: '' }
  })

  const emit = defineEmits(['update:modelValue'])

  const onInput = (e : InputEvent) => {
    emit('update:modelValue', e.detail.value)
  }
</script>

<style lang="scss">
  .ops-{name} {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: $spacing-md 0;
  }
  .ops-{name}__label {
    font-size: $font-size-base;
    color: $color-foreground;
  }
  .ops-{name}__content {
    flex: 1;
  }
</style>
```

## 步骤 3：注册 easycom（仅 Domain 组件）

如果是新 Domain 组件，需要在 `pages.json` 的 easycom 正则中添加名称：

```json
"^ops-(app-header|bottom-nav|...|{new-name})": "@/components/domain/ops-$1/ops-$1.uvue"
```

Primitives 组件使用通配符 `^ops-(.*)` 自动匹配，无需额外注册。

## 步骤 4：验证清单

- [ ] 文件路径：`components/{primitives|domain}/ops-{name}/ops-{name}.uvue`
- [ ] Script 使用 `<script setup lang="uts">`
- [ ] Props 都有 `type` 和 `default`
- [ ] computed 返回类型显式标注 `() : string =>`
- [ ] CSS 类名前缀为 `ops-{name}`，使用 BEM 风格
- [ ] 颜色/间距/圆角/字号按 `.cursor/skills/opsapp-ui-layout/SKILL.md`，能用 Token 的用 Token
- [ ] 边框分写 `border-width` / `border-style` / `border-color`
- [ ] Domain 组件已在 `pages.json` easycom 中注册

## UTS 语法注意事项

- 类型标注使用空格：`(e : InputEvent)` 不是 `(e: InputEvent)`
- 字符串比较使用 `==` 不是 `===`
- 数组类型 `string[]`，对象数组 `UTSJSONObject[]`
- 无 `interface`，使用 `type` 或直接内联
