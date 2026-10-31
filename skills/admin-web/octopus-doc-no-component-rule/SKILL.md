---
name: octopus-doc-no-component-rule
description: Use when creating or modifying octopus-admin frontend list or detail pages that display business document numbers, especially when a document number opens a detail view or must support click-to-copy. Enforces the same DocNoLink and BizNo components used by the store shipment-plan page.
---

# Octopus 单据号组件规则

Apply this rule to document-number fields on new or modified `octopus-admin` pages. Use the store shipment-plan page as the implementation reference:

- navigation example: `src/views/procurement/shipment-plan/list/index.vue`
- list column example: `src/views/procurement/shipment-plan/list/columns.ts`
- detail copy example: `src/views/procurement/shipment-plan/list/DetailDrawer.vue`
- shared components: `src/components/DocNoLink/index.vue` and `src/components/BizNo/index.vue`

## Choose by behavior

Classify each displayed document number before implementing it:

- If clicking the number opens a detail page, drawer, dialog, or another business record, render `DocNoLink`. Do not render the document number as `el-button`, `el-button link`, or a hand-written `el-link`.
- If the number does not navigate and users need to copy it, render `BizNo`. Reuse the shared component instead of adding a custom copy icon, clipboard handler, or page-local copy styling.
- In a detail view, the current record's own number normally uses `BizNo`; a related number that genuinely navigates uses `DocNoLink`.
- Keep ordinary operation buttons as buttons. This rule changes document-number cells, not action columns.

## List-page implementation

For a navigation column in `VabSchemaTable`, provide the cell slot and reuse the existing open-detail handler:

```vue
<template #cell-planNo="{ row }">
  <doc-no-link :value="row.planNo" @open="() => handleViewDetail(row)" />
</template>
```

Import the component from `/@/components/DocNoLink/index.vue`. Preserve the existing route, drawer/dialog behavior, permissions, and request parameters.

For non-navigation numbers in `VabSchemaTable`:

- A column without a cell slot whose title ends in `单号` is rendered as `BizNo` automatically.
- Use `copyable: true` when a copyable business number has a title that does not match the automatic convention.
- Use `copyable: false` only when the field must deliberately remain plain text.
- If a custom cell slot is required, render `<biz-no :value="..." />` explicitly and import `/@/components/BizNo/index.vue`.

Do not add a custom cell slot merely to duplicate `VabSchemaTable`'s built-in `BizNo` behavior.

## Detail-page implementation

Render copyable, non-navigation numbers with the shared component:

```vue
<el-descriptions-item label="订货单号">
  <biz-no :value="detail?.header?.planNo" />
</el-descriptions-item>
```

For generated description loops, use the existing `isBizNoLabel` helper from `/@/utils/docNo` when label-based detection is appropriate.

## Boundaries and verification

- Do not apply this interaction to SKU, product codes, member numbers, sort numbers, or editable form inputs merely because they contain a number.
- Masked values containing `*` must remain non-copyable; rely on `BizNo` rather than bypassing its guard.
- Do not change API calls, SDK fields, permissions, routes, or detail-opening behavior as part of this rule.
- Before finishing, inspect every changed document-number field and confirm that navigation uses `DocNoLink`, copy-only display uses `BizNo`, and no document number is still implemented as an `el-button`.
