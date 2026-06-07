  import { defineConfig } from 'umi';

  export default defineConfig({
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
      'process.env.API_URL': process.env.API_URL || 'http://localhost:5000',
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
          target: 'https://ript1307-04-2026-n8-kthp.onrender.com',
          changeOrigin: true,
        },
      },
    },
    history: { type: 'hash' },
    outputPath: 'dist',
  });