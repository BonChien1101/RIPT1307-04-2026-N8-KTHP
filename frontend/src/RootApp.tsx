import React, { useEffect } from 'react';
import 'antd/dist/antd.css';
import './styles/global.less';
import { ThemeProvider } from './context/ThemeContext';

export default function RootApp({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    // Listen for user update events and reload to reflect changes in header
    const handleUserUpdate = () => {
      // Re-evaluate initialState by reloading
      window.location.reload();
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
}
