# API接口使用说明

## 环境配置

### 开发环境 (Mock模式)
在 `.env.development` 中配置：
```bash
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:8000
```

### 生产环境 (真实接口模式)
在 `.env.production` 中配置：
```bash
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://api.smartfridge.com
```

## 使用示例

### 用户认证
```javascript
import { userAuth, updateParentMode } from '@/api';

// 用户登录
const login = async (phone, code) => {
  try {
    const response = await userAuth({ phone, code });
    console.log('登录成功:', response);
    return response;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};

// 更新爸妈模式
const toggleParentMode = async (parentMode) => {
  try {
    const response = await updateParentMode({ parent_mode: parentMode });
    console.log('更新成功:', response);
    return response;
  } catch (error) {
    console.error('更新失败:', error);
    throw error;
  }
};
```

### 食材管理
```javascript
import { recognizeIngredients, createStock, getNearExpiryIngredients } from '@/api';

// 食材识别
const recognize = async (image, type) => {
  try {
    const response = await recognizeIngredients({ image, type });
    console.log('识别结果:', response.ingredients);
    return response;
  } catch (error) {
    console.error('识别失败:', error);
    throw error;
  }
};

// 创建库存
const addToStock = async (ingredientId, quantity, freshness) => {
  try {
    const response = await createStock({ ingredient_id, quantity, freshness });
    console.log('创建成功:', response.stock_id);
    return response;
  } catch (error) {
    console.error('创建失败:', error);
    throw error;
  }
};

// 获取临期食材
const getNearExpiry = async (userId) => {
  try {
    const response = await getNearExpiryIngredients(userId);
    console.log('临期食材:', response.near_expiry_ingredients);
    return response;
  } catch (error) {
    console.error('获取失败:', error);
    throw error;
  }
};
```

### 图片识别
```javascript
import { uploadAndRecognizeImage, getRecognitionStatus, confirmRecognition } from '@/api';

// 上传图片并识别
const uploadImage = async (image, recognitionType, userId) => {
  try {
    const response = await uploadAndRecognizeImage({ image, recognition_type, user_id });
    console.log('上传成功:', response.recognition_id);
    return response;
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
};

// 查询识别状态
const checkStatus = async (recognitionId) => {
  try {
    const response = await getRecognitionStatus(recognitionId);
    console.log('识别状态:', response.status, response.progress);
    return response;
  } catch (error) {
    console.error('查询失败:', error);
    throw error;
  }
};

// 确认识别结果
const confirmResult = async (recognitionId, userId, ingredients) => {
  try {
    const response = await confirmRecognition({ recognition_id, user_id, confirmed_ingredients });
    console.log('确认成功:', response.stock_ids);
    return response;
  } catch (error) {
    console.error('确认失败:', error);
    throw error;
  }
};
```

### 菜谱推荐
```javascript
import { getRecipeRecommendations, getRecipeDetail, selectRecipe } from '@/api';

// 获取菜谱推荐
const getRecommendations = async (userId, params = {}) => {
  try {
    const response = await getRecipeRecommendations({ user_id: userId, ...params });
    console.log('推荐结果:', {
      noPurchase: response.no_purchase_recipes.length,
      smallPurchase: response.small_purchase_recipes.length,
      takeout: response.takeout_alternative_recipes.length
    });
    return response;
  } catch (error) {
    console.error('获取失败:', error);
    throw error;
  }
};

// 获取菜谱详情
const getRecipe = async (recipeId) => {
  try {
    const response = await getRecipeDetail(recipeId);
    console.log('菜谱详情:', response.name, response.cooking_time);
    return response;
  } catch (error) {
    console.error('获取失败:', error);
    throw error;
  }
};

// 选择菜谱
const selectRecommendation = async (recommendationId, isSelected) => {
  try {
    const response = await selectRecipe({ recommendation_id, is_selected });
    console.log('选择结果:', response.success);
    return response;
  } catch (error) {
    console.error('选择失败:', error);
    throw error;
  }
};
```

### 补购交易
```javascript
import { analyzeMissingIngredients, generatePurchasePlans, createOrder } from '@/api';

// 分析缺失食材
const analyzeMissing = async (recipeId, userId) => {
  try {
    const response = await analyzeMissingIngredients({ recipe_id, user_id });
    console.log('缺失食材:', response.missing_ingredients);
    return response;
  } catch (error) {
    console.error('分析失败:', error);
    throw error;
  }
};

// 生成补购方案
const generatePlans = async (missingIngredients) => {
  try {
    const response = await generatePurchasePlans({ missing_ingredients });
    console.log('生成方案:', {
      standard: response.standard_plan?.total_price,
      economy: response.economy_plan?.total_price
    });
    return response;
  } catch (error) {
    console.error('生成失败:', error);
    throw error;
  }
};

// 创建订单
const orderProducts = async (products, userId, planType) => {
  try {
    const response = await createOrder({ products, user_id, plan_type });
    console.log('订单创建成功:', response.order_id, response.redirect_url);
    return response;
  } catch (error) {
    console.error('创建失败:', error);
    throw error;
  }
};
```

## 错误处理

所有API接口都使用统一的错误处理机制：

```javascript
try {
  const response = await someApiFunction(params);
  // 处理成功响应
} catch (error) {
  if (error.code) {
    // 业务错误
    console.error('业务错误:', error.code, error.message);
  } else {
    // 网络错误
    console.error('网络错误:', error.message);
  }
}
```

## TypeScript支持

所有API接口都基于TypeScript类型定义，提供完整的类型检查和智能提示：

```typescript
import { userAuth, UserResponse } from '@/api';

const handleLogin = async (): Promise<UserResponse> => {
  const response = await userAuth({ phone: '13800138000', code: '1234' });
  return response; // 类型: UserResponse
};
```
