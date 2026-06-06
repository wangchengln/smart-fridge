# 智能云冰箱 API 契约文档

> **代码对应关系**
>
> | 层级 | 路径 |
> |------|------|
> | 后端路由 | `backend/src/routes/` |
> | Pydantic Schema | `backend/src/schemas/` |
> | ORM 模型 | `backend/src/models/` |
> | 前端类型 | `frontend/src/types/api.ts` |
> | 前端 API 封装 | `frontend/src/api/` |
> | HTTP 客户端 | `frontend/src/utils/http.ts` |

---

## 〇、实现说明

### 0.1 统一响应格式

除 `/`、`/health`、`/docs`、`/redoc`、`/openapi.json` 外，所有 `/api/**` 路由的 JSON 响应由 `backend/src/utils/response_wrapper.py` 中的 `UnifiedResponseMiddleware` 自动包装：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

- 路由处理函数返回的是 **业务载荷**（即上表中的 `data` 部分）。
- HTTP 4xx/5xx 由全局异常处理器转为 `{ code, message, data: null }`。
- 前端 axios 拦截器在 `code === 200` 时返回完整 `ApiResponse`，业务层通常读取 `.data` 字段。

### 0.2 图片识别任务调度

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `USE_CELERY` | `true` 强制 Celery；`false` 禁用；`auto` 检测 Redis | `auto` |
| `CELERY_BROKER_URL` | Redis broker | `redis://localhost:6379/0` |

调度逻辑（`backend/src/tasks/recognition_enqueue.py`）：

1. **Celery 可用**：`POST /api/image-recognition/upload` 通过 Celery 异步识别。
2. **不可用**：自动回退为 FastAPI `BackgroundTasks`（无需单独启动 Worker）。
3. **极端情况**：同步执行 `run_image_recognition`。

识别状态流转：`pending` → `processing` → `completed` / `failed`；用户确认入库后为 `confirmed`。

### 0.3 ORM 与数据库

- 全部表模型共享 `backend/src/models/base.py` 中的单一 `Base`，支持 `ForeignKey` 与 `relationship`。
- 默认 SQLite：`backend/smart_fridge.db`（路径相对 `backend/` 根目录）。
- SQLite 连接已启用 `PRAGMA foreign_keys=ON`。
- 应用启动时 `init_db()` 自动 `create_all`。

### 0.4 前端页面与 API 映射

| 页面 | 路由 | 主要 API |
|------|------|----------|
| 登录 | `/login` | `POST /api/user/auth` |
| 首页 | `/` | 聚合展示 |
| 食材管理 | `/ingredients` | `/api/ingredient/*` |
| 拍照识别 | `/camera` | `/api/image-recognition/*` |
| 菜谱推荐 | `/recipes` | `GET /api/recipe/recommend` |
| 菜谱详情 | `/recipes/:id` | `GET /api/recipe/{recipe_id}` |
| 补购分析 | `/purchase/analyze` | `POST /api/purchase/analyze` |
| 补购方案 | `/purchase/plans` | `POST /api/purchase/plan` |
| 商品搜索 | `/purchase/products` | `POST /api/purchase/match` |
| 订单确认 | `/purchase/order` | `POST /api/purchase/order` |
| 个人中心 | `/profile` | `GET/PUT /api/user/{user_id}` |
| 历史记录 | `/history/:type` | 识别/推荐/方案历史接口 |

开发环境可通过 `.env.development` 中 `VITE_USE_MOCK=true` 使用 `frontend/src/mock/` 下的 MockJS 数据，无需启动后端。

### 0.5 已知实现限制

以下接口在部分场景下 **硬编码 `user_id=1`**（JWT 鉴权尚未全面接入），联调时需注意：

- `PUT /api/user/parent-mode`
- `POST /api/ingredient/sync-order`
- `POST /api/ingredient/stock`（创建库存）

`/api/ingredient/recognize` 为同步 Mock 接口；**推荐使用** `/api/image-recognition/*` 异步识别流程。

---

## 一、系统接口

### 1.1 根路径

- **GET** `/`
- **响应**（不包装）：`{ "message": "智能云冰箱API服务运行中" }`

### 1.2 健康检查

- **GET** `/health`
- **响应**（不包装）：`{ "status": "healthy" }`

---

## 二、数据库 Schema

### 2.1 用户表 (`user`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 用户 ID |
| phone | VARCHAR(11) UNIQUE | 手机号（登录凭证） |
| nickname | VARCHAR(50) | 昵称 |
| family_count | INT | 家庭人数，默认 1 |
| family_type | VARCHAR(20) | 家庭类型，默认 `default` |
| taste_preference | TEXT | 口味偏好（JSON 字符串） |
| parent_mode | BOOLEAN | 爸妈模式，默认 false |

### 2.2 食材基础库 (`ingredient_base`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 食材 ID |
| name | VARCHAR(100) | 名称 |
| category | VARCHAR(50) | 分类 |
| shelf_life | INT | 保鲜期（天），默认 7 |
| common_pairings | TEXT | 常见搭配（JSON） |

### 2.3 用户食材库存 (`user_ingredient`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 库存 ID |
| user_id | BIGINT FK → user | 用户 ID |
| ingredient_id | BIGINT FK → ingredient_base | 食材 ID |
| quantity | DECIMAL(10,2) | 数量 |
| freshness | VARCHAR(20) | 新鲜度 |
| storage_method | VARCHAR(20) | 入库方式（`manual` / 识别入库等） |
| near_expiry | BOOLEAN | 临期标记 |
| storage_date | DATETIME | 入库时间 |

### 2.4 菜谱基础表 (`recipe_base`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 菜谱 ID |
| name | VARCHAR(200) | 名称 |
| cooking_time | INT | 烹饪时长（分钟） |
| taste | VARCHAR(50) | 口味 |
| serving_size | INT | 适用人数 |
| steps | TEXT | 步骤（JSON 数组） |

### 2.5 菜谱食材关联 (`recipe_ingredient_rel`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 关联 ID |
| recipe_id | BIGINT FK | 菜谱 ID |
| ingredient_id | BIGINT FK | 食材 ID |
| required_quantity | DECIMAL(10,2) | 所需数量 |
| is_required | BOOLEAN | 是否必需 |

### 2.6 订单同步 (`order_sync_rel`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 记录 ID |
| user_id | BIGINT FK | 用户 ID |
| meituan_order_id | VARCHAR(100) | 美团订单 ID |
| ingredient_details | TEXT | 食材明细（JSON） |
| sync_status | VARCHAR(20) | 同步状态 |

### 2.7 图片识别记录 (`image_recognition`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 识别 ID |
| user_id | BIGINT FK | 用户 ID |
| image_path | VARCHAR(255) | 图片存储路径 |
| recognition_type | VARCHAR(20) | `fridge` / `shopping_bag` |
| recognition_result | TEXT | 识别结果（JSON） |
| status | VARCHAR(20) | `pending` / `processing` / `completed` / `failed` / `confirmed` |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2.8 菜谱推荐记录 (`recipe_recommendation`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 推荐记录 ID |
| user_id | BIGINT FK | 用户 ID |
| recipe_id | BIGINT FK | 菜谱 ID |
| recommendation_type | VARCHAR(20) | `no_purchase` / `small_purchase` / `takeout_alternative` |
| match_score | DECIMAL(5,4) | 匹配度 |
| existing_ingredients_ratio | DECIMAL(5,4) | 现有食材利用率 |
| missing_ingredients_count | INT | 缺失食材数 |
| missing_ingredients_detail | TEXT | 缺失详情（JSON） |
| cooking_time | INT | 烹饪时长 |
| recommendation_reason | VARCHAR(200) | 推荐理由 |
| is_selected | BOOLEAN | 是否被用户选择 |
| created_at | DATETIME | 创建时间 |
| expires_at | DATETIME | 过期时间（当日 23:59:59） |

### 2.9 补购方案类型 (`purchase_plan_type`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 类型 ID |
| name | VARCHAR(50) | 名称（标准版 / 省钱版） |
| description | TEXT | 描述 |
| priority | INT | 优先级 |
| is_active | INT | 是否启用 |

### 2.10 商品匹配 (`product_match`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 匹配 ID |
| ingredient_id | BIGINT FK | 食材 ID |
| product_id | VARCHAR(100) | 美团商品 ID |
| product_name | VARCHAR(200) | 商品名称 |
| price | DECIMAL(10,2) | 价格 |
| original_price | DECIMAL(10,2) | 原价 |
| unit | VARCHAR(20) | 单位 |
| spec | VARCHAR(100) | 规格 |
| image_url | VARCHAR(255) | 图片 URL |
| source | VARCHAR(20) | 来源，默认 `meituan` |
| category | VARCHAR(50) | 分类 |
| rating | DECIMAL(3,2) | 评分 |
| sales_count | INT | 销量 |
| stock_status | VARCHAR(20) | 库存状态 |
| match_score | DECIMAL(5,4) | 匹配度 |
| created_at / updated_at | DATETIME | 时间戳 |

### 2.11 购买方案记录 (`purchase_plan_record`)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 记录 ID |
| user_id | BIGINT FK | 用户 ID |
| recipe_id | BIGINT FK | 菜谱 ID |
| plan_type_id | BIGINT FK | 方案类型 ID |
| plan_name | VARCHAR(100) | 方案名称 |
| total_price | DECIMAL(10,2) | 总价 |
| original_price | DECIMAL(10,2) | 原价 |
| discount_amount | DECIMAL(10,2) | 优惠金额 |
| items_count | INT | 商品数量 |
| plan_details | TEXT | 方案详情（JSON） |
| status | VARCHAR(20) | `pending` / `selected` / `ordered` 等 |
| created_at | DATETIME | 创建时间 |
| expires_at | DATETIME | 过期时间 |

---

## 三、REST API 接口

以下示例均展示 **经中间件包装后** 的完整 HTTP 响应体。请求体字段与 `backend/src/schemas/` 中 Pydantic 模型一致。

### 3.1 用户管理 `/api/user`

#### POST `/api/user/auth` — 登录/注册

**请求体**

```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应 `data`**

```json
{
  "user_id": 1,
  "token": "eyJ...",
  "nickname": "用户8000"
}
```

JWT 有效期 30 分钟，payload 含 `user_id`。前端将 token 存入 `localStorage`，后续请求通过 `Authorization: Bearer <token>` 发送（后端尚未在所有路由强制校验）。

#### PUT `/api/user/parent-mode` — 爸妈模式切换

**请求体**

```json
{ "parent_mode": true }
```

**响应 `data`**

```json
{ "parent_mode": true }
```

#### GET `/api/user/{user_id}` — 获取用户信息

**响应 `data`**

```json
{
  "id": 1,
  "nickname": "用户8000",
  "family_count": 2,
  "family_type": "default",
  "taste_preference": "{\"spicy\": false}",
  "parent_mode": false
}
```

#### PUT `/api/user/{user_id}` — 更新用户信息

**请求体**（字段均可选）

```json
{
  "nickname": "新昵称",
  "family_count": 3,
  "family_type": "couple",
  "taste_preference": "{}",
  "parent_mode": false
}
```

**响应 `data`**：同 GET 用户信息结构。

---

### 3.2 食材管理 `/api/ingredient`

#### POST `/api/ingredient/recognize` — 同步识别（Mock，不推荐）

**请求体**

```json
{
  "image": "<base64>",
  "type": "fridge"
}
```

`type` 枚举：`fridge` | `shopping_bag`

**响应 `data`**

```json
{
  "ingredients": [
    {
      "ingredient_id": 1,
      "name": "西红柿",
      "quantity": 2.0,
      "confidence": 0.95
    }
  ]
}
```

#### POST `/api/ingredient/sync-order` — 美团订单同步

**请求体**

```json
{ "meituan_order_id": "mt_order_xxx" }
```

**响应 `data`**

```json
{
  "sync_status": "completed",
  "ingredients": [{ "name": "牛奶", "quantity": 1 }]
}
```

#### GET `/api/ingredient/user/{user_id}/stocks` — 库存列表

**响应 `data`**

```json
{
  "total_count": 2,
  "stocks": [
    {
      "id": 1,
      "ingredient_id": 1,
      "ingredient_name": "西红柿",
      "name": "西红柿",
      "category": "蔬菜",
      "quantity": 2.0,
      "freshness": "fresh",
      "storage_method": "manual",
      "near_expiry": false,
      "storage_date": "2026-05-30T08:00:00"
    }
  ]
}
```

#### POST `/api/ingredient/stock` — 创建库存

**请求体**

```json
{
  "ingredient_id": 1,
  "quantity": 2.0,
  "freshness": "fresh"
}
```

**响应 `data`**

```json
{ "stock_id": 10 }
```

#### PUT `/api/ingredient/stock?stock_id={id}` — 更新库存

Query 参数：`stock_id`（必填）。请求体同创建。

#### DELETE `/api/ingredient/stock/{stock_id}` — 删除库存

**响应 `data`**

```json
{ "message": "删除成功" }
```

#### POST `/api/ingredient/check-near-expiry` — 检查并标记临期

**请求体**

```json
{
  "user_id": 1,
  "days_before_expiry": 2
}
```

**响应 `data`**

```json
{
  "near_expiry_count": 1,
  "near_expiry_ingredients": [
    {
      "stock_id": 1,
      "ingredient_id": 1,
      "ingredient_name": "西红柿",
      "quantity": 2.0,
      "freshness": "fresh",
      "storage_date": "2026-05-28T08:00:00",
      "shelf_life": 7,
      "expiry_date": "2026-06-04",
      "days_remaining": 1
    }
  ]
}
```

#### GET `/api/ingredient/near-expiry?user_id={id}` — 临期列表

**响应 `data`**

```json
{
  "total_count": 1,
  "near_expiry_ingredients": []
}
```

#### POST `/api/ingredient/batch-update-near-expiry` — 批量更新临期标记

**请求体**

```json
{
  "user_id": 1,
  "stock_ids": [1, 2],
  "near_expiry": true
}
```

**响应 `data`**

```json
{
  "updated_count": 2,
  "success": true,
  "message": "批量更新成功"
}
```

---

### 3.3 图片识别 `/api/image-recognition`

#### POST `/api/image-recognition/upload` — 上传并开始识别

**请求体**

```json
{
  "image": "<base64>",
  "recognition_type": "fridge",
  "user_id": 1
}
```

**响应 `data`**

```json
{
  "recognition_id": 1,
  "image_path": "static/images/xxx.jpg",
  "status": "pending",
  "created_at": "2026-05-30T08:00:00"
}
```

#### GET `/api/image-recognition/status/{recognition_id}` — 查询状态

**响应 `data`**

```json
{
  "recognition_id": 1,
  "status": "processing",
  "progress": 50,
  "ingredients": null,
  "error_message": null,
  "created_at": "2026-05-30T08:00:00",
  "updated_at": "2026-05-30T08:00:05"
}
```

`progress` 参考值：`pending=10`，`processing=50`，`completed/confirmed=100`，`failed=0`。

#### GET `/api/image-recognition/result/{recognition_id}` — 识别结果详情

**响应 `data`**

```json
{
  "recognition_id": 1,
  "status": "completed",
  "ingredients": [
    {
      "ingredient_id": 1,
      "name": "西红柿",
      "quantity": 2.0,
      "confidence": 0.92,
      "category": "蔬菜"
    }
  ],
  "processed_at": "2026-05-30T08:00:10"
}
```

#### POST `/api/image-recognition/update-result` — 手动修正识别结果

**请求体**

```json
{
  "recognition_id": 1,
  "ingredients": [
    {
      "name": "西红柿",
      "quantity": 3.0,
      "confidence": 1.0,
      "category": "蔬菜"
    }
  ]
}
```

#### POST `/api/image-recognition/confirm` — 确认并写入库存

**请求体**

```json
{
  "recognition_id": 1,
  "user_id": 1,
  "confirmed_ingredients": [
    {
      "name": "西红柿",
      "quantity": 3.0,
      "confidence": 1.0,
      "category": "蔬菜"
    }
  ]
}
```

**响应 `data`**

```json
{
  "recognition_id": 1,
  "confirmed_count": 1,
  "stock_ids": [10],
  "success": true,
  "message": "成功创建1个库存记录"
}
```

#### GET `/api/image-recognition/user/{user_id}?limit=10` — 识别历史

**响应 `data`**：数组，每项含 `recognition_id`、`image_path`、`status`、`created_at`。

#### DELETE `/api/image-recognition/{recognition_id}` — 删除识别记录

**响应 `data`**

```json
{ "message": "识别记录删除成功" }
```

---

### 3.4 菜谱推荐 `/api/recipe`

#### 推荐类型说明

| 值 | 含义 |
|----|------|
| `no_purchase` | 现有食材可直接烹饪 |
| `small_purchase` | 需少量补购 |
| `takeout_alternative` | 缺失较多，建议外卖替代 |

#### GET `/api/recipe/recommend` — 智能推荐

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | int | 是 | 用户 ID |
| preference | string | 否 | 口味偏好 |
| max_missing | int | 否 | 最大缺失食材数 |
| refresh | bool | 否 | `true` 时持久化推荐记录并返回 `recommendation_id` |

**响应 `data`**

```json
{
  "no_purchase_recipes": [],
  "small_purchase_recipes": [],
  "takeout_alternative_recipes": [],
  "total_count": 15,
  "generated_at": "2026-05-30T08:00:00"
}
```

每项推荐对象字段：

```json
{
  "recommendation_id": 1,
  "recipe_id": 10,
  "name": "西红柿炒蛋",
  "cooking_time": 15,
  "recommendation_type": "no_purchase",
  "match_score": 0.95,
  "existing_ingredients_ratio": 1.0,
  "missing_ingredients_count": 0,
  "missing_ingredients_detail": [],
  "recommendation_reason": "食材齐全，可直接烹饪",
  "purchase_analysis": null
}
```

每类最多返回 10 条。

#### POST `/api/recipe/advanced-recommend` — 高级推荐

**请求体**

```json
{
  "user_id": 1,
  "preference": "spicy",
  "max_cooking_time": 30,
  "recommendation_types": ["no_purchase", "small_purchase"],
  "min_match_score": 0.5,
  "limit": 20
}
```

**响应 `data`**：结构同 GET recommend；高级推荐会附带 `purchase_analysis`（含 `missing_ingredients`、`estimated_cost`、`purchase_urgency`）。

#### POST `/api/recipe/select` — 选择/取消菜谱

**请求体**

```json
{
  "recommendation_id": 1,
  "is_selected": true
}
```

#### GET `/api/recipe/{recipe_id}` — 菜谱详情

**响应 `data`**

```json
{
  "recipe_id": 10,
  "name": "西红柿炒蛋",
  "cooking_time": 15,
  "steps": [
    { "step": 1, "description": "准备食材" },
    { "step": 2, "description": "开始烹饪" }
  ],
  "ingredients": [
    {
      "ingredient_id": 1,
      "name": "西红柿",
      "required_quantity": 2.0,
      "is_required": true
    }
  ]
}
```

#### GET `/api/recipe/user/{user_id}/recommendations` — 推荐历史

**Query**：`recommendation_type`（可选）、`limit`（默认 20，最大 100）

#### GET `/api/recipe/recommendation-stats/{user_id}` — 推荐统计

**响应 `data`**

```json
{
  "total_recommendations": 20,
  "type_breakdown": {
    "no_purchase": 8,
    "small_purchase": 7,
    "takeout_alternative": 5
  },
  "selected_count": 3
}
```

---

### 3.5 补购交易 `/api/purchase`

#### POST `/api/purchase/analyze` — 缺失食材分析

**请求体**

```json
{
  "recipe_id": 10,
  "user_id": 1
}
```

**响应 `data`**

```json
{
  "missing_ingredients": [
    {
      "ingredient_id": 2,
      "name": "鸡蛋",
      "required_quantity": 3.0,
      "current_quantity": 0.0
    }
  ]
}
```

#### POST `/api/purchase/plan` — 生成补购方案

**请求体**

```json
{
  "missing_ingredients": [
    {
      "ingredient_id": 2,
      "name": "鸡蛋",
      "required_quantity": 3.0,
      "current_quantity": 0.0
    }
  ],
  "plan_type": "standard"
}
```

**响应 `data`**

```json
{
  "standard_plan": {
    "plan_type": "standard",
    "plan_name": "标准版方案",
    "total_price": 18.8,
    "original_price": 22.0,
    "discount_amount": 3.2,
    "items": [
      {
        "ingredient_id": 2,
        "name": "鸡蛋",
        "quantity": 3.0,
        "price": 18.8,
        "product_id": "mt_001",
        "product_name": "土鸡蛋 12枚装",
        "unit": "盒"
      }
    ],
    "cost_effectiveness": 0.75
  },
  "economy_plan": {},
  "comparison": {
    "price_difference": 5.0,
    "savings_percentage": 21.3,
    "item_count_difference": 0,
    "recommendation": "economy"
  }
}
```

#### POST `/api/purchase/match` — 商品匹配

**请求体**

```json
{
  "ingredient_id": 2,
  "quantity": 3.0,
  "sort_by": "match_score"
}
```

`sort_by` 可选：`price` / `rating` / `sales` / `match_score`

#### GET `/api/purchase/products/search` — 搜索已匹配商品

**Query**：`ingredient_id`（必填）、`sort_by`、`limit`（默认 10，最大 50）

#### POST `/api/purchase/plan/select` — 选择补购方案

**请求体**

```json
{
  "user_id": 1,
  "recipe_id": 10,
  "plan_type": "standard",
  "plan_details": {
    "total_price": 18.8,
    "items": []
  }
}
```

#### GET `/api/purchase/user/{user_id}/plans?limit=20` — 方案历史

#### POST `/api/purchase/order` — 下单跳转

**请求体**

```json
{
  "user_id": 1,
  "plan_type": "standard",
  "products": [
    {
      "product_id": "mt_001",
      "name": "土鸡蛋 12枚装",
      "price": 18.8,
      "unit": "盒",
      "source": "meituan",
      "match_score": 0.95
    }
  ]
}
```

**响应 `data`**

```json
{
  "redirect_url": "https://bj.meituan.com/cart?order_id=mt_order_xxx&total=18.8",
  "order_id": "mt_order_xxx",
  "total_amount": 18.8,
  "plan_details": {
    "plan_type": "standard",
    "items_count": 1
  }
}
```

#### GET `/api/purchase/meituan/mock-page` — 美团购物页 Mock 数据

用于前端订单确认页演示，返回页面标题、商品清单、配送与支付方式等模拟数据。

---

## 四、错误码与 HTTP 状态

| HTTP 状态 | code | 典型场景 |
|-----------|------|----------|
| 200 | 200 | 成功 |
| 400 | 400 | 参数业务校验失败 |
| 404 | 404 | 用户/菜谱/库存/识别记录不存在 |
| 422 | 422 | Pydantic 请求体验证失败 |
| 500 | 500 | 服务器内部错误 |

错误响应示例：

```json
{
  "code": 404,
  "message": "菜谱不存在",
  "data": null
}
```

---

## 五、维护约定

1. 修改 `backend/src/schemas/*.py` 后，同步更新 `frontend/src/types/api.ts`。
2. 新增路由时，在本文档对应章节补充接口说明，并在 `frontend/src/api/` 增加封装。
3. Mock 数据定义在 `frontend/src/mock/`，路径与真实 API 保持一致。
4. 交互式 API 文档以运行中后端的 Swagger 为准：`http://localhost:8000/docs`。
