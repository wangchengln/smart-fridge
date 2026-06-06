"""
Pydantic Schema 统一导出文件
包含所有数据校验模型定义
"""

# 用户相关Schema
from .user import (
    UserCreate,
    UserResponse,
    ParentModeUpdate,
    ParentModeResponse
)

# 食材相关Schema
from .ingredient import (
    IngredientRecognitionCreate,
    RecognizedIngredient,
    IngredientRecognitionResponse,
    OrderSyncCreate,
    OrderSyncResponse,
    StockUpdateCreate,
    StockUpdateResponse,
    NearExpiryIngredient,
    NearExpiryResponse,
    BatchUpdateNearExpiryRequest,
    BatchUpdateNearExpiryResponse
)

# 图片识别相关Schema
from .image_recognition import (
    RecognizedIngredientItem,
    ImageUploadCreate,
    ImageRecognitionResult,
    ImageRecognitionResponse,
    UpdateRecognitionResultRequest,
    UpdateRecognitionResultResponse,
    ConfirmRecognitionRequest,
    ConfirmRecognitionResponse,
    RecognitionStatusResponse
)

# 菜谱相关Schema
from .recipe import (
    RecipeRecommendCreate,
    MissingIngredient,
    RecipeRecommendItem,
    RecipeRecommendResponse,
    RecipeDetailResponse
)

# 补购相关Schema
from .purchase import (
    MissingIngredientAnalyze,
    PurchaseAnalyzeCreate,
    PurchaseAnalyzeResponse,
    PurchasePlanCreate,
    PurchasePlanItem,
    PurchasePlan,
    PurchasePlanResponse,
    ProductMatchCreate,
    ProductItem,
    ProductMatchResponse,
    OrderCreate,
    OrderResponse
)

# 推荐算法相关Schema
from .recommendation import (
    MatchScoreResult,
    RecommendationItem,
    RecommendationResponse,
    RecipeSelectionRequest,
    RecipeSelectionResponse,
    RecommendationStats,
    AdvancedRecommendationRequest
)

# 重新导出所有Schema
__all__ = [
    # 用户相关
    'UserCreate',
    'UserResponse', 
    'ParentModeUpdate',
    'ParentModeResponse',
    
    # 食材相关
    'IngredientRecognitionCreate',
    'RecognizedIngredient',
    'IngredientRecognitionResponse',
    'OrderSyncCreate',
    'OrderSyncResponse',
    'StockUpdateCreate',
    'StockUpdateResponse',
    'NearExpiryIngredient',
    'NearExpiryResponse',
    'BatchUpdateNearExpiryRequest',
    'BatchUpdateNearExpiryResponse',
    
    # 图片识别相关
    'RecognizedIngredientItem',
    'ImageUploadCreate',
    'ImageRecognitionResult',
    'ImageRecognitionResponse',
    'UpdateRecognitionResultRequest',
    'UpdateRecognitionResultResponse',
    'ConfirmRecognitionRequest',
    'ConfirmRecognitionResponse',
    'RecognitionStatusResponse',
    
    # 菜谱相关
    'RecipeRecommendCreate',
    'MissingIngredient',
    'RecipeRecommendItem',
    'RecipeRecommendResponse',
    'RecipeDetailResponse',
    
    # 补购相关
    'MissingIngredientAnalyze',
    'PurchaseAnalyzeCreate',
    'PurchaseAnalyzeResponse',
    'PurchasePlanCreate',
    'PurchasePlanItem',
    'PurchasePlan',
    'PurchasePlanResponse',
    'ProductMatchCreate',
    'ProductItem',
    'ProductMatchResponse',
    'OrderCreate',
    'OrderResponse',
    
    # 推荐算法相关
    'MatchScoreResult',
    'RecommendationItem',
    'RecommendationResponse',
    'RecipeSelectionRequest',
    'RecipeSelectionResponse',
    'RecommendationStats',
    'AdvancedRecommendationRequest'
]
