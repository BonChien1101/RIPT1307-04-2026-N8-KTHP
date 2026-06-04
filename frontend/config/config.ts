import { defineConfig } from 'umi';

export default defineConfig({
  title: 'BorrowX',
  layout: {
    siderWidth: 256,
    locale: true,
  },
  locale: {
    default: 'vi-VN',
    antd: true,
    baseNavigator: false,
  },
  antd: {},
  dva: {
    hmr: true,
  },
  esbuild: {},
  define: {
    'process.env.REACT_APP_ENV': process.env.REACT_APP_ENV,
    'process.env.UMI_ENV': process.env.UMI_ENV || 'dev',
    'process.env.API_URL': process.env.API_URL || 'https://ript1307-04-2026-n8-kthp.onrender.com',
  },
  ignoreMomentLocale: true,
  dynamicImport: {
    loading: '@ant-design/pro-layout/es/PageLoading',
  },
  targets: {
    ie: 11,
  },
  
  history: { type: 'hash' }, 
  outputPath: 'dist',
  routes: [
    {
      path: '/',
      name: 'Đăng nhập',
      icon: 'LoginOutlined',
      component: './Login',
      layout: false,
    },
    {
      path: '/student',
      name: 'Sinh viên',
      icon: 'BookOutlined',
      component: './Student', 
      access: 'canStudent',
    },
    {
      path: '/club-leader',
      name: 'Trưởng CLB',
      icon: 'TeamOutlined',
      component: './ClubLeader',
      layout: false,
    },
    {
      path: '/admin',
      name: 'Quản trị viên',
      icon: 'CrownOutlined',
      component: './Admin', 
      access: 'canAdmin',
    },
  ],
  devServer: {
    port: 8000,
  },
});