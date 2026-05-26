import React from 'react';
import 'antd/dist/antd.css';
import './styles/global.less';
import { ThemeProvider } from './context/ThemeContext';

export default function RootApp({ children }: { children?: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
