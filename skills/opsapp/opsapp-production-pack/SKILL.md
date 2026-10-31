---
name: opsapp-production-pack
description: >-
  按手册打 OpsApp 安卓 / iOS / 鸿蒙生产正式包，核证书、环境、版本并收包到桌面；
  自下一正式版本起配合命名空间 Tag 与禅道发布追溯。
  用户说「按生产打包手册打三端正式包」「打生产包」「云打包正式版」「打三端正式包」
  或要求生产 Tag / 禅道发布收口时使用。
---

# OpsApp 生产打包

先读并严格执行 `docs/20260822-三端生产打包手册.md`。不要凭记忆改证书路径或环境值。

自下一正式版本起，正式 Tag 与禅道发布追溯以  
`docs/agent-workflows/opsapp-release-tag-zentao-governance.md` 为准（对标历史基线 `v1.0.23` 之后的版本；不回填旧 Tag）。

## 接到指令后的顺序

1. 打包前核对（磁盘文件，不是 git 记录）：
   - 在 `master`，且 `HEAD` 等于本次 **final Tag**（`release/fyb/app/v<version>`；历史包若仍钉旧 `v*` 只处理已存在 Tag，新建禁止裸 `v*`）
   - `utils/request.uts` 的 `CURRENT_ENV` 是 `'prod'`
   - `manifest.json` 的 `versionName` / `versionCode` 与用户指定版本一致
2. 若尚未打 final Tag：按治理文档创建 annotated Tag（钉显式 SHA、写注释），**推送前征求用户确认**。
3. 确认 HBuilderX 已打开且已登录。CLI：`/Applications/HBuilderX.app/Contents/MacOS/cli`
4. 证书、密码、CLI 参数只以手册第 2、第 3 节为准。配置 JSON 只写 `/tmp`，不进仓库。
5. 安卓、iOS 串行云打包（uni-app x 一次只能打一个平台）。鸿蒙用 `cli pack app-harmony`。
6. `--iscustom` 必须为 false。安卓必须自有证书（`androidpacktype=0`）。iOS 必须用 App Store 正式 p12 + provision。
7. 下载或拷贝到 `~/Desktop/丰银宝安装包/<用户指定文件夹>/`，按手册命名。
8. 拆包核对版本、包名、ABI、`CURRENT_ENV = "prod"`、鸿蒙 `release-signed`。把结果告诉用户。
9. 删除 `/tmp` 里的打包配置。
10. **禅道收口（须用户明确授权后再写）**：
    - 登录有效 `zentao` Token；回读产品 / 应用 / 有效执行（不写死 ID）
    - 对齐 UI：[项目发布 project=1](https://pm.lengfenghl.org.cn/index.php?m=projectrelease&f=browse&project=1)，字段参考发布 **#58**
    - 三端各建一条 Prod Build（`scmPath` 指向 final Tag URL；描述含 SHA、digest、`CURRENT_ENV=prod`）
    - 创建或更新 Release：`build[]` = 三端 Build，`status=wait`；实际上架后再 `normal`
    - 写前给清单，写后逐对象回读；不自动关联未授权的 Issue

UAT 包走 RC Tag（`release/fyb/app/v<version>-rc.<n>`）与 `CURRENT_ENV=uat`，不要与生产包混用摘要或 Build。

## 用户补参数时怎么处理

- 没说版本：先问，或沿用 `manifest.json` 当前值并复述一遍
- 没说桌面文件夹名：用 `<version>-<versionCode>-生产`
- 只打其中一端：仍走同一套证书与核对，不要改用公共证书或自定义基座
- 只打包、用户未提禅道：完成第 1～9 步即可，并提示下一版起建议补 Build/Release

## 不要做

- 不要把 `CURRENT_ENV` 以外的业务代码改掉再打
- 不要把证书或密码写进仓库新文件或 Tag 注释
- 不要用 `platform=android,ios` 一次提交（会失败）
- 不要把 App Store ipa 当成可侧载包交给用户装
- 不要 `-f` 覆盖 Tag，不要 `git push --tags`
- 不要在未授权时创建/更新禅道 Build 或 Release
- 不要把 UAT 包登记为生产 Release 的上架包体
