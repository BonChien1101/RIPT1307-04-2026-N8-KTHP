import { defineConfig } from 'umi';

export default defineConfig({
  layout: {
    siderWidth: 256,
    locale: true,
  },
  locale: {
    default: 'vi-VN',
    antd: true,
    baseNavigator: true,
  },
  antd: {},
  dva: {
    hmr: true,
  },
  esbuild: {},
  define: {
    'process.env.REACT_APP_ENV': process.env.REACT_APP_ENV,
    'process.env.UMI_ENV': process.env.UMI_ENV || 'dev',
    'process.env.API_URL': 'http://localhost:5000', // URL của backend
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
      component: './Login',
      layout: false,
    },
    {
      path: '/student',
      name: 'Sinh viên',
      component: './Student', 
      access: 'canStudent',
    },
    {
      path: '/admin',
      name: 'Quản trị viên',
      component: './Admin', 
      access: 'canAdmin',
    },
  ],
  devServer: {
    port: 8000,
  },
});