import { Link } from 'react-router-dom';
import { ClipboardList, ShoppingCart, User, Zap } from 'lucide-react';

interface TakeoutBottomNavProps {
  onCartClick?: () => void;
}

const TakeoutBottomNav = ({ onCartClick }: TakeoutBottomNavProps) => (
  <>
    <button
      type="button"
      onClick={onCartClick}
      className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-float active:scale-95"
    >
      <ShoppingCart className="h-5 w-5 text-mt-text" />
    </button>

    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-mt-border bg-white safe-bottom">
      <div className="mx-auto flex h-14 max-w-lg items-end justify-around px-2 pb-1">
        <button type="button" className="flex flex-col items-center gap-0.5 text-mt-orange">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mt-yellow text-xs font-bold">
            外
          </span>
          <span className="text-[10px] font-medium">外卖</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-0.5 text-mt-text-muted">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-mt-red">
            神
          </span>
          <span className="text-[10px]">神券</span>
        </button>
        <button
          type="button"
          className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-mt-red text-white shadow-float active:scale-95"
        >
          <Zap className="h-5 w-5" />
        </button>
        <button type="button" className="flex flex-col items-center gap-0.5 text-mt-text-muted">
          <ClipboardList className="h-5 w-5" />
          <span className="text-[10px]">订单</span>
        </button>
        <Link to="/profile" className="flex flex-col items-center gap-0.5 text-mt-text-muted">
          <User className="h-5 w-5" />
          <span className="text-[10px]">我的</span>
        </Link>
      </div>
    </div>
  </>
);

export default TakeoutBottomNav;
