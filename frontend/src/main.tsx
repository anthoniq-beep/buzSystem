import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { droneTheme } from './theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider 
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        ...droneTheme,
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
  </StrictMode>
);
