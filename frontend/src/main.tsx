import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { droneTheme } from './theme';

const AppContent = () => {
  const { isDarkMode } = useTheme();
  
  // Apply theme class to body for global styles
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.style.backgroundColor = '#0A192F';
      document.body.style.color = '#E6F1FF';
    } else {
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundColor = '#f5f7fb';
      document.body.style.color = '#1f1f1f';
    }
  }, [isDarkMode]);

  const lightTheme = {
    token: {
      colorPrimary: '#1677ff',
      colorBgBase: '#f5f7fb',
      colorBgContainer: '#ffffff',
      colorText: '#1f1f1f',
      colorTextSecondary: '#595959',
      colorBorder: '#d9d9d9',
      borderRadius: 8,
    },
    components: {
      Layout: {
        headerBg: '#ffffff',
        siderBg: '#ffffff',
      },
      Menu: {
        itemBg: '#ffffff',
        itemColor: '#1f1f1f',
        itemSelectedColor: '#1677ff',
        itemSelectedBg: '#e6f4ff',
      },
    },
  };
  
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        ...(isDarkMode ? droneTheme : lightTheme),
      }}
    >
      <AntdApp>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  </StrictMode>
);
