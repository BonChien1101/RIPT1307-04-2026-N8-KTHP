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
  },
  ignoreMomentLocale: true,
  dynamicImport: {
    loading: '@ant-design/pro-layout/es/PageLoading',
  },
  targets: {
    ie: 11,
  },
  devServer: {
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  history: { type: 'hash' },
  outputPath: 'dist',
});