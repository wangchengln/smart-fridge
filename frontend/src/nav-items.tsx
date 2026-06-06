import { Home, Package, Camera, BookOpen, User, type LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

/** 底部 Tab 导航（美团 App 风格，5 个主入口） */
export const bottomNavItems: NavItem[] = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/ingredients', icon: Package, label: '冰箱' },
  { path: '/camera', icon: Camera, label: '识别' },
  { path: '/recipes', icon: BookOpen, label: '菜谱' },
  { path: '/profile', icon: User, label: '我的' },
];

/** @deprecated 使用 bottomNavItems */
export const primaryNavItems = bottomNavItems;

export default bottomNavItems;
