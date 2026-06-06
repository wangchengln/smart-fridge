import { Outlet } from 'react-router-dom';
import TopHeader from './TopHeader';
import BottomTabBar from './BottomTabBar';
import DesktopNav from './DesktopNav';

const Layout = () => {
  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <TopHeader />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-3 md:pb-8">
        <DesktopNav />
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
};

export default Layout;
