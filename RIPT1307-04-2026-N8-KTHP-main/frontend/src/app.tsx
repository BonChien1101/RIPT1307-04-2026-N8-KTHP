import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'umi';
import 'antd/dist/reset.css';

export async function getInitialState() {
  // Get user from localStorage
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return {
        user,
        token,
      };
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  return undefined;
}

export const layout = () => {
  return {
    logo: '📦',
    name: 'Quản Lý Mượn Đồ Dùng',
    locale: true,
    layout: 'side',
  };
};

const App: React.FC = () => {
  return null;
};