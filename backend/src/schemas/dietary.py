from pydantic import BaseModel, Field
from typing import List, Optional


class IngredientNutritionItem(BaseModel):
    name: str
    quantity: float
    grams_estimated: float
    calories: float
    sodium_mg: float
    sugar_g: float
    is_high_potassium: bool
    tags: List[str] = []
    warnings: List[str] = []


class MedicationConflict(BaseModel):
    type: str
    severity: str
    message: str
    conflict_ingredients: List[str] = []
    meituan_pharmacy_url: Optional[str] = None
    meituan_pharmacy_label: Optional[str] = None


class RecipeDietaryAnalysisResponse(BaseModel):
    dietary_mode: str
    mode_label: str
    servings: int
    total_calories: float
    calories_per_serving: float
    total_sodium_mg: float
    total_sugar_g: float
    ingredients: List[IngredientNutritionItem]
    warnings: List[str] = []
    fat_loss_rating: Optional[str] = None
    fat_loss_tip: Optional[str] = None
    sodium_level: Optional[str] = None
    sugar_level: Optional[str] = None
    parents_tip: Optional[str] = None
    medication_conflicts: List[MedicationConflict] = []
    high_potassium_ingredients: List[str] = []


class DietaryModeUpdate(BaseModel):
    dietary_mode: str = Field(..., description="饮食模式: normal | fat_loss | parents")


class FamilySettingsUpdate(BaseModel):
    family_count: Optional[int] = Field(None, ge=1, le=12)
    dietary_mode: Optional[str] = Field(None, description="饮食模式")
    on_antihypertensive: Optional[bool] = Field(None, description="是否服用降压药")
