import { Link, useLocation } from 'react-router-dom';
import { bottomNavItems } from '../nav-items';

const DesktopNav = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="mb-4 hidden gap-1 rounded-xl bg-white p-1 shadow-sm md:flex">
      {bottomNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-mt-yellow text-mt-text'
                : 'text-mt-text-secondary hover:bg-mt-gray-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default DesktopNav;
