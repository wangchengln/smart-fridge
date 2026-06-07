# 智能云冰箱

基于「库存管理 → 拍照识别 → 菜谱推荐 → 美团补购」闭环的智能冰箱应用。前端为 React + Vite 移动端 UI，后端为 FastAPI + SQLAlchemy。

## 产品定位

**一句话：** 以家庭真实库存为锚点，串联餐食决策与美团即时零售、外卖、鲜食等服务，做家庭饮食决策与交易入口。

### 是什么、不是什么

外部智能冰箱解决「我家冰箱里有什么」；美团云冰箱解决「我家冰箱如何驱动美团 30 分钟万物到家」。

它不是单纯的菜谱 App——核心价值不在于罗列「有哪些菜谱可以看」；也不是只负责记录库存的家庭工具——不在于罗列「平台上有哪些商品可以买」。而是一套**以家庭真实库存为起点**、连接餐食决策与美团服务网络的**家庭入口型产品**：站在家庭当前状态出发，先理解「家里已经有什么、还差什么、最适合如何解决这顿饭」，再把这个判断自然承接到美团既有的即时零售、外卖、鲜食和场景服务体系中。

### 要解决的问题

家庭餐食场景的核心矛盾，不是没有供给，也不是没有内容，而是**缺乏一层基于真实库存的统一决策逻辑**。

| 现有能力 | 更擅长回答 |
|----------|------------|
| 菜谱平台 | 你想做什么 |
| 零售平台 | 你可以买什么 |
| 外卖平台 | 你现在能点什么 |

这些能力大多默认用户已经知道自己此刻需要什么。真实生活却往往相反，用户面对的是更前置的一连串问题：

- 家里到底还有什么、哪些食材快过期
- 这顿饭是自己做更划算，还是直接点外卖更省事
- 如果只差一点点材料，应该如何最省钱地补齐
- 不想做饭时，在外卖、闪购和半成品之间如何选

正因为这些判断没有被系统化接住，用户每天都在重复低效率决策：重复购买、囤货浪费、在多个页面和多个平台之间来回切换，最终要么草率下单，要么放弃做饭。美团云冰箱要重组的，不是某一个局部动作，而是**从库存认知 → 餐食决策 → 履约下单**的整条生活决策链路。

### 用户价值与平台价值

**对用户：** 让库存可见、让决策更轻、让履约更准。用户不再需要先想好菜谱再去搜食材，也不需要先决定是做饭还是点外卖，而是可以从家庭当前库存直接出发，获得一条更省时、更省钱、也更贴近真实生活的行动路径。

**对平台：** 把家庭库存从「用户家里看不见的数据」转化为「平台可以理解的需求前置信号」。在交易发生之前，先更准确地理解家庭此刻的真实需求，从而把「30 分钟万物到家」的能力前移到**需求识别和决策编排**这一层，为外卖、闪购、鲜食、场景购、买药甚至会员权益等多业务线提供更高质量的入口。

| 视角 | 价值 |
|------|------|
| 用户 | 库存可见、决策更轻、履约更准；从当前库存直接获得行动路径，无需先定菜谱或先选做饭/外卖 |
| 平台 | 库存即需求信号；在下单前完成需求理解与方案编排，提升多业务线转化质量 |

美团云冰箱不是对现有美团业务的重复建设，而是在家庭餐食场景中补上长期缺位、却又极具想象空间的上游能力：**需求识别与决策编排**。


## 技术栈

**前端：** React 18、TypeScript、Vite、React Router、TanStack Query、Tailwind CSS、Radix UI、Axios

**后端：** FastAPI、SQLAlchemy 2、Pydantic v2、python-jose（JWT）、Celery + Redis（可选）、Pillow

## 环境要求

- Node.js 18+（推荐通过 nvm 安装）
- Python 3.10+
- Redis（可选，仅在使用 Celery 异步识别时需要）

## 快速开始

### 1. 安装前端依赖

```bash
nvm install 18
nvm use 18
npm install
```

### 2. 启动前端

```bash
npm run dev
```

### 3. 安装并启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn src.main_api:app --reload --host 0.0.0.0 --port 8000
```

- API 根地址：`http://localhost:8000`
- Swagger 文档：`http://localhost:8000/docs`
- 健康检查：`GET /health`

### 4. 登录验证

## 测试账号与用例

### 测试账号

| 字段 | 值 | 说明 |
|------|-----|------|
| 手机号 | `15904538766` | 联调后端时推荐使用；首次登录自动注册 |
| 验证码 | `123456` | 开发 / 演示固定验证码 |

任意手机号与验证码均可登录；联调真实后端时建议使用上表账号，便于复现库存与推荐数据。

### 推荐验收用例

按产品主线从前到后走通以下路径，可覆盖当前前端已实现的核心能力：

| # | 场景 | 操作步骤 | 预期结果 |
|---|------|----------|----------|
| 1 | 登录 | `/#/login` 输入测试账号 → 立即登录 | 进入首页，底部 Tab 可用 |
| 2 | 库存认知 | 首页 → **识别** Tab → 上传冰箱图片 → 确认入库 | 识别结果写入库存；**冰箱** Tab 可见新增食材 |
| 3 | 库存管理 | **冰箱** Tab → 手动增删改、查看临期提醒 | 库存列表更新，临期食材高亮 |
| 4 | 餐食决策 | 首页四象限或 **菜谱** Tab → 切换「自己做 / 闪购补料 / 外卖 / 鲜食」 | 各象限展示对应推荐列表，筛选与重新推荐生效 |
| 5 | 菜谱详情 | 点击任一菜谱 → 调整人份 → 查看步骤与营养分析 | 食材按人份缩放；可发起菜谱 AI 问答；可标记已做饭 |
| 6 | 闪购补购 | 菜谱详情或闪购象限 → **缺口分析** → **补购方案** → **选品** → **订单确认** | 标准 / 省钱方案可对比；商品匹配、凑单、下单流程可走通 |
| 7 | 外卖履约 | 菜谱页选「外卖同款」→ 商户列表 → 店铺选菜 | 外卖上下文正确传递，店铺页可浏览菜品 |
| 8 | 鲜食预制 | 首页「买半成品」或 `/premade` → 切换小象 / 便利店频道 | 展示预制菜推荐并可跳转渠道 |
| 9 | 场景 Bundle | 首页 → **场景购** `/scenarios` → 买菜做饭 / 周末补货 / 居家聚会 | 场景预览、Bundle 生成与下单入口可用 |
| 10 | 账户沉淀 | **我的** → 家庭设置、厨房集卡、各类历史记录 | 饮食模式与人数字段可保存；识别 / 推荐 / 补购历史可查看 |

## 环境变量

### 前端（根目录 `.env.*`）

| 变量 | 说明 | 开发默认值 |
|------|------|------------|
| `VITE_USE_MOCK` | 是否使用 MockJS 拦截 API | `true` |
| `VITE_API_BASE_URL` | 后端 API 基地址 | `http://localhost:8000` |
| `VITE_REQUEST_TIMEOUT` | 请求超时（毫秒） | `10000` |

### 后端（`backend/.env`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（菜谱 AI 问答） | — |
| `VISION_API_KEY` | 阿里云百炼 API Key（拍照识别） | — |
| `VISION_BASE_URL` | 百炼 OpenAI 兼容接口地址 | 见下方地域说明 |
| `VISION_MODEL` | 视觉模型名称 | `qwen3-vl-plus` |
| `USE_CELERY` | `true` / `false` / `auto` | `auto` |
| `CELERY_BROKER_URL` | Redis broker 地址 | `redis://localhost:6379/0` |

## 数据库

默认使用 SQLite，文件位于 `backend/smart_fridge.db`，应用启动时通过 SQLAlchemy `create_all` 自动建表。切换 PostgreSQL/MySQL 时需修改 `backend/src/utils/database.py` 中的 `SQLALCHEMY_DATABASE_URL` 并安装对应驱动。

## 相关文档

- [API 接口契约](frontend/src/docs/api-contract.md) — 数据库 Schema、全部 REST 接口、请求/响应示例
- [前端 API 封装说明](frontend/src/api/README.md)

## 功能模块

前端以 **「先看清家里有什么 → 再决定怎么吃 → 最后走对应履约路径」** 为主线组织页面。底部 Tab 对应主线上的五个常驻入口：首页、冰箱、识别、菜谱、我的。

### ① 认知库存：让家庭食材可见

| 页面 | 路由 | 后端 API | 已实现能力 |
|------|------|----------|------------|
| 拍照识别 | `/camera` | `/api/image-recognition` | 冰箱内景 / 购物袋两种识别模式；上传图片、轮询识别进度、结果确认入库 |
| 食材管理 | `/ingredients` | `/api/ingredient` | 库存增删改查、分类筛选与搜索、同食材合并展示、临期高亮、批量刷新临期状态、手动录入 |
| 登录 | `/login` | `/api/user` | 注册 / 登录，进入受保护的主流程页面 |

库存数据是后续推荐、缺口分析与补购方案的输入源。

### ② 餐食决策：基于库存编排「今天怎么吃」

| 页面 | 路由 | 后端 API | 已实现能力 |
|------|------|----------|------------|
| 首页 | `/` | `/api/recipe`、`/api/ingredient`、`/api/coupon`、`/api/scenario`、`/api/agent/fridge` | 临期 / 推荐 / 饮食偏好 / 本周省钱概览；云冰箱 AI Agent 对话；AI 推荐轮播；**四象限决策入口**（自己做 / 补一点做 / 点外卖 / 买半成品）；场景服务快捷入口 |
| 菜谱推荐 | `/recipes` | `/api/recipe` | 上方意图选择（做饭 / 闪购补料 / 鲜食预制 / 外卖同款）；下方四象限 Tab 切换推荐列表；口味偏好、缺失食材数筛选、重新推荐；菜谱选择记录 |
| 菜谱详情 | `/recipes/:id` | `/api/recipe` | 步骤与按人份缩放食材清单；饮食模式营养分析；菜谱 AI 问答；**标记已做饭**（厨房集卡）；跳转缺口分析 |

四象限与首页「今天怎么吃」一一对应，按库存充足程度分流到不同履约路径：

| 决策路径 | 适用场景 | 前端入口 | 后续履约 |
|----------|----------|----------|----------|
| 自己做 | 食材充足 | `/recipes?tab=cook_self` | 菜谱详情 → 做饭记录 |
| 闪购补料 | 略有缺口 | `/recipes?tab=flash_purchase_cook` | 缺口分析 → 补购方案 |
| 外卖同款 | 不想下厨 | `/recipes?tab=takeout_delivery` | 外卖商户列表 → 店铺 |
| 新鲜预制 | 省时半成品 | `/premade` | 小象鲜食 / 便利店闪电仓 |

### ③ 履约分流：把决策接到美团服务

#### 路径 A — 闪购补购闭环

| 页面 | 路由 | 后端 API | 已实现能力 |
|------|------|----------|------------|
| 缺口分析 | `/purchase/analyze` | `/api/purchase` | 按菜谱与人份计算缺失食材，生成补购上下文 |
| 补购方案 | `/purchase/plans` | `/api/purchase`、`/api/coupon` | 标准 / 省钱双方案对比、券后价、省钱档位说明；支持从菜谱链路或首页直达 |
| 商品选品 | `/purchase/products` | `/api/purchase` | 按方案匹配商品、店内搜索、购物车凑单、可用神券展示 |
| 订单确认 | `/purchase/order` | `/api/purchase` | 地址与配送信息、数量调整、提交补购订单 |

#### 路径 B — 外卖履约

| 页面 | 路由 | 后端 API | 已实现能力 |
|------|------|----------|------------|
| 外卖商户 | `/takeout/merchants` | `/api/recipe`（`takeout/redirect`） | 附近 / 特惠 Tab、活动 Banner、商户搜索与筛选 |
| 外卖店铺 | `/takeout/store` | — | 店铺菜品列表、加购与下单跳转（承接菜谱页外卖同款入口） |

#### 路径 C — 鲜食预制

| 页面 | 路由 | 后端 API | 已实现能力 |
|------|------|----------|------------|
| 新鲜预制 | `/premade` | `/api/recipe` | 基于库存的预制菜推荐；小象鲜食 / 便利店闪电仓频道筛选 |
| 鲜食渠道 | `/premade/channels` | — | 渠道详情与跳转（承接菜谱页鲜食入口） |

#### 路径 D — 场景 Bundle（跨餐次 / 跨需求）

| 页面 | 路由 | 后端 API | 已实现能力 |
|------|------|----------|------------|
| 场景购 | `/scenarios` | `/api/scenario` | **买菜做饭**（临期入菜 + 缺口闪购）、**周末补货**（周常清单 + 定时达）、**居家聚会**（缺口组合购）；场景预览、Bundle 生成与下单 |

### ④ 账户与沉淀：偏好、记录与激励

| 页面 | 路由 | 后端 API | 已实现能力 |
|------|------|----------|------------|
| 个人中心 | `/profile` | `/api/user`、`/api/recipe`、`/api/image-recognition` | 家庭人数、饮食模式（标准 / 减脂 / 爸妈）、爸妈模式与降压饮食设置；识别 / 做饭 / 推荐统计；功能菜单聚合 |
| 厨房集卡 | `/collection` | `/api/recipe` | 月度做饭曲线、徽章收集、最近做饭记录、成就进度 |
| 历史记录 | `/history/:type` | 多模块 | `recognition` 识别历史、`recommendations` 推荐历史、`purchases` 补购方案记录；支持筛选与删除 |

完整接口说明见 [`frontend/src/docs/api-contract.md`](frontend/src/docs/api-contract.md)。

## 项目结构

Monorepo 布局：根目录为 Vite 前端工程，`backend/` 为 FastAPI 后端。目录组织与上文功能主线一致——**pages 按用户旅程分层，api / hooks 按业务域对齐后端 routes**。

```
nocode/
├── frontend/src/
│   ├── App.tsx                 # HashRouter 路由表
│   ├── main.tsx                # 入口（QueryProvider、AuthProvider、Mock 注入）
│   ├── nav-items.tsx           # 底部 Tab 配置（首页 / 冰箱 / 识别 / 菜谱 / 我的）
│   │
│   ├── pages/                  # 页面（按主线分组）
│   │   ├── Index.tsx           # ② 首页：四象限决策、AI Agent、概览
│   │   ├── IngredientsPage.tsx # ① 食材管理
│   │   ├── CameraPage.tsx      # ① 拍照识别
│   │   ├── LoginPage.tsx       # 登录
│   │   ├── RecipesPage.tsx     # ② 菜谱推荐（四象限 Tab）
│   │   ├── RecipeDetailPage.tsx
│   │   ├── PurchaseAnalyzePage.tsx   # ③A 缺口分析
│   │   ├── PurchasePlansPage.tsx     # ③A 补购方案
│   │   ├── ProductSearchPage.tsx     # ③A 商品选品
│   │   ├── OrderConfirmPage.tsx      # ③A 订单确认
│   │   ├── TakeoutMerchantsPage.tsx  # ③B 外卖商户
│   │   ├── TakeoutStorePage.tsx      # ③B 外卖店铺
│   │   ├── PremadeFreshPage.tsx      # ③C 新鲜预制
│   │   ├── PremadeChannelPage.tsx    # ③C 鲜食渠道
│   │   ├── ScenarioBundlesPage.tsx   # ③D 场景 Bundle
│   │   ├── ProfilePage.tsx           # ④ 个人中心
│   │   ├── RecipeCollectionPage.tsx  # ④ 厨房集卡
│   │   └── HistoryPage.tsx           # ④ 历史记录
│   │
│   ├── components/
│   │   ├── Layout.tsx、BottomTabBar.tsx、TopHeader.tsx  # 布局与导航
│   │   ├── FridgeAgentChat.tsx、RecipeAiChat.tsx        # AI 对话
│   │   ├── AiRecommendationCarousel.tsx、RecipeListCard.tsx
│   │   ├── FamilySettingsCard.tsx、DietaryAnalysisPanel.tsx
│   │   ├── takeout/            # 外卖商户、店铺相关组件
│   │   ├── premade/            # 鲜食预制相关组件
│   │   └── ui/                 # Button、MeituanCard、LoadingSpinner 等基础 UI
│   │
│   ├── api/                    # HTTP 封装（与后端 routes 一一对应）
│   │   ├── ingredient.ts、image-recognition.ts
│   │   ├── recipe.ts、purchase.ts、coupon.ts
│   │   ├── scenario.ts、agent.ts、user.ts
│   │   └── README.md
│   │
│   ├── hooks/queries/          # TanStack Query（按业务域拆分）
│   │   ├── useIngredientQueries.ts、useImageRecognitionQueries.ts
│   │   ├── useRecipeQueries.ts、usePurchaseQueries.ts
│   │   ├── useCouponQueries.ts、useScenarioQueries.ts
│   │   ├── useAgentQueries.ts、useUserQueries.ts
│   │   └── useTypedQueries.ts
│   │
│   ├── utils/                  # 前端业务工具（路由上下文、图片映射、人份计算等）
│   │   ├── http.ts、auth.ts
│   │   ├── recipeQuadrant.ts、purchaseContext.ts、takeoutContext.ts
│   │   └── *ImageMap.ts、*Navigate.ts
│   │
│   ├── context/AuthContext.tsx
│   ├── providers/QueryProvider.tsx
│   ├── config/env.ts           # VITE_* 环境变量读取
│   ├── types/api.ts            # 与后端 Pydantic 对齐的 TS 类型
│   ├── mock/                   # MockJS 拦截（开发环境 VITE_USE_MOCK=true）
│   └── docs/api-contract.md    # 接口契约文档
│
├── backend/
│   ├── src/
│   │   ├── main_api.py         # FastAPI 入口、CORS、静态资源挂载
│   │   ├── config/settings.py  # 环境变量与运行配置
│   │   │
│   │   ├── routes/             # REST 路由（8 个业务域）
│   │   │   ├── ingredient.py、image_recognition.py
│   │   │   ├── recipe.py、purchase.py、coupon.py
│   │   │   ├── scenario.py、fridge_agent.py、user.py
│   │   │
│   │   ├── services/           # 核心业务逻辑
│   │   │   ├── recommendation_service.py、purchase_plan_service.py
│   │   │   ├── vision_recognition_service.py、ai_recognition.py
│   │   │   ├── deepseek_service.py、fridge_agent_service.py
│   │   │   ├── takeout_redirect_service.py、bundle_scenario_service.py
│   │   │   ├── meituan_product_service.py、coupon_service.py
│   │   │   └── dietary_analysis_service.py
│   │   │
│   │   ├── crud/               # 数据库访问层
│   │   ├── models/             # SQLAlchemy ORM 模型
│   │   ├── schemas/            # Pydantic 请求/响应模型
│   │   ├── data/               # 种子数据、食材别名、营养信息
│   │   ├── tasks/              # Celery / BackgroundTasks 识别任务
│   │   └── utils/              # database、jwt_auth、response_wrapper、静态图工具
│   │
│   ├── scripts/                # 运维脚本（种子数据、图片生成、API 连通性检查）
│   ├── static/images/          # 运行时静态资源（菜谱 / 食材 / 首页图）
│   ├── requirements.txt
│   ├── .env                    # 后端密钥（DeepSeek、百炼视觉等）
│   └── smart_fridge.db         # SQLite 数据库（运行时生成/更新）
│
├── index.html
├── package.json、yarn.lock
├── vite.config.js、tailwind.config.js、postcss.config.js
├── tsconfig.json、tsconfig.node.json、jsconfig.json
├── components.json             # shadcn/ui 配置
├── .env.development、.env.production
└── README.md
```
