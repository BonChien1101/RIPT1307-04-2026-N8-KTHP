import React from 'react';
import { history } from 'umi';
import { Avatar, Button, Space, Tag, Typography } from 'antd';
import { CrownOutlined, BookOutlined, LoginOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import 'antd/dist/antd.css';
import './styles/global.less';
import { ThemeProvider } from './context/ThemeContext';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const getRoleMeta = (role?: string) => {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'student') {
    return { label: 'Sinh viên', icon: <BookOutlined />, color: 'blue', path: '/student' };
  }
  if (normalized) {
    return { label: 'Quản trị viên', icon: <CrownOutlined />, color: 'gold', path: '/admin' };
  }
  return { label: 'Khách', icon: <LoginOutlined />, color: 'default', path: '/' };
};

const getTargetPath = (role?: string) => getRoleMeta(role).path;

const getActivePath = () => {
  if (typeof window === 'undefined') return '/';
  const hashPath = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
  if (hashPath.startsWith('/')) return hashPath;
  return window.location.pathname || '/';
};

const normalizeMenuPath = (item: any) => item?.path || item?.key || '';

const filterMenuByRole = (menuData: any[], role?: string) => {
  const targetPath = getTargetPath(role);
  const visibleMenu = menuData.filter((item) => normalizeMenuPath(item) === targetPath);
  return visibleMenu.map((item) => ({ ...item, hideChildrenInMenu: true }));
};

export async function getInitialState() {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr && userStr !== 'undefined' && userStr !== 'null') {
      const user = JSON.parse(userStr);
      if (user && typeof user === 'object') {
        return { user, token };
      }
    }
  } catch (error) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    console.error('getInitialState error:', error);
  }
  return undefined;
}

export function layout({ initialState }: any) {
  const user = initialState?.user || getStoredUser();
  const roleMeta = getRoleMeta(user?.role);
  const isAuthed = !!initialState?.token || !!user;
  const pathname = getActivePath();
  const isRolePage = pathname === '/admin' || pathname === '/student';

  return {
    title: 'BorrowX',
    navTheme: 'light',
    layout: 'side',
    contentWidth: 'Fluid',
    fixSiderbar: true,
    splitMenus: false,
    colorWeak: false,
    menuDataRender: (menuData: any[]) => {
      const normalizedMenu = Array.isArray(menuData) ? menuData : [];
      if (isRolePage) {
        return [];
      }

      if (!isAuthed) {
        return normalizedMenu
          .filter((item) => normalizeMenuPath(item) === '/')
          .map((item) => ({ ...item, hideChildrenInMenu: true }));
      }

      return filterMenuByRole(normalizedMenu, user?.role);
    },
    menuRender: isRolePage ? () => null : undefined,
    headerRender: !isRolePage,
    rightContentRender: isRolePage ? undefined : () => (
      <Space size={12} className="borrowx-layout-user">
        <Tag color={roleMeta.color} className="borrowx-layout-role-tag">
          {roleMeta.icon}
          <span>{roleMeta.label}</span>
        </Tag>
        <div className="borrowx-layout-user__profile">
          <Avatar icon={<UserOutlined />} />
          <div>
            <strong>{user?.full_name || user?.name || 'Người dùng'}</strong>
            <span>{user?.email || 'Tài khoản đang đăng nhập'}</span>
          </div>
        </div>
        {isAuthed ? (
          <Button
            type="primary"
            ghost
            icon={<LogoutOutlined />}
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              history.push('/');
              window.location.reload();
            }}
          >
            Đăng xuất
          </Button>
        ) : null}
      </Space>
    ),
    menuHeaderRender: () => (
      <div className="borrowx-layout-brand">
        <div className="borrowx-layout-brand__logo">
          <span>BX</span>
        </div>
        <div className="borrowx-layout-brand__text">
          <strong>BorrowX</strong>
          <span>Thiết bị, quyền truy cập và trải nghiệm rõ ràng theo vai trò</span>
        </div>
      </div>
    ),
    onPageChange: () => {
      const pathname = getActivePath();
      const targetPath = getTargetPath(user?.role);

      if (!isAuthed) {
        if (pathname !== '/') history.push('/');
        return;
      }

      if (pathname === '/' || pathname === '/login') {
        history.push(targetPath);
        return;
      }

      if (pathname === '/student' && roleMeta.path === '/admin') {
        history.push('/admin');
        return;
      }

      if (pathname === '/admin' && roleMeta.path === '/student') {
        history.push('/student');
      }
    },
  };
}

export function rootContainer(container: any) {
  return <ThemeProvider>{container}</ThemeProvider>;
}