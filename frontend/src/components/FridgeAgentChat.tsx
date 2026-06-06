import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  ChefHat,
  Loader2,
  Refrigerator,
  Send,
  ShoppingCart,
  Sparkles,
  Ticket,
  Zap,
} from 'lucide-react';
import Button from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { chatWithFridgeAgentStream } from '../api/agent';
import { useFridgeAgentStatus } from '../hooks/queries/useAgentQueries';
import type {
  FridgeAgentCartItem,
  FridgeAgentChatResponse,
  FridgeAgentHistoryItem,
} from '../types/api';

const QUICK_PROMPTS = [
  '明天露营，帮我准备烧烤',
  '周末家人们来吃火锅',
  '野餐便当，3人份',
  '看看冰箱里还能做什么',
];

const TOOL_STATUS_LABELS: Record<string, string> = {
  get_fridge_inventory: '正在查看冰箱库存…',
  analyze_scenario: '正在分析场景缺口…',
  recommend_scenario_recipes: '正在推荐场景菜谱…',
  generate_flash_cart: '正在生成闪购购物车…',
};

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured?: FridgeAgentChatResponse['structured'];
}

const agentCartToSession = (items: FridgeAgentCartItem[]) =>
  items.map((item) => ({
    product_id: item.sku_id,
    ingredient_id: item.ingredient_id,
    name: item.sku_name,
    price: Number(item.price),
    original_price: Number(item.price) * 1.12,
    unit: item.unit,
    spec: item.spec || `${item.quantity}${item.unit}`,
    image_url: `https://photo.bj.ide.test.sankuai.com/?keyword=${encodeURIComponent(item.ingredient_name)}&width=200&height=200`,
    source: 'meituan',
    category: 'other',
    rating: Number(item.rating ?? 4.5),
    sales_count: 1200,
    match_score: 0.92,
    quantity: 1,
  }));

const FridgeAgentChat = ({ displayName }: { displayName?: string }) => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { data: agentStatus } = useFridgeAgentStatus();

  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isConfigured = agentStatus?.configured ?? false;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, isStreaming, toolStatus]);

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !userId || isStreaming) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const assistantId = `assistant-${Date.now()}`;
    const history: FridgeAgentHistoryItem[] = turns.map(({ role, content }) => ({
      role,
      content,
    }));

    setTurns((prev) => [
      ...prev,
      userTurn,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setIsStreaming(true);
    setToolStatus('正在理解你的需求…');

    try {
      const result = await chatWithFridgeAgentStream(
        {
          user_id: userId,
          message: trimmed,
          history,
        },
        {
          onDelta: (delta) => {
            setToolStatus(null);
            setTurns((prev) =>
              prev.map((turn) =>
                turn.id === assistantId ? { ...turn, content: turn.content + delta } : turn
              )
            );
          },
          onTool: (toolName) => {
            setToolStatus(TOOL_STATUS_LABELS[toolName] ?? '正在处理…');
          },
        }
      );

      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === assistantId
            ? {
                ...turn,
                structured: result.structured,
              }
            : turn
        )
      );
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'AI 服务暂时不可用';
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === assistantId
            ? {
                ...turn,
                content: turn.content ? `${turn.content}\n\n⚠️ ${errorText}` : `⚠️ ${errorText}`,
              }
            : turn
        )
      );
    } finally {
      setIsStreaming(false);
      setToolStatus(null);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleAddToCart = (structured: NonNullable<FridgeAgentChatResponse['structured']>) => {
    if (!structured.flash_cart?.length) return;
    const cartItems = agentCartToSession(structured.flash_cart);
    sessionStorage.setItem('orderCart', JSON.stringify(cartItems));
    if (structured.price_estimate) {
      sessionStorage.setItem(
        'selectedPurchasePlan',
        JSON.stringify({
          planType: 'standard',
          plan: {
            plan_type: 'standard',
            plan_name: `${structured.scenario_label || '场景'}闪购方案`,
            items: structured.flash_cart,
            total_price: structured.price_estimate.total_price,
            final_price: structured.price_estimate.final_price,
            coupon_discount: structured.price_estimate.coupon_discount,
            matched_coupons: structured.price_estimate.matched_coupons,
          },
          userId,
          source: 'fridge_agent',
        })
      );
    }
    navigate('/purchase/products');
  };

  const latestStructured = [...turns].reverse().find((t) => t.structured)?.structured;

  return (
    <div className="home-card overflow-hidden">
      <div className="border-b border-mt-border/40 bg-mt-yellow/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-mt-yellow shadow-sm">
            <Sparkles className="h-4 w-4 text-mt-text" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-mt-text">云冰箱 AI Agent</h2>
            <p className="text-[10px] text-mt-text-secondary">
              一句话规划场景，直链冰箱·闪购·外卖等美团服务
            </p>
            <p className="mt-0.5 text-[9px] text-mt-text-muted">
              场景规划入口 · 非菜谱问答 · 说完即可跳转下单
            </p>
          </div>
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-mt-orange shadow-sm">
            DeepSeek
          </span>
        </div>
      </div>

      {!isStreaming && turns.length === 0 && (
        <div className="border-b border-mt-border/30 px-4 py-3">
          <p className="mb-1 text-base font-bold text-mt-text">
            {displayName ? `${displayName}，说出一个场景` : '说出一个场景'}
          </p>
          <p className="mb-2 text-[10px] text-mt-text-secondary">
            我会查库存、配方案，并带你直达闪购或菜谱页面
          </p>
          <div className="flex items-center gap-1 text-[9px] text-mt-text-muted">
            <span className="rounded-full bg-white px-1.5 py-0.5 ring-1 ring-mt-border/40">冰箱库存</span>
            <span>→</span>
            <span className="rounded-full bg-white px-1.5 py-0.5 ring-1 ring-mt-border/40">场景方案</span>
            <span>→</span>
            <span className="rounded-full bg-white px-1.5 py-0.5 ring-1 ring-mt-border/40">美团服务</span>
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        {!isConfigured && (
          <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            请在 <code className="rounded bg-white/80 px-1">backend/.env</code> 配置{' '}
            <code className="rounded bg-white/80 px-1">DEEPSEEK_API_KEY</code> 后重启后端
          </div>
        )}

        <p className="mb-2 text-[10px] text-mt-text-secondary">
          用一句话描述场景，Agent 会串联库存、闪购购物车与美团下单页
        </p>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="一句话说清场景，如：明天露营，帮我准备烧烤"
            disabled={!isConfigured || isStreaming || !userId}
            className="mt-input w-full rounded-2xl pr-12 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!isConfigured || !input.trim() || isStreaming || !userId}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-mt-yellow text-mt-text disabled:opacity-40"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        <p className="mt-2 text-[9px] text-mt-text-muted">场景示例 · 点选即开始规划并连接服务</p>
        <div className="scrollbar-hide mt-1 flex gap-2 overflow-x-auto">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={!isConfigured || isStreaming || !userId}
              className="shrink-0 rounded-full border border-mt-border bg-white px-3 py-1 text-[11px] text-mt-text-secondary disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {(isStreaming || turns.length > 0) && (
        <div className="border-t border-mt-border/40 bg-[#fafafa] px-4 py-3">
          {isStreaming && toolStatus && (
            <div className="mb-3 flex items-center gap-2 text-sm text-mt-text-secondary">
              <Refrigerator className="h-4 w-4 animate-pulse text-emerald-500" />
              {toolStatus}
            </div>
          )}

          <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto">
            {turns.map((turn) => (
              <div key={turn.id}>
                <div
                  className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      turn.role === 'user'
                        ? 'rounded-br-md bg-mt-yellow text-mt-text shadow-sm'
                        : 'rounded-bl-md bg-white text-mt-text shadow-sm ring-1 ring-mt-border/50'
                    }`}
                  >
                    {turn.role === 'assistant' && (
                      <Bot className="mb-1 inline h-3.5 w-3.5 text-indigo-500" />
                    )}{' '}
                    {turn.content ||
                      (isStreaming && turn.role === 'assistant' ? (
                        <span className="inline-block h-4 w-0.5 animate-pulse bg-indigo-400" />
                      ) : null)}
                  </div>
                </div>

                {turn.structured && (
                  <div className="mt-2 space-y-2 rounded-xl border border-mt-border/50 bg-white p-3">
                    {turn.structured.scenario_label && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-mt-orange" />
                        <span className="text-sm font-semibold text-mt-text">
                          {turn.structured.scenario_label}
                        </span>
                        {turn.structured.coverage_summary && (
                          <span className="text-xs text-mt-text-muted">
                            · {turn.structured.coverage_summary}
                          </span>
                        )}
                      </div>
                    )}

                    {(turn.structured.in_stock.length > 0 ||
                      turn.structured.missing.length > 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-emerald-50 p-2">
                          <p className="mb-1 text-[10px] font-medium text-emerald-700">
                            冰箱已有
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {turn.structured.in_stock.length > 0 ? (
                              turn.structured.in_stock.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full bg-white px-2 py-0.5 text-[10px] text-emerald-700"
                                >
                                  {item}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-emerald-600">暂无匹配</span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg bg-orange-50 p-2">
                          <p className="mb-1 text-[10px] font-medium text-mt-orange">需要闪购</p>
                          <div className="flex flex-wrap gap-1">
                            {turn.structured.missing.length > 0 ? (
                              turn.structured.missing.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full bg-white px-2 py-0.5 text-[10px] text-mt-orange"
                                >
                                  {item}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-mt-orange">库存充足</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {turn.structured.recipes.length > 0 && (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-mt-text">
                          <ChefHat className="h-3.5 w-3.5" />
                          场景菜谱
                        </p>
                        <div className="space-y-1.5">
                          {turn.structured.recipes.map((recipe) => (
                            <Link
                              key={recipe.recipe_id}
                              to={`/recipes/${recipe.recipe_id}`}
                              className="flex items-center justify-between rounded-lg bg-mt-gray-50 px-2.5 py-2 text-xs active:bg-mt-gray-100"
                            >
                              <span className="font-medium text-mt-text">{recipe.recipe_name}</span>
                              <span className="text-mt-text-muted">
                                匹配 {(recipe.match_score * 100).toFixed(0)}%
                                {recipe.missing_ingredients_count > 0
                                  ? ` · 缺${recipe.missing_ingredients_count}样`
                                  : ' · 食材齐'}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {turn.structured.flash_cart.length > 0 && (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-mt-text">
                          <ShoppingCart className="h-3.5 w-3.5" />
                          闪购购物车
                        </p>
                        <div className="space-y-1">
                          {turn.structured.flash_cart.map((item) => (
                            <div
                              key={item.sku_id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="truncate text-mt-text-secondary">
                                {item.sku_name}
                              </span>
                              <span className="shrink-0 font-medium text-mt-text">
                                ¥{Number(item.price).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {turn.structured.price_estimate && (
                      <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-red-50 to-orange-50 px-3 py-2">
                        <div>
                          <p className="text-xs text-mt-text-secondary">预估到手价</p>
                          <p className="text-lg font-bold text-mt-red">
                            ¥{Number(turn.structured.price_estimate.final_price).toFixed(2)}
                          </p>
                          {turn.structured.price_estimate.savings_label && (
                            <p className="flex items-center gap-1 text-[10px] text-mt-orange">
                              <Ticket className="h-3 w-3" />
                              {turn.structured.price_estimate.savings_label}
                            </p>
                          )}
                        </div>
                        {turn.structured.flash_cart.length > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(turn.structured!)}
                            className="shrink-0"
                          >
                            一键加购
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {latestStructured?.redirect_label && !isStreaming && (
        <div className="border-t border-mt-border/40 px-4 py-2 text-center text-[10px] text-mt-text-muted">
          配送渠道：{latestStructured.redirect_label}
        </div>
      )}
    </div>
  );
};

export default FridgeAgentChat;
