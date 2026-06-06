import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { resolveRecipeImageUrl } from '../utils/recipeImage';
import {
  loadTakeoutCart,
  loadTakeoutContext,
  saveTakeoutCart,
  type TakeoutCartItem,
} from '../utils/takeoutContext';
import { getCouponTypeColor, getCouponTypeLabel } from '../utils/coupon';

const CATEGORY_LABELS: Record<string, string> = {
  all: '全部',
  hot: '热销同款',
  ping_hao_fan: '拼好饭',
  staple: '主食',
  soup: '汤羹',
};

const TakeoutStorePage = () => {
  const { userId } = useAuth();
  const listRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<TakeoutCartItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const takeoutContext = useMemo(() => loadTakeoutContext(), []);
  const storeInfo = takeoutContext?.store_info;

  useEffect(() => {
    const storeItems = takeoutContext?.store_items ?? [];
    if (storeItems.length) {
      const savedCart = loadTakeoutCart();
      if (savedCart.length > 0) {
        setCartItems(savedCart);
      } else {
        const defaultCart = storeItems.slice(0, 1).map((item) => ({
          ...item,
          quantity: 1,
        }));
        setCartItems(defaultCart);
        saveTakeoutCart(defaultCart);
      }
    } else {
      setCartItems([]);
    }
    setInitialized(true);
  }, [takeoutContext]);

  const categories = useMemo(() => {
    const cats = new Set<string>(['all']);
    (takeoutContext?.store_items ?? []).forEach((item) => cats.add(item.category || 'hot'));
    return Array.from(cats).map((key) => ({
      key,
      label: CATEGORY_LABELS[key] || '其他',
    }));
  }, [takeoutContext]);

  const filteredItems = useMemo(() => {
    return (takeoutContext?.store_items ?? []).filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [takeoutContext, activeCategory, searchQuery]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = storeInfo?.delivery_fee ?? 3;
  const minOrder = storeInfo?.min_order ?? 15;

  const { data: couponsData } = useUserCoupons(userId, subtotal);
  const applicableCoupons = (couponsData?.coupons ?? []).filter(
    (c) => c.coupon_type === 'delivery' || c.coupon_type === 'cross_store'
  );
  const bestCoupon = applicableCoupons
    .filter((c) => c.is_applicable && c.estimated_discount)
    .sort((a, b) => Number(b.estimated_discount) - Number(a.estimated_discount))[0];
  const couponDiscount = Number(bestCoupon?.estimated_discount ?? 0);
  const total = Math.max(0, subtotal + (cartCount > 0 ? deliveryFee : 0) - couponDiscount);
  const meetsMinOrder = subtotal >= minOrder;

  const syncCart = (items: TakeoutCartItem[]) => {
    setCartItems(items);
    saveTakeoutCart(items);
  };

  const getItemQuantity = (productId: string) =>
    cartItems.find((item) => item.product_id === productId)?.quantity ?? 0;

  const handleQuantityChange = (productId: string, delta: number) => {
    const storeItem = takeoutContext?.store_items.find((item) => item.product_id === productId);
    if (!storeItem) return;

    const existing = cartItems.find((item) => item.product_id === productId);
    if (existing) {
      syncCart(
        cartItems
          .map((item) =>
            item.product_id === productId
              ? { ...item, quantity: Math.max(0, item.quantity + delta) }
              : item
          )
          .filter((item) => item.quantity > 0)
      );
      return;
    }

    if (delta > 0) {
      syncCart([...cartItems, { ...storeItem, quantity: 1 }]);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('请先添加菜品');
      return;
    }
    if (!meetsMinOrder) {
      alert(`还差 ¥${(minOrder - subtotal).toFixed(2)} 起送`);
      return;
    }
    alert(
      `演示下单成功！\n${storeInfo?.name}\n共 ${cartCount} 份，券后 ¥${total.toFixed(2)}\n（实际场景将跳转美团外卖完成支付）`
    );
  };

  if (!initialized) return <LoadingSpinner text="加载外卖店铺..." />;

  if (!takeoutContext || !storeInfo) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-2 text-mt-text-secondary">暂无外卖店铺数据</p>
        <p className="mb-4 text-xs text-mt-text-muted">请先在菜谱页「外卖同款」中点击「点外卖」选择商家</p>
        <Link to="/recipes">
          <Button>返回菜谱推荐</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 animate-fade-in pb-28">
      {/* 外卖顶部搜索栏 */}
      <div className="sticky top-12 z-20 bg-white px-4 pb-2 pt-1 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-mt-gray-50 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-mt-text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索店内菜品"
              className="flex-1 bg-transparent text-sm text-mt-text outline-none placeholder:text-mt-text-muted"
            />
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-0.5 text-xs text-mt-text-secondary"
          >
            <MapPin className="h-3.5 w-3.5 text-mt-orange" />
            {storeInfo.distance}
          </button>
        </div>
      </div>

      {/* 店铺信息 */}
      <div className="bg-white px-4 pb-3">
        <div className="flex gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-xl font-black text-white shadow-sm">
            外
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-bold text-mt-text">{storeInfo.name}</h2>
              <span className="shrink-0 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-mt-orange">
                {storeInfo.badge}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mt-text-secondary">
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-mt-yellow text-mt-yellow" />
                {storeInfo.rating}
              </span>
              <span>月售{storeInfo.monthly_sales}</span>
              <span className="flex items-center gap-0.5 text-orange-600">
                <Zap className="h-3 w-3" />
                {storeInfo.delivery_time}达
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-mt-red">
                满35减6
              </span>
              <span className="rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] text-mt-orange">
                外卖红包
              </span>
              <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                不想做专属
              </span>
            </div>
          </div>
        </div>

        {/* 配送信息条 */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-mt-gray-50 px-3 py-2 text-xs">
          <div className="flex items-center gap-3 text-mt-text-secondary">
            <span className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              配送费 ¥{deliveryFee}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              约{storeInfo.delivery_time}
            </span>
          </div>
          <span className="text-mt-text-muted">起送 ¥{minOrder}</span>
        </div>

        <div className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-mt-orange">
          {takeoutContext.recommendation_tip.startsWith('为「') ? (
            <span className="font-medium">{takeoutContext.recommendation_tip}</span>
          ) : (
            <span>
              <span className="font-medium">今日不想下厨</span>
              <span className="text-mt-text-secondary">
                {' '}
                · {takeoutContext.recommendation_tip}
              </span>
            </span>
          )}
        </div>
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
                <span className="rounded bg-white/20 px-1">
                  -¥{Number(coupon.estimated_discount).toFixed(0)}
                </span>
              )}
              <ChevronRight className="h-3 w-3 opacity-70" />
            </div>
          ))
        ) : (
          <div className="text-xs text-mt-text-muted">暂无可用外卖神券</div>
        )}
      </div>

      {/* 分类 + 菜品列表 */}
      <div className="mt-2 flex bg-white" style={{ minHeight: 'calc(100vh - 22rem)' }}>
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

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2">
          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-mt-text-muted">暂无匹配菜品</p>
          ) : (
            filteredItems.map((item) => {
              const quantity = getItemQuantity(item.product_id);
              const imageUrl = resolveRecipeImageUrl(item.image_url, item.name, {
                width: 144,
                height: 144,
              });

              return (
                <div
                  key={item.product_id}
                  className="flex gap-2.5 border-b border-mt-border/60 py-3 last:border-0"
                >
                  <img
                    src={imageUrl}
                    alt={item.name}
                    className="h-[72px] w-[72px] shrink-0 rounded-lg bg-mt-gray-100 object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-mt-text">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-mt-text-muted">{item.spec}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-mt-text-secondary">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-mt-yellow text-mt-yellow" />
                        {item.rating.toFixed(1)}
                      </span>
                      <span>月售{item.sales_count}</span>
                      <span className="mt-tag-green text-[9px]">
                        匹配{(item.match_score * 100).toFixed(0)}%
                      </span>
                      {item.channel === 'ping_hao_fan' && (
                        <span className="rounded bg-orange-50 px-1 text-[9px] text-mt-orange">
                          拼好饭
                        </span>
                      )}
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
                        {quantity > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(item.product_id, -1)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-mt-border bg-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center text-sm font-medium">
                              {quantity}
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
              );
            })
          )}
        </div>
      </div>

      {/* 底部购物车栏 */}
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
                      还差 ¥{(minOrder - subtotal).toFixed(2)} 起送
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-white/50">未选购菜品</p>
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

export default TakeoutStorePage;
