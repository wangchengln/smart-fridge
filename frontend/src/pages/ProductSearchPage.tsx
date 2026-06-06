import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Ticket,
  Truck,
  Zap,
} from 'lucide-react';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useUserCoupons } from '../hooks/queries/useCouponQueries';
import type { ProductItem, PurchasePlan, PurchasePlanItem } from '../types/api';
import { loadPurchaseContext } from '../utils/purchaseContext';
import { getCouponTypeColor, getCouponTypeLabel } from '../utils/coupon';

type CartItem = ProductItem & { quantity: number; ingredient_id?: number };

interface SelectedPlanSession {
  planType: 'standard' | 'economy';
  plan: PurchasePlan;
}

const STORE_INFO = {
  name: '小象超市（望京店）',
  rating: 4.8,
  monthlySales: '3000+',
  deliveryTime: '30分钟',
  deliveryFee: 3,
  minOrder: 20,
  distance: '1.2km',
  address: '北京市朝阳区望京街道',
};

const inferCategory = (name: string): string => {
  if (/猪|鸡|牛|羊|肉|排|腿/.test(name)) return 'meat';
  if (/鱼|虾|蟹|贝|海鲜/.test(name)) return 'seafood';
  if (/蛋|奶|乳|芝士/.test(name)) return 'dairy';
  if (/米|面|油|粮|粉/.test(name)) return 'grain';
  if (/菜|瓜|豆|茄|椒|葱|蒜|姜|萝卜|土豆|番茄|西红柿|胡萝卜|白菜|菠菜|豆腐/.test(name))
    return 'vegetable';
  return 'other';
};

const planItemToProduct = (item: PurchasePlanItem): CartItem => ({
  product_id: item.product_id || `plan-${item.ingredient_id}`,
  ingredient_id: item.ingredient_id,
  name: item.product_name || item.name,
  price: Number(item.price),
  original_price: Number(item.price) * 1.15,
  unit: item.unit || '份',
  spec: item.quantity ? `${item.quantity}${item.unit || 'g'}` : '1份',
  image_url: `https://photo.bj.ide.test.sankuai.com/?keyword=${encodeURIComponent(item.name)}&width=200&height=200`,
  source: 'meituan',
  category: inferCategory(item.name),
  rating: 4.5 + Math.random() * 0.4,
  sales_count: Math.floor(Math.random() * 3000) + 500,
  match_score: 0.88 + Math.random() * 0.1,
  quantity: 1,
});

const loadSelectedPlan = (): SelectedPlanSession | null => {
  try {
    const raw = sessionStorage.getItem('selectedPurchasePlan');
    return raw ? (JSON.parse(raw) as SelectedPlanSession) : null;
  } catch {
    return null;
  }
};

const ProductSearchPage = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const selectedPlan = useMemo(() => loadSelectedPlan(), []);
  const purchaseContext = useMemo(() => loadPurchaseContext(), []);

  useEffect(() => {
    const planItems = selectedPlan?.plan?.items;
    if (planItems?.length) {
      setCartItems(planItems.map(planItemToProduct));
      sessionStorage.setItem('orderCart', JSON.stringify(planItems.map(planItemToProduct)));
    } else {
      try {
        const saved = JSON.parse(sessionStorage.getItem('orderCart') || '[]') as CartItem[];
        setCartItems(saved.map((item) => ({ ...item, quantity: item.quantity || 1 })));
      } catch {
        setCartItems([]);
      }
    }
    setInitialized(true);
  }, [selectedPlan]);

  const categories = useMemo(() => {
    const cats = new Set<string>(['all']);
    cartItems.forEach((item) => cats.add(item.category || 'other'));
    const labels: Record<string, string> = {
      all: '全部',
      vegetable: '蔬菜',
      meat: '肉禽',
      seafood: '水产',
      dairy: '蛋奶',
      grain: '粮油',
      other: '其他',
    };
    return Array.from(cats).map((key) => ({ key, label: labels[key] || '其他' }));
  }, [cartItems]);

  const filteredItems = useMemo(() => {
    return cartItems.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [cartItems, activeCategory, searchQuery]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const { data: couponsData } = useUserCoupons(userId, subtotal);
  const applicableCoupons = (couponsData?.coupons ?? []).filter(
    (c) => c.coupon_type === 'flash_sale' || c.coupon_type === 'cross_store'
  );
  const bestCoupon = applicableCoupons
    .filter((c) => c.is_applicable && c.estimated_discount)
    .sort((a, b) => Number(b.estimated_discount) - Number(a.estimated_discount))[0];
  const couponDiscount = Number(bestCoupon?.estimated_discount ?? 0);
  const total = Math.max(
    0,
    subtotal + (cartCount > 0 ? STORE_INFO.deliveryFee : 0) - couponDiscount
  );
  const meetsMinOrder = subtotal >= STORE_INFO.minOrder;
  const isEconomy = selectedPlan?.planType === 'economy';

  const syncCart = (items: CartItem[]) => {
    setCartItems(items);
    sessionStorage.setItem('orderCart', JSON.stringify(items));
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    syncCart(
      cartItems.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter((item) => item.quantity > 0)
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('请先添加商品');
      return;
    }
    if (!meetsMinOrder) {
      alert(`还差 ¥${(STORE_INFO.minOrder - subtotal).toFixed(2)} 起送`);
      return;
    }
    navigate('/purchase/order');
  };

  if (!initialized) return <LoadingSpinner text="加载闪购商品..." />;

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-2 text-mt-text-secondary">暂无选购商品</p>
        <p className="mb-4 text-xs text-mt-text-muted">请先在补购方案中选择省钱版或标准版</p>
        <Link to="/purchase/plans">
          <Button>返回补购方案</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 animate-fade-in pb-28">
      {/* 闪购顶部搜索栏 */}
      <div className="sticky top-12 z-20 bg-white px-4 pb-2 pt-1 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-mt-gray-50 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-mt-text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索店内商品"
              className="flex-1 bg-transparent text-sm text-mt-text outline-none placeholder:text-mt-text-muted"
            />
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-0.5 text-xs text-mt-text-secondary"
          >
            <MapPin className="h-3.5 w-3.5 text-mt-orange" />
            {STORE_INFO.distance}
          </button>
        </div>
      </div>

      {/* 店铺信息 */}
      <div className="bg-white px-4 pb-3">
        <div className="flex gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-xl font-black text-white shadow-sm">
            象
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-bold text-mt-text">{STORE_INFO.name}</h2>
              <span className="shrink-0 rounded bg-mt-yellow/20 px-1.5 py-0.5 text-[10px] font-medium text-mt-orange">
                美团闪购
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mt-text-secondary">
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-mt-yellow text-mt-yellow" />
                {STORE_INFO.rating}
              </span>
              <span>月售{STORE_INFO.monthlySales}</span>
              <span className="flex items-center gap-0.5 text-emerald-600">
                <Zap className="h-3 w-3" />
                {STORE_INFO.deliveryTime}达
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-mt-red">
                满29减5
              </span>
              <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] text-mt-orange">
                新客立减
              </span>
              {isEconomy && (
                <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-600">
                  省钱版方案
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 配送信息条 */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-mt-gray-50 px-3 py-2 text-xs">
          <div className="flex items-center gap-3 text-mt-text-secondary">
            <span className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              配送费 ¥{STORE_INFO.deliveryFee}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              约{STORE_INFO.deliveryTime}
            </span>
          </div>
          <span className="text-mt-text-muted">起送 ¥{STORE_INFO.minOrder}</span>
        </div>

        {purchaseContext?.recipe_name && (
          <div className="mt-2 flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-2 text-xs text-mt-orange">
            <span className="font-medium">为「{purchaseContext.recipe_name}」补购</span>
            {selectedPlan && (
              <span className="text-mt-text-secondary">
                · {selectedPlan.plan.plan_name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 优惠券横滑 */}
      <div className="scrollbar-hide flex gap-2 overflow-x-auto bg-white px-4 py-2">
        {applicableCoupons.length > 0 ? (
          applicableCoupons.map((coupon) => (
            <div
              key={coupon.user_coupon_id}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r ${getCouponTypeColor(coupon.coupon_type)} px-3 py-1.5 text-xs font-medium text-white ${
                !coupon.is_applicable ? 'opacity-50' : ''
              }`}
            >
              <Ticket className="h-3.5 w-3.5" />
              {getCouponTypeLabel(coupon.coupon_type)} · {coupon.name}
              {coupon.is_applicable && coupon.estimated_discount != null && (
                <span className="rounded bg-white/20 px-1">-¥{Number(coupon.estimated_discount).toFixed(0)}</span>
              )}
              <ChevronRight className="h-3 w-3 opacity-70" />
            </div>
          ))
        ) : (
          <div className="text-xs text-mt-text-muted">暂无可用闪购神券</div>
        )}
      </div>

      {/* 分类 + 商品列表（闪购经典左右布局） */}
      <div className="mt-2 flex bg-white" style={{ minHeight: 'calc(100vh - 22rem)' }}>
        {/* 左侧分类 */}
        <div className="w-[72px] shrink-0 border-r border-mt-border bg-mt-gray-50">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setActiveCategory(cat.key);
                listRef.current?.scrollTo({ top: 0 });
              }}
              className={`relative w-full px-1 py-3.5 text-center text-xs leading-tight transition-colors ${
                activeCategory === cat.key
                  ? 'bg-white font-bold text-mt-text'
                  : 'text-mt-text-secondary'
              }`}
            >
              {activeCategory === cat.key && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-mt-yellow" />
              )}
              {cat.label}
            </button>
          ))}
        </div>

        {/* 右侧商品 */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2">
          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-mt-text-muted">暂无匹配商品</p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.product_id}
                className="flex gap-2.5 border-b border-mt-border/60 py-3 last:border-0"
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover bg-mt-gray-100"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-mt-text">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-mt-text-muted">{item.spec}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-mt-text-secondary">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-mt-yellow text-mt-yellow" />
                      {item.rating?.toFixed(1)}
                    </span>
                    <span>月售{item.sales_count}</span>
                    <span className="mt-tag-green text-[9px]">
                      匹配{(item.match_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-1">
                    <div>
                      <span className="mt-price text-base">¥{item.price.toFixed(2)}</span>
                      {item.original_price != null && item.original_price > item.price && (
                        <span className="ml-1 text-[10px] text-mt-text-muted line-through">
                          ¥{item.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.quantity > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product_id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-mt-border bg-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.product_id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-mt-yellow"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.product_id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-mt-yellow"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 底部购物车栏（闪购风格） */}
      <div className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="mx-auto max-w-3xl px-3 pb-3">
          <div className="flex items-center gap-3 rounded-full bg-[#2d2d2d] px-4 py-2.5 shadow-float">
            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3d3d3d]">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-mt-red px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {cartCount > 0 ? (
                <>
                  <p className="text-lg font-bold text-white">
                    ¥{total.toFixed(2)}
                    <span className="ml-1 text-[10px] font-normal text-white/60">
                      {couponDiscount > 0 ? `券后 · 已减¥${couponDiscount.toFixed(0)}` : '含配送费'}
                    </span>
                  </p>
                  {!meetsMinOrder && (
                    <p className="text-[10px] text-white/50">
                      还差 ¥{(STORE_INFO.minOrder - subtotal).toFixed(2)} 起送
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-white/50">未选购商品</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cartCount === 0 || !meetsMinOrder}
              className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-bold transition-opacity ${
                cartCount > 0 && meetsMinOrder
                  ? 'bg-mt-yellow text-mt-text'
                  : 'bg-mt-gray-500 text-white/70'
              }`}
            >
              去结算
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSearchPage;
