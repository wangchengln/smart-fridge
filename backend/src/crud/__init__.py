"""
CRUD 操作统一导出文件
包含所有数据库操作函数
"""

# 用户相关CRUD
from .user import (
    get_user_by_phone,
    create_user,
    update_parent_mode,
    get_user_by_id
)

# 食材基础库相关CRUD
from .ingredient_base import (
    get_ingredient_by_id,
    get_ingredient_by_name,
    create_ingredient_base,
    get_all_ingredients,
    update_ingredient_base
)

# 用户食材库存相关CRUD
from .user_ingredient import (
    get_user_ingredients,
    get_user_ingredient,
    create_user_ingredient,
    update_user_ingredient,
    delete_user_ingredient,
    update_near_expiry_status,
    check_near_expiry_ingredients,
    get_near_expiry_ingredients,
    batch_update_near_expiry_status
)

# 图片识别相关CRUD
from .image_recognition import (
    save_image_from_base64,
    create_image_recognition_record,
    get_image_recognition_by_id,
    get_user_image_recognitions,
    update_recognition_result,
    confirm_recognition_results,
    update_recognition_status,
    delete_image_recognition
)

# 菜谱基础相关CRUD
from .recipe_base import (
    get_recipe_by_id,
    get_all_recipes,
    create_recipe_base,
    update_recipe_base,
    get_recipes_by_preference
)

# 菜谱食材关联相关CRUD
from .recipe_ingredient_rel import (
    get_recipe_ingredients,
    get_ingredient_recipes,
    create_recipe_ingredient_rel,
    update_recipe_ingredient_rel,
    delete_recipe_ingredient_rel
)

# 订单同步关联相关CRUD
from .order_sync_rel import (
    get_order_sync_by_id,
    get_order_sync_by_meituan_id,
    create_order_sync_rel,
    update_order_sync_status,
    get_user_order_syncs
)

# 推荐记录相关CRUD
from .recipe_recommendation import (
    create_recipe_recommendation,
    batch_create_recommendations,
    get_user_recommendations,
    get_recommendations_by_type,
    update_recommendation_selection,
    delete_expired_recommendations,
    get_recommendation_stats
)

# 补购方案类型相关CRUD
from .purchase_plan_type import (
    get_plan_type_by_id,
    get_plan_type_by_name,
    get_all_plan_types,
    create_plan_type,
    update_plan_type,
    delete_plan_type
)

# 商品匹配相关CRUD
from .product_match import (
    get_product_by_id,
    get_products_by_ingredient,
    create_product_match,
    batch_create_product_matches,
    update_product_match,
    delete_product_match,
    search_products,
    get_products_by_ids
)

# 购买方案记录相关CRUD
from .purchase_plan_record import (
    get_plan_record_by_id,
    get_user_plan_records,
    get_plan_records_by_recipe,
    create_plan_record,
    update_plan_record,
    update_plan_status,
    delete_plan_record,
    get_expired_plans,
    cleanup_expired_plans
)

# 重新导出所有CRUD函数
__all__ = [
    # 用户相关
    'get_user_by_phone',
    'create_user',
    'update_parent_mode',
    'get_user_by_id',
    
    # 食材基础库相关
    'get_ingredient_by_id',
    'get_ingredient_by_name',
    'create_ingredient_base',
    'get_all_ingredients',
    'update_ingredient_base',
    
    # 用户食材库存相关
    'get_user_ingredients',
    'get_user_ingredient',
    'create_user_ingredient',
    'update_user_ingredient',
    'delete_user_ingredient',
    'update_near_expiry_status',
    'check_near_expiry_ingredients',
    'get_near_expiry_ingredients',
    'batch_update_near_expiry_status',
    
    # 图片识别相关
    'save_image_from_base64',
    'create_image_recognition_record',
    'get_image_recognition_by_id',
    'get_user_image_recognitions',
    'update_recognition_result',
    'confirm_recognition_results',
    'update_recognition_status',
    'delete_image_recognition',
    
    # 菜谱基础相关
    'get_recipe_by_id',
    'get_all_recipes',
    'create_recipe_base',
    'update_recipe_base',
    'get_recipes_by_preference',
    
    # 菜谱食材关联相关
    'get_recipe_ingredients',
    'get_ingredient_recipes',
    'create_recipe_ingredient_rel',
    'update_recipe_ingredient_rel',
    'delete_recipe_ingredient_rel',
    
    # 订单同步关联相关
    'get_order_sync_by_id',
    'get_order_sync_by_meituan_id',
    'create_order_sync_rel',
    'update_order_sync_status',
    'get_user_order_syncs',
    
    # 推荐记录相关
    'create_recipe_recommendation',
    'batch_create_recommendations',
    'get_user_recommendations',
    'get_recommendations_by_type',
    'update_recommendation_selection',
    'delete_expired_recommendations',
    'get_recommendation_stats',
    
    # 补购方案类型相关
    'get_plan_type_by_id',
    'get_plan_type_by_name',
    'get_all_plan_types',
    'create_plan_type',
    'update_plan_type',
    'delete_plan_type',
    
    # 商品匹配相关
    'get_product_by_id',
    'get_products_by_ingredient',
    'create_product_match',
    'batch_create_product_matches',
    'update_product_match',
    'delete_product_match',
    'search_products',
    'get_products_by_ids',
    
    # 购买方案记录相关
    'get_plan_record_by_id',
    'get_user_plan_records',
    'get_plan_records_by_recipe',
    'create_plan_record',
    'update_plan_record',
    'update_plan_status',
    'delete_plan_record',
    'get_expired_plans',
    'cleanup_expired_plans'
]
