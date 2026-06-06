import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Bell, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const bottomPrimaryPaths = ['/', '/ingredients', '/camera', '/recipes', '/profile', '/purchase/plans'];

const pageTitles: Record<string, string> = {
  '/': '智能云冰箱',
  '/ingredients': '我的冰箱',
  '/camera': '拍照识别',
  '/recipes': '菜谱推荐',
  '/purchase/plans': '补购方案',
  '/purchase/products': '美团闪购',
  '/takeout/merchants': '美团外卖',
  '/takeout/store': '美团外卖',
  '/premade': '买鲜食',
  '/premade/channels': '买鲜食',
  '/purchase/order': '确认订单',
  '/profile': '个人中心',
  '/collection': '我的厨房图鉴',
  '/scenarios': '智能场景购',
};

const TopHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, nickname, logout } = useAuth();

  if (!isAuthenticated || location.pathname === '/login') return null;

  if (
    location.pathname === '/takeout/merchants' ||
    location.pathname === '/premade' ||
    location.pathname === '/premade/channels'
  ) {
    return null;
  }

  const isHome = location.pathname === '/';
  const showBack = !bottomPrimaryPaths.includes(location.pathname);

  const title =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith('/history')
      ? '历史记录'
      : location.pathname.startsWith('/purchase')
        ? '补购'
        : location.pathname.startsWith('/recipes/')
          ? '菜谱详情'
          : '智能云冰箱');

  return (
    <header className="sticky top-0 z-30 mt-gradient-header shadow-sm">
      <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {showBack ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5"
            >
              <ArrowLeft className="h-4 w-4 text-mt-text" />
            </button>
          ) : isHome ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-black text-mt-orange">
              美
            </div>
          ) : null}
          <h1 className="truncate text-base font-bold text-mt-text">{title}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isHome && (
            <Link
              to="/ingredients"
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/60"
            >
              <Bell className="h-4 w-4 text-mt-text" />
            </Link>
          )}
          <span className="hidden max-w-[80px] truncate text-xs text-mt-text-secondary sm:inline">
            {nickname}
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex h-8 items-center gap-1 rounded-full bg-white/60 px-2 text-xs text-mt-text-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">退出</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
