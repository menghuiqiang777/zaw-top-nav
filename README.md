# ZAW Top Nav

ZAW 平台统一顶部导航栏 Web Component，被所有前端子系统（IAM、Dashboard、Agent）共享。零依赖，使用 Shadow DOM 实现样式隔离。

## 技术栈

- **语言**: 原生 JavaScript (ES Class)
- **范式**: Web Components (Custom Elements v1 + Shadow DOM)
- **依赖**: 无（零依赖）
- **构建**: 无（直接复制源文件到 dist/）

## 功能

- ZAW Logo 显示
- 子系统切换器（Dashboard、IAM、Report、Agent）
- 子导航项（通过 `subnav` 属性以 JSON 配置）
- 用户下拉菜单（头像、用户名、子系统切换、退出登录）
- 基于角色的导航可见性（`enterprise_admin`、`global_admin`）
- SPA 感知导航（通过 `window.__zawNavHandler` 钩子）

## 使用方式

```html
<!-- 在 index.html 中引入 -->
<script src="/top-nav/zaw-top-nav.js"></script>

<!-- 在页面中使用 -->
<zaw-top-nav subnav='[{"label":"首页","href":"/"},{"label":"设置","href":"/settings"}]'></zaw-top-nav>
```

## 认证状态读取

组件从以下位置读取认证信息：
- Cookie: `zaw_user`, `zaw_token`, `dash_role`
- localStorage: `zaw_user`, `zaw_token`

退出登录时清除 `.zaw.zxtech.info` 域下的 Cookie 和 localStorage，然后跳转到 `/login`。

## 构建

```bash
npm run build
# 等同于: mkdir -p dist && cp src/zaw-top-nav.js dist/zaw-top-nav.js
```

## 项目结构

```
src/
└── zaw-top-nav.js    # 完整组件（~234 行）
```

## 分发方式

本组件不独立部署为容器，而是由其他前端应用（zaw-nginx、zaw-iam-frontend、zaw-dashboard-frontend）通过静态文件方式加载。zaw-nginx 的 Dockerfile 会在构建时从 GitHub 克隆本仓库并复制 `zaw-top-nav.js`。
