/**
 * 前端 API 类型契约 — 与 backend/src/schemas/*.py (Pydantic) 保持同步。
 * 修改后端 schema 时请同步更新此文件。
 */

// 通用响应格式
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 用户相关类型 (schemas/user.py)
export type DietaryMode = 'normal' | 'fat_loss' | 'parents';

export const DIETARY_MODE_LABELS: Record<DietaryMode, string> = {
  normal: '正常模式',
  fat_loss: '减脂模式',
  parents: '爸妈模式',
};

export interface UserInfoResponse {
  id: number;
  nickname: string;
  family_count: number;
  family_type: string;
  taste_preference?: string;
  parent_mode: boolean;
  dietary_mode: DietaryMode;
  on_antihypertensive: boolean;
}

/** @deprecated 使用 UserInfoResponse */
export type User = UserInfoResponse;

export interface UserUpdate {
  nickname?: string;
  family_count?: number;
  family_type?: string;
  taste_preference?: string;
  parent_mode?: boolean;
  dietary_mode?: DietaryMode;
  on_antihypertensive?: boolean;
}

export interface UserCreateRequest {
  phone: string;
  code: string;
}

export interface UserResponse {
  user_id: number;
  token: string;
  nickname: string;
}

export interface ParentModeUpdateRequest {
  parent_mode: boolean;
}

export interface ParentModeResponse {
  parent_mode: boolean;
}

// 食材相关类型
export interface IngredientBase {
  id: number;
  name: string;
  category: string;
  shelf_life: number;
  common_pairings?: string;
}

export interface IngredientBaseListResponse {
  ingredients: IngredientBase[];
  total_count: number;
}

export interface UserIngredient {
  id: number;
  user_id: number;
  ingredient_id: number;
  quantity: number;
  freshness: string;
  storage_method: string;
  near_expiry: boolean;
  storage_date: string;
}

export interface RecognizedIngredient {
  ingredient_id: number;
  name: string;
  quantity: number;
  confidence: number;
}

export interface IngredientRecognitionRequest {
  image: string;
  type: 'fridge' | 'shopping_bag';
}

export interface IngredientRecognitionResponse {
  ingredients: RecognizedIngredient[];
}

export interface OrderSyncRequest {
  meituan_order_id: string;
}

export interface OrderSyncResponse {
  sync_status: string;
  ingredients: Record<string, unknown>[];
}

export interface StockUpdateRequest {
  user_id?: number;
  ingredient_id?: number;
  ingredient_name?: string;
  category?: string;
  quantity: number;
  freshness: string;
}

export interface StockUpdateResponse {
  stock_id: number;
}

export interface NearExpiryIngredient {
  stock_id: number;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  freshness: string;
  storage_date: string;
  shelf_life: number;
  expiry_date: string;
  days_remaining: number;
}

export interface NearExpiryResponse {
  total_count: number;
  near_expiry_ingredients: NearExpiryIngredient[];
}

export interface CheckNearExpiryRequest {
  user_id: number;
  days_before_expiry?: number;
}

export interface BatchUpdateNearExpiryRequest {
  user_id: number;
  stock_ids: number[];
  near_expiry: boolean;
}

export interface BatchUpdateNearExpiryResponse {
  updated_count: number;
  success: boolean;
  message: string;
}

// 图片识别相关类型
export interface RecognizedIngredientItem {
  ingredient_id?: number;
  name: string;
  quantity: number;
  confidence: number;
  category?: string;
}

export interface ImageUploadRequest {
  image: string;
  recognition_type: 'fridge' | 'shopping_bag';
  user_id: number;
}

export interface ImageRecognitionResponse {
  recognition_id: number;
  image_path: string;
  status: string;
  created_at: string;
}

export interface RecognitionStatusResponse {
  recognition_id: number;
  status: string;
  progress?: number;
  ingredients?: RecognizedIngredientItem[];
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateRecognitionResultRequest {
  recognition_id: number;
  ingredients: RecognizedIngredientItem[];
}

export interface UpdateRecognitionResultResponse {
  recognition_id: number;
  updated_count: number;
  success: boolean;
  message: string;
}

export interface ConfirmRecognitionRequest {
  recognition_id: number;
  user_id: number;
  confirmed_ingredients: RecognizedIngredientItem[];
}

export interface ConfirmRecognitionResponse {
  recognition_id: number;
  confirmed_count: number;
  stock_ids: number[];
  success: boolean;
  message: string;
}

// 菜谱相关类型
export interface RecipeBase {
  id: number;
  name: string;
  cooking_time: number;
  taste: string;
  serving_size: number;
  steps: string;
}

export interface RecipeIngredientRel {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  required_quantity: number;
  is_required: boolean;
}

export interface MissingIngredient {
  ingredient_id: number;
  name: string;
  required_quantity: number;
  current_quantity: number;
}

export interface RecipeRecommendParams {
  user_id: number;
  preference?: string;
  max_missing?: number;
  refresh?: boolean;
  has_time?: boolean;
  prefer_convenience?: boolean;
  prefer_premade?: boolean;
  prefer_takeout?: boolean;
  dietary_mode?: DietaryMode;
}

/** @deprecated 使用 RecipeRecommendParams */
export type RecipeRecommendRequest = RecipeRecommendParams;

export interface RecipeRecommendItem {
  recipe_id: number;
  name: string;
  cooking_time: number;
  missing_ingredients: MissingIngredient[];
}

export interface RecipeRecommendResponse {
  recipes: RecipeRecommendItem[];
}

export interface RecipeDetailResponse {
  recipe_id: number;
  name: string;
  cooking_time: number;
  image_url?: string;
  serving_size?: number;
  steps: RecipeStep[];
  ingredients: RecipeIngredientDetail[];
}

export interface IngredientNutritionItem {
  name: string;
  quantity: number;
  grams_estimated: number;
  calories: number;
  sodium_mg: number;
  sugar_g: number;
  is_high_potassium: boolean;
  tags: string[];
  warnings: string[];
}

export interface MedicationConflict {
  type: string;
  severity: string;
  message: string;
  conflict_ingredients: string[];
  meituan_pharmacy_url?: string;
  meituan_pharmacy_label?: string;
}

export interface RecipeDietaryAnalysisResponse {
  dietary_mode: DietaryMode;
  mode_label: string;
  servings: number;
  total_calories: number;
  calories_per_serving: number;
  total_sodium_mg: number;
  total_sugar_g: number;
  ingredients: IngredientNutritionItem[];
  warnings: string[];
  fat_loss_rating?: string;
  fat_loss_tip?: string;
  sodium_level?: string;
  sugar_level?: string;
  parents_tip?: string;
  medication_conflicts: MedicationConflict[];
  high_potassium_ingredients: string[];
}

export interface RecipeDietaryAnalysisParams {
  user_id: number;
  servings?: number;
  dietary_mode?: DietaryMode;
}

export interface RecipeStep {
  step?: number;
  description: string;
}

export interface RecipeIngredientDetail {
  ingredient_id?: number;
  name: string;
  required_quantity: number;
  is_required?: boolean;
}

export interface RecipeChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface RecipeChatRequest {
  recipe_id: number;
  question: string;
  history?: RecipeChatHistoryItem[];
}

export interface RecipeChatResponse {
  answer: string;
  model: string;
  recipe_id: number;
  recipe_name: string;
}

export interface RecipeChatStreamDone {
  done: true;
  model: string;
  recipe_id: number;
  recipe_name: string;
}

export interface RecipeChatStatusResponse {
  configured: boolean;
  model: string;
  provider: string;
}

// 推荐算法相关类型
export interface MatchScoreResult {
  match_score: number;
  existing_ingredients_ratio: number;
  missing_ingredients_count: number;
}

export interface TakeoutChannel {
  id: string;
  name: string;
  order_url: string;
}

export interface TakeoutAnalysis {
  estimated_takeout_price: number;
  estimated_purchase_cost: number;
  ping_hao_fan_price?: number;
  delivery_time_minutes: number;
  savings_vs_purchase: number;
  recommendation_tip: string;
  search_keyword: string;
  platform: string;
  channels?: TakeoutChannel[];
  order_url: string;
  is_takeout_recommended: boolean;
  intent_takeout?: boolean;
  priority?: 'high' | 'medium' | 'low';
  final_price?: number;
  final_price_label?: string;
}

export interface PremadeAnalysis {
  estimated_premade_price: number;
  delivery_time_minutes: number;
  recommendation_tip: string;
  search_keyword: string;
  platform: string;
  channel_name: string;
  channels?: TakeoutChannel[];
  order_url: string;
  is_premade_recommended: boolean;
  final_price?: number;
  final_price_label?: string;
}

export interface RecommendationCostMetrics {
  money_cost: number;
  money_cost_label: string;
  time_cost_minutes: number;
  time_cost_label: string;
  health_score: number;
  health_score_label: string;
  original_price: number;
  coupon_discount: number;
  coupon_name?: string | null;
  final_price: number;
  final_price_label: string;
  quadrant: string;
  quadrant_label: string;
}

export interface QuadrantSummaryItem {
  type: string;
  label: string;
  count: number;
}

export type RecommendationQuadrantType =
  | 'cook_self'
  | 'flash_purchase_cook'
  | 'takeout_delivery'
  | 'premade_fresh'
  | 'no_purchase'
  | 'small_purchase'
  | 'takeout_alternative';

export interface RecommendationItem {
  recommendation_id?: number;
  recipe_id: number;
  name: string;
  cooking_time: number;
  image_url?: string;
  recommendation_type: RecommendationQuadrantType | string;
  legacy_recommendation_type?: string;
  quadrant?: string;
  quadrant_label?: string;
  match_score: number;
  existing_ingredients_ratio: number;
  missing_ingredients_count: number;
  missing_ingredients_detail: Record<string, unknown>[];
  recommendation_reason: string;
  cost_metrics?: RecommendationCostMetrics;
  purchase_analysis?: Record<string, unknown>;
  takeout_analysis?: TakeoutAnalysis;
  premade_analysis?: PremadeAnalysis;
}

export interface TakeoutRedirectParams {
  user_id: number;
  preference?: string;
  recipe_id?: number;
}

export interface TakeoutStoreInfo {
  name: string;
  rating: number;
  monthly_sales: string;
  delivery_time: string;
  delivery_fee: number;
  min_order: number;
  distance: string;
  address: string;
  badge: string;
}

export interface TakeoutStoreItem {
  product_id: string;
  recipe_id?: number;
  name: string;
  price: number;
  original_price?: number;
  ping_hao_fan_price?: number;
  unit: string;
  spec: string;
  image_url?: string;
  category: string;
  rating: number;
  sales_count: number;
  match_score: number;
  channel: 'waimai' | 'ping_hao_fan' | string;
  order_url?: string;
}

export interface TakeoutPromotion {
  id: string;
  title: string;
  price: number;
  price_label: string;
  image_url?: string;
  badge: string;
  recipe_id?: number;
  order_url?: string;
}

export interface TakeoutMerchantPromotion {
  type: string;
  text: string;
}

export interface TakeoutMerchant {
  merchant_id: string;
  name: string;
  image_url?: string;
  rating: number;
  monthly_sales: string;
  min_order: number;
  delivery_fee: number;
  delivery_fee_label: string;
  distance: string;
  delivery_time: string;
  feature_tag?: string;
  delivery_provider: string;
  kitchen_badge?: string;
  promotions: TakeoutMerchantPromotion[];
  match_score: number;
  recipe_id?: number;
  is_food_plaza: boolean;
  social_proof?: string;
  is_special_offer: boolean;
  store_info: TakeoutStoreInfo;
}

export interface TakeoutRedirectResponse {
  platform: string;
  platform_name: string;
  search_keyword: string;
  order_url: string;
  home_url: string;
  recommendation_tip: string;
  channels: TakeoutChannel[];
  hot_searches: string[];
  store_info: TakeoutStoreInfo;
  store_items: TakeoutStoreItem[];
  promotions: TakeoutPromotion[];
  merchants: TakeoutMerchant[];
  takeout_delivery_recipes: RecommendationItem[];
  total_count: number;
  intent_takeout: boolean;
}

export interface RecommendationResponse {
  cook_self_recipes: RecommendationItem[];
  flash_purchase_recipes: RecommendationItem[];
  takeout_delivery_recipes: RecommendationItem[];
  premade_fresh_recipes: RecommendationItem[];
  no_purchase_recipes: RecommendationItem[];
  small_purchase_recipes: RecommendationItem[];
  takeout_alternative_recipes: RecommendationItem[];
  quadrant_summary?: Record<string, QuadrantSummaryItem>;
  total_count: number;
  generated_at: string;
}

export interface RecipeSelectionRequest {
  recommendation_id: number;
  is_selected: boolean;
  servings?: number;
}

export interface RecipeSelectionResponse {
  recommendation_id: number;
  is_selected: boolean;
  success: boolean;
  message: string;
  recipe_id?: number;
  recipe_name?: string;
  cook_id?: number;
  is_new_badge?: boolean;
  cook_count?: number;
  badge?: RecipeBadgeItem;
}

export interface ClearRecommendationCacheResponse {
  deleted_count: number;
  message: string;
}

export interface RecipeCookRequest {
  user_id: number;
  servings?: number;
}

export interface RecipeBadgeItem {
  recipe_id: number;
  recipe_name: string;
  image_url?: string;
  taste?: string;
  badge_emoji: string;
  badge_tier: 'bronze' | 'silver' | 'gold' | string;
  cook_count: number;
  first_cooked_at: string;
  last_cooked_at: string;
}

export interface DailyRecipeThumb {
  recipe_id: number;
  recipe_name: string;
  image_url?: string;
}

export interface MonthlyDayStat {
  date: string;
  count: number;
  recipes?: DailyRecipeThumb[];
}

export interface MonthlyCookStats {
  year: number;
  month: number;
  total_cooks: number;
  unique_recipes: number;
  daily_breakdown: MonthlyDayStat[];
}

export interface RecipeCollectionResponse {
  total_badges: number;
  total_cooks: number;
  badges: RecipeBadgeItem[];
  monthly_stats: MonthlyCookStats;
}

export interface RecipeCookRecordResponse {
  cook_id: number;
  recipe_id: number;
  recipe_name: string;
  is_new_badge: boolean;
  cook_count: number;
  badge?: RecipeBadgeItem;
  message: string;
}

export interface RecommendationStats {
  total_recommendations: number;
  type_breakdown: Record<string, number>;
  selected_count: number;
}

export interface AdvancedRecommendationRequest {
  user_id: number;
  preference?: string;
  max_cooking_time?: number;
  recommendation_types?: string[];
  min_match_score?: number;
  limit?: number;
  has_time?: boolean;
  prefer_convenience?: boolean;
  prefer_premade?: boolean;
  prefer_takeout?: boolean;
}

// 补购相关类型
export interface MissingIngredientAnalyze {
  ingredient_id: number;
  name: string;
  required_quantity: number;
  current_quantity: number;
}

export interface PurchaseAnalyzeRequest {
  recipe_id: number;
  user_id: number;
  /** 用餐人数，按菜谱基准人份等比缩放所需食材量 */
  servings?: number;
}

export interface PurchaseAnalyzeResponse {
  missing_ingredients: MissingIngredientAnalyze[];
}

export interface PurchasePlanRequest {
  missing_ingredients: MissingIngredientAnalyze[];
  plan_type?: 'standard' | 'economy';
  user_id?: number;
  recipe_id?: number;
  cooking_time?: number;
}

export interface PurchasePlanItem {
  ingredient_id: number;
  name: string;
  quantity: number;
  price: number;
  product_id?: string;
  product_name?: string;
  unit?: string;
  spec?: string;
  tier?: 'premium' | 'standard' | 'economy' | string;
  rating?: number;
  unit_price?: number;
  savings_vs_standard?: number;
}

export interface MatchedCoupon {
  user_coupon_id: number;
  coupon_id: number;
  coupon_type: 'flash_sale' | 'delivery' | 'cross_store' | string;
  name: string;
  discount_amount: number;
  min_order_amount: number;
  is_best?: boolean;
}

export interface PriceComparisonBreakdown {
  subtotal: number;
  coupon_discount: number;
  delivery_fee: number;
  final_price: number;
}

export interface PriceComparison {
  cook_self: PriceComparisonBreakdown;
  takeout: PriceComparisonBreakdown;
  recommended: 'cook_self' | 'takeout';
  savings_amount: number;
  savings_tip: string;
}

export interface UserCouponItem {
  user_coupon_id: number;
  coupon_id: number;
  coupon_type: 'flash_sale' | 'delivery' | 'cross_store' | string;
  name: string;
  description?: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  min_order_amount: number;
  max_discount?: number;
  applicable_scope: string;
  status: string;
  expires_at: string;
  estimated_discount?: number;
  is_applicable?: boolean;
}

export interface WeeklySavingsResponse {
  weekly_saved_amount: number;
  week_start: string;
  breakdown: Record<string, number>;
  recent_logs: Array<{
    id: number;
    event_type: string;
    saved_amount: number;
    description?: string;
    recipe_id?: number;
    created_at: string;
  }>;
}

export interface UserCouponsResponse {
  coupons: UserCouponItem[];
  total_count: number;
}

export interface PurchasePlan {
  plan_type: string;
  plan_name: string;
  plan_description?: string;
  total_price: number;
  original_price?: number;
  discount_amount: number;
  items: PurchasePlanItem[];
  cost_effectiveness?: number;
  avg_quality_score?: number;
  strategy_tags?: string[];
  matched_coupons?: MatchedCoupon[];
  coupon_discount?: number;
  final_price?: number;
}

export interface PurchasePlanItemDiff {
  ingredient_name: string;
  standard_product?: string;
  economy_product?: string;
  standard_price: number;
  economy_price: number;
  price_diff: number;
  standard_tier?: string;
  economy_tier?: string;
  same_product: boolean;
}

export interface IngredientStockItem extends UserIngredient {
  name?: string;
  ingredient_name?: string;
  category?: string;
}

export interface UserIngredientsListResponse {
  stocks: IngredientStockItem[];
  total_count: number;
}

export interface UserRecommendationHistoryItem {
  recommendation_id?: number;
  recipe_id: number;
  name?: string;
  cooking_time?: number;
  recommendation_type?: string;
  match_score?: number;
  existing_ingredients_ratio?: number;
  missing_ingredients_count?: number;
  recommendation_reason?: string;
  is_selected?: boolean;
  created_at?: string;
}

export interface UserRecommendationHistoryResponse {
  recommendations: UserRecommendationHistoryItem[];
  total_count: number;
}

export interface UserPurchasePlanHistoryItem {
  id?: number;
  record_id?: number;
  plan_type: string;
  total_price: number;
  items_count?: number;
  status: string;
  created_at: string;
  plan_details?: Record<string, unknown>;
}

export interface UserPurchasePlansResponse {
  plans: UserPurchasePlanHistoryItem[];
  total_count: number;
}

export interface PurchasePlanComparison {
  price_difference: number;
  final_price_difference?: number;
  savings_percentage: string | number;
  item_count_difference?: number;
  different_item_count?: number;
  avg_quality_standard?: number;
  avg_quality_economy?: number;
  quality_difference?: number;
  standard_final_price?: number;
  economy_final_price?: number;
  item_diffs?: PurchasePlanItemDiff[];
  recommendation?: string;
  recommendation_reason?: string;
}

export interface PurchasePlanResponse {
  standard_plan?: PurchasePlan;
  economy_plan?: PurchasePlan;
}

export interface PurchasePlanResponseExtended extends PurchasePlanResponse {
  comparison?: PurchasePlanComparison;
  price_comparison?: PriceComparison;
  available_coupons?: UserCouponItem[];
}

export interface ProductMatchRequest {
  ingredient_id: number;
  quantity: number;
  sort_by?: string;
}

export interface ProductItem {
  product_id: string;
  name: string;
  price: number;
  original_price?: number;
  unit: string;
  spec?: string;
  image_url?: string;
  source: string;
  category?: string;
  rating?: number;
  sales_count?: number;
  match_score: number;
}

export interface ProductMatchResponse {
  products: ProductItem[];
  total_count: number;
}

export interface OrderCreateRequest {
  products: ProductItem[];
  user_id: number;
  plan_type?: string;
}

export interface OrderResponse {
  redirect_url: string;
  order_id: string;
  total_amount: number;
  plan_details?: Record<string, unknown>;
}

export interface PurchasePlanSelectionRequest {
  user_id: number;
  recipe_id: number;
  plan_type: string;
  plan_details: Record<string, unknown>;
}

export interface ProductSearchParams {
  ingredient_id?: number;
  sort_by?: string;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PaginationQueryParams {
  page?: number;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PurchasePlanSelectionResponse {
  selection_id: number;
  plan_type: string;
  total_price: number;
  success: boolean;
  message: string;
  weekly_saved_amount?: number;
}

// 订单同步相关类型
export interface OrderSyncRel {
  id: number;
  user_id: number;
  meituan_order_id: string;
  ingredient_details: string;
  sync_status: string;
}

// 推荐记录相关类型
export interface RecipeRecommendation {
  id: number;
  user_id: number;
  recipe_id: number;
  recommendation_type: string;
  match_score: number;
  existing_ingredients_ratio: number;
  missing_ingredients_count: number;
  missing_ingredients_detail?: string;
  cooking_time: number;
  recommendation_reason?: string;
  is_selected: boolean;
  created_at: string;
  expires_at?: string;
}

// 商品匹配相关类型
export interface ProductMatch {
  id: number;
  ingredient_id: number;
  product_id: string;
  product_name: string;
  price: number;
  original_price?: number;
  unit: string;
  spec?: string;
  image_url?: string;
  source: string;
  category?: string;
  rating?: number;
  sales_count?: number;
  stock_status: string;
  match_score: number;
  created_at: string;
  updated_at: string;
}

// 购买方案记录相关类型
export interface PurchasePlanRecord {
  id: number;
  user_id: number;
  recipe_id: number;
  plan_type_id: number;
  plan_name: string;
  total_price: number;
  original_price?: number;
  discount_amount: number;
  items_count: number;
  plan_details?: string;
  status: string;
  created_at: string;
  expires_at?: string;
}

// 场景 Bundle 类型 (schemas/bundle_scenario.py)
export type ScenarioType = 'cook_shop' | 'weekend_restock' | 'home_gathering';
export type BundleRedirectChannel = 'flash_sale' | 'xiaoxiang_scheduled' | 'flash_combo';

export interface BundleSkuItem {
  sku_id: string;
  sku_name: string;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
  spec?: string;
  price: number;
  tier?: string;
  rating?: number;
}

export interface OrderableBundle {
  bundle_id: string;
  bundle_sku_id: string;
  bundle_name: string;
  bundle_type: ScenarioType;
  description: string;
  items: BundleSkuItem[];
  item_count: number;
  total_price: number;
  original_price?: number;
  discount_amount: number;
  matched_coupons?: MatchedCoupon[];
  coupon_discount?: number;
  final_price: number;
  redirect_channel: BundleRedirectChannel;
  redirect_label: string;
  redirect_url?: string;
  tags: string[];
  coverage_summary?: string;
  context: Record<string, unknown>;
}

export interface FridgeCoverageDetail {
  covered_count: number;
  total_count: number;
  covered_items: string[];
  missing_items: string[];
  coverage_rate: number;
}

export interface ScenarioSuggestion {
  scenario: ScenarioType;
  scenario_label: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  badge?: string;
  action_hint?: string;
}

export interface ScenarioPreviewResponse {
  headline: string;
  subheadline: string;
  fridge_total: number;
  near_expiry_count: number;
  near_expiry_items: string[];
  suggested_scenario?: ScenarioSuggestion;
  scenarios: ScenarioSuggestion[];
}

export interface ScenarioBundleResponse {
  scenario: ScenarioType;
  scenario_label: string;
  message: string;
  headline?: string;
  recommendation_reasons?: string[];
  fridge_coverage?: FridgeCoverageDetail;
  stock_savings_hint?: string;
  bundle: OrderableBundle;
  recipe_id?: number;
  recipe_name?: string;
  near_expiry_used?: string[];
}

export interface CookShopScenarioRequest {
  user_id: number;
  recipe_id?: number;
  servings?: number;
}

export interface WeekendRestockScenarioRequest {
  user_id: number;
  family_count?: number;
}

export interface HomeGatheringScenarioRequest {
  user_id: number;
  event_type?: 'hotpot' | 'bbq';
  guest_count: number;
}

export interface BundleOrderCreateRequest {
  bundle_id: string;
  bundle_sku_id: string;
  user_id: number;
  scenario: ScenarioType;
  total_amount: number;
  item_count: number;
  redirect_channel?: BundleRedirectChannel;
  redirect_label?: string;
}

export interface BundleOrderResponse {
  order_id: string;
  bundle_id: string;
  bundle_sku_id: string;
  redirect_url: string;
  total_amount: number;
  item_count: number;
  redirect_channel: BundleRedirectChannel;
  redirect_label: string;
}

// 云冰箱 AI Agent (schemas/fridge_agent.py)
export interface FridgeAgentHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface FridgeAgentChatRequest {
  user_id: number;
  message: string;
  history?: FridgeAgentHistoryItem[];
}

export interface FridgeAgentCartItem {
  sku_id: string;
  sku_name: string;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
  spec?: string;
  price: number;
  tier?: string;
  rating?: number;
}

export interface FridgeAgentRecipeItem {
  recipe_id: number;
  recipe_name: string;
  cooking_time: number;
  match_score: number;
  missing_ingredients_count: number;
  covered_ingredients: string[];
}

export interface FridgeAgentPriceEstimate {
  total_price: number;
  original_price?: number;
  discount_amount: number;
  coupon_discount: number;
  final_price: number;
  matched_coupons: MatchedCoupon[];
  savings_label?: string;
}

export interface FridgeAgentStructuredResult {
  scenario_type?: string;
  scenario_label?: string;
  people_count?: number;
  in_stock: string[];
  missing: string[];
  coverage_summary?: string;
  recipes: FridgeAgentRecipeItem[];
  flash_cart: FridgeAgentCartItem[];
  price_estimate?: FridgeAgentPriceEstimate;
  bundle_sku_id?: string;
  redirect_label?: string;
  redirect_url?: string;
}

export interface FridgeAgentChatResponse {
  answer: string;
  model: string;
  provider: string;
  tool_calls_made: string[];
  structured?: FridgeAgentStructuredResult;
}

export interface FridgeAgentChatStreamDone {
  done: true;
  model: string;
  provider: string;
  tool_calls_made: string[];
  structured?: FridgeAgentStructuredResult;
}

export interface FridgeAgentStatusResponse {
  configured: boolean;
  model: string;
  provider: string;
  tagline: string;
}
