---
name: octoups-miniapp-standards
description: >-
  Use when modifying the octoups-user WeChat miniprogram's pages, components,
  styles, TDesign usage, elderly mode, navigation bars, popup or dialog
  behavior, button rendering, or form/data submission rules. This skill adapts
  the repo's existing Cursor rules into Codex-readable guidance and tells Codex
  which rule files to load for the current task.
---

# octoups-user: repo-wide implementation standards

## When to use

Use this skill for requests like:

- "Modify this miniprogram page or component"
- "Refactor this module with TDesign"
- "Fix elderly mode or mode inheritance"
- "Fix navbar overlap, popup issues, or button layout"
- "Adjust form defaults, total amount logic, or required fields"
- "Implement this feature with the repo's existing standards"

If the task touches `miniprogram/pages/*`, `miniprogram/components/*`,
`miniprogram/styles/*`, `app.ts`, `app.wxss`, or strongly related UI/business
logic, load this skill first.

## Default workflow

1. Determine the task type first. Do not read every rule file by default.
2. For normal UI or styling work, read these first:
   - `../../rules/octoups-design-system.mdc`
   - `../../rules/component-first.mdc`
3. Then read only the rules that match the current task:
   - elderly mode, `mode`, token inheritance:
     `../../rules/default-elderly-mode.mdc`
   - `t-navbar` on `navigationStyle: custom` pages:
     `../../rules/tdesign-navbar-layout.mdc`
   - `t-button` width, background, or `open-type` handling:
     `../../rules/button-rendering.mdc`
   - `t-popup` or `t-dialog` over `textarea`, `input`, `map`, `camera`,
     `video`, or `canvas`:
     `../../rules/native-component-penetration.mdc`
   - totals, form defaults, required fields, backend-trust boundaries,
     backend-error transparency, fallback values, `catch` behavior, or
     nullability/resource-failure exposure:
     `../../rules/data-integrity.mdc` and `references/error-exposure.md`
4. If the task also touches `miniprogram/sdk/**`, `openapi/**`, typed API
   integration, or orval generation, also use
   `../octoups-miniprogram-sdk/SKILL.md`.
5. If the task starts from a screenshot or design image, also use
   `../octoups-screenshot-to-spec/SKILL.md`.
6. If the result page is already confirmed and the task is to implement real
   code, also use `../octoups-spec-to-code/SKILL.md`.
7. If the task is iconfont integration or sync, also use
   `../octoups-iconfont/SKILL.md`.

## Hard constraints

- Prefer TDesign first, then existing business components, then page-local UI.
- For elderly mode issues, check token inheritance and `{{mode}}` propagation
  before adding new component props.
- Treat error exposure as a hard rule: front-end must not absorb, disguise, or
  silently smooth over backend, contract, or runtime problems into normal
  states.
- When backend APIs return business errors, do not silently swallow them,
  rewrite them into generic copy, or resolve fallback empty data just to keep
  the page running. Default to exposing the backend problem as-is.
- If backend fields that should exist come back as `null` / `undefined`, do not
  coalesce them into empty strings, empty arrays, empty objects, zero, false,
  or placeholder URLs just to preserve rendering.
- Do not turn a real failure into an empty state or default-success state. If a
  request failed, keep it on the error path instead of downgrading it to
  “temporarily no data”.
- If backend-provided image URLs fail to load, do not auto-replace them with
  default avatars, default covers, placeholder posters, or backup CDN links.
- If a page really must `catch` for UI cleanup such as closing loading states or
  unlocking buttons, do the cleanup, surface a visible failure when the action
  is user-facing, and keep the error on the failure path instead of turning it
  into a fake success.
- Do not infer component boundaries from screenshots alone when repo code or
  spec files already define them.
- If rules conflict, use this priority:
  1. The user's explicit request
  2. The task-specific skill
  3. The most directly related `.mdc` rule
  4. The general design-system and component-first rules

## Read next when needed

- Error exposure and anti-fallback rules: `references/error-exposure.md`
- Screenshot-driven spec work: `../octoups-screenshot-to-spec/SKILL.md`
- Confirmed result -> real code: `../octoups-spec-to-code/SKILL.md`
- Iconfont updates: `../octoups-iconfont/SKILL.md`
- SDK / OpenAPI tasks: `../octoups-miniprogram-sdk/SKILL.md`
