import { Link, useLocation } from 'react-router-dom';
import { bottomNavItems } from '../nav-items';

const BottomTabBar = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const tabBarPaths = ['/', '/ingredients', '/camera', '/recipes', '/profile', '/purchase/plans'];
  if (!tabBarPaths.includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-mt-border bg-white safe-bottom md:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const isCamera = item.path === '/camera';

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-mt-orange' : 'text-mt-text-muted'
              }`}
            >
              {isCamera ? (
                <div
                  className={`flex h-10 w-10 -mt-4 items-center justify-center rounded-full shadow-float ${
                    active ? 'bg-mt-yellow' : 'bg-mt-yellow/90'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-mt-text' : 'text-mt-text'}`} />
                </div>
              ) : (
                <Icon className={`h-5 w-5 ${active ? 'text-mt-orange' : ''}`} strokeWidth={active ? 2.5 : 2} />
              )}
              <span className={`text-[10px] font-medium ${isCamera ? 'mt-0.5' : ''}`}>{item.label}</span>
              {active && !isCamera && (
                <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-mt-yellow" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
