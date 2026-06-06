# 智能云冰箱

基于「库存管理 → 拍照识别 → 菜谱推荐 → 美团补购」闭环的智能冰箱应用。前端为 React + Vite 移动端 UI，后端为 FastAPI + SQLAlchemy。

## 功能模块

| 模块 | 前端路由 | 后端路由前缀 | 说明 |
|------|----------|--------------|------|
| 首页 | `/` | — | 概览与快捷入口 |
| 食材管理 | `/ingredients` | `/api/ingredient` | 库存增删改查、临期提醒、美团订单同步 |
| 拍照识别 | `/camera` | `/api/image-recognition` | 上传图片、异步识别、确认入库 |
| 菜谱推荐 | `/recipes`、`/recipes/:id` | `/api/recipe` | 三类智能推荐、菜谱详情、选择记录 |
| 补购交易 | `/purchase/*` | `/api/purchase` | 缺失分析、标准/省钱方案、商品匹配、下单跳转 |
| 个人中心 | `/profile` | `/api/user` | 登录注册、用户信息、爸妈模式 |
| 历史记录 | `/history/:type` | 多模块 | 识别/推荐/方案历史 |

完整接口说明见 [`frontend/src/docs/api-contract.md`](frontend/src/docs/api-contract.md)。

## 项目结构

```
nocode/
├── frontend/src/          # React 前端源码
│   ├── pages/             # 页面组件
│   ├── components/        # 通用 UI
│   ├── api/               # HTTP 接口封装
│   ├── types/api.ts       # 与后端 Pydantic 对齐的类型
│   ├── mock/              # MockJS 模拟数据（开发用）
│   └── docs/api-contract.md
├── backend/
│   ├── src/               # FastAPI Python 包
│   │   ├── main_api.py    # 应用入口
│   │   ├── routes/        # 路由
│   │   ├── crud/          # 数据访问
│   │   ├── models/        # SQLAlchemy 模型
│   │   ├── schemas/       # Pydantic 请求/响应模型
│   │   ├── services/      # 业务逻辑（推荐、补购、AI 识别、美团商品）
│   │   ├── tasks/         # Celery / BackgroundTasks 识别任务
│   │   └── utils/         # 数据库、JWT、统一响应中间件
│   ├── requirements.txt
│   └── smart_fridge.db    # SQLite 数据库（运行时生成/更新）
├── index.html
├── package.json
├── vite.config.js
├── .env.development
└── .env.production
```

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

访问 `http://localhost:8080`。

开发环境默认开启 Mock（`.env.development` 中 `VITE_USE_MOCK=true`），无需后端即可调试 UI。联调真实 API 时改为 `VITE_USE_MOCK=false` 并确保后端已启动。

### 3. 安装并启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn src.main_api:app --reload --host 0.0.0.0 --port 8000
```

- API 根地址：`http://localhost:8000`
- Swagger 文档：`http://localhost:8000/docs`
- 健康检查：`GET /health`

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

拍照识别通过**阿里云百炼**（Model Studio）的通义千问 VL 视觉模型，调用 OpenAI 兼容的 Chat Completions 接口。需在 [百炼控制台](https://bailian.console.aliyun.com/) 创建 API Key 并写入 `backend/.env`。

`VISION_BASE_URL` 须与 API Key 所属地域一致（官方文档：[获取 API Key](https://help.aliyun.com/zh/model-studio/get-api-key)）：

| 地域 | Base URL |
|------|----------|
| 华北2（北京） | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 新加坡 | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| 美国（弗吉尼亚） | `https://dashscope-us.aliyuncs.com/compatible-mode/v1` |

完整请求地址为 `{VISION_BASE_URL}/chat/completions`。

`USE_CELERY=auto` 时：检测到 Redis 则走 Celery Worker；否则自动回退 FastAPI `BackgroundTasks`，无需单独启动 Worker。

## 常用命令

```bash
# 前端
npm run dev          # 开发服务器
npm run build        # 生产构建（输出到 build/）
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint

# 后端（在 backend/ 目录）
uvicorn src.main_api:app --reload --port 8000

# Celery Worker（可选，USE_CELERY=true 且 Redis 可用时）
celery -A src.tasks.recognition_tasks worker --loglevel=info
```

## API 响应约定

除 `/`、`/health`、`/docs`、`/redoc`、`/openapi` 外，所有 `/api/**` 接口返回统一格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

前端 `frontend/src/utils/http.ts` 会自动解包 `data` 并在 `code !== 200` 时抛出错误。

## 数据库

默认使用 SQLite，文件位于 `backend/smart_fridge.db`，应用启动时通过 SQLAlchemy `create_all` 自动建表。切换 PostgreSQL/MySQL 时需修改 `backend/src/utils/database.py` 中的 `SQLALCHEMY_DATABASE_URL` 并安装对应驱动。

## 相关文档

- [API 接口契约](frontend/src/docs/api-contract.md) — 数据库 Schema、全部 REST 接口、请求/响应示例
- [前端 API 封装说明](frontend/src/api/README.md)
