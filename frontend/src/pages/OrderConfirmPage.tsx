import { useMemo, useState } from 'react';
import { Minus, Plus, Trash2, MapPin, Clock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/queries/usePurchaseQueries';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import PageHeader from '../components/ui/PageHeader';
import type { ProductItem } from '../types/api';

type CartItem = ProductItem & { quantity?: number };

const OrderConfirmPage = () => {
  const { userId } = useAuth();
  const createOrderMutation = useCreateOrder();

  const initialCart = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('orderCart') || '[]') as CartItem[];
    } catch {
      return [];
    }
  }, []);

  const [cartItems, setCartItems] = useState<CartItem[]>(initialCart);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    initialCart.reduce<Record<string, number>>((acc, item) => {
      acc[item.product_id] = item.quantity || 1;
      return acc;
    }, {})
  );

  const deliveryInfo = {
    address: '北京市朝阳区望京街道xxx小区',
    phone: '138****8888',
    estimatedTime: '30-45分钟',
    fee: 3.0,
  };

  const handleQuantityChange = (id: string, change: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + change),
    }));
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.product_id !== id));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * (quantities[item.product_id] || 1),
    0
  );
  const total = subtotal + deliveryInfo.fee;

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      alert('购物车为空');
      return;
    }
    if (!userId) return;
    try {
      const result = await createOrderMutation.mutateAsync({
        products: cartItems.map((item) => ({ ...item })),
        user_id: userId,
      });
      sessionStorage.removeItem('orderCart');
      alert(`订单提交成功！\n订单号: ${result.order_id}`);
    } catch (err) {
      console.error('提交订单失败:', err);
      alert('提交失败，请稍后重试');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="mb-4 text-mt-text-secondary">购物车是空的</p>
        <Link to="/purchase/products">
          <Button>去选购</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 pb-24">
      <PageHeader title="确认订单" backTo="/purchase/products" />

      <MeituanCard className="!p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-mt-border p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mt-yellow-light">
            <MapPin className="h-5 w-5 text-mt-orange" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-mt-text">{deliveryInfo.address}</p>
            <p className="text-xs text-mt-text-secondary">
              {deliveryInfo.phone} · 预计 {deliveryInfo.estimatedTime}
            </p>
          </div>
        </div>
      </MeituanCard>

      <MeituanCard>
        <h3 className="mb-3 font-bold text-mt-text">商品清单</h3>
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.product_id} className="flex items-center gap-3">
              <img
                src={
                  item.image_url ||
                  'https://photo.bj.ide.test.sankuai.com/?keyword=food&width=80&height=80'
                }
                alt={item.name}
                className="h-14 w-14 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-mt-text">{item.name}</p>
                <p className="mt-price text-base">
                  ¥{Number(item.price).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-mt-gray-100 px-1">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(item.product_id, -1)}
                  disabled={(quantities[item.product_id] || 1) <= 1}
                  className="rounded-full p-1 disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-medium">
                  {quantities[item.product_id] || 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(item.product_id, 1)}
                  className="rounded-full p-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveItem(item.product_id)}
                className="p-1 text-mt-red"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </MeituanCard>

      <MeituanCard>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-mt-text-secondary">
            <span>商品小计</span>
            <span>¥{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-mt-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              配送费
            </span>
            <span>¥{deliveryInfo.fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-mt-border pt-2 text-base font-bold">
            <span>合计</span>
            <span className="mt-price text-lg">¥{total.toFixed(2)}</span>
          </div>
        </div>
      </MeituanCard>

      <MeituanCard className="!p-3">
        <div className="flex items-center gap-2 text-xs text-mt-text-muted">
          <Shield className="h-4 w-4" />
          美团支付保障 · 支持微信/支付宝
        </div>
      </MeituanCard>

      {/* 底部固定结算栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-mt-border bg-white p-4 safe-bottom md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-mt-text-secondary">实付</p>
            <p className="mt-price text-xl">¥{total.toFixed(2)}</p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1 max-w-xs"
            onClick={handleSubmitOrder}
            disabled={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? '提交中...' : '提交订单'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmPage;
