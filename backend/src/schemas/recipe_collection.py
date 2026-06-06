from pydantic import BaseModel, Field
from typing import List, Optional


class RecipeCookCreate(BaseModel):
    """记录完成做菜"""

    user_id: int = Field(..., gt=0, description="用户ID")
    servings: Optional[int] = Field(2, ge=1, le=12, description="用餐人数")


class RecipeBadgeItem(BaseModel):
    """菜谱徽章卡片"""

    recipe_id: int
    recipe_name: str
    image_url: str = ""
    taste: str = ""
    badge_emoji: str
    badge_tier: str
    cook_count: int
    first_cooked_at: str
    last_cooked_at: str


class DailyRecipeThumb(BaseModel):
    """日历格内展示的菜谱缩略"""

    recipe_id: int
    recipe_name: str
    image_url: str = ""


class MonthlyDayStat(BaseModel):
    """月度按日统计"""

    date: str
    count: int
    recipes: List[DailyRecipeThumb] = Field(default_factory=list)


class MonthlyCookStats(BaseModel):
    """当月做菜统计"""

    year: int
    month: int
    total_cooks: int
    unique_recipes: int
    daily_breakdown: List[MonthlyDayStat]


class RecipeCollectionResponse(BaseModel):
    """厨艺集卡总览"""

    total_badges: int
    total_cooks: int
    badges: List[RecipeBadgeItem]
    monthly_stats: MonthlyCookStats


class RecipeCookRecordResponse(BaseModel):
    """完成做菜响应"""

    cook_id: int
    recipe_id: int
    recipe_name: str
    is_new_badge: bool
    cook_count: int
    badge: Optional[RecipeBadgeItem] = None
    message: str
