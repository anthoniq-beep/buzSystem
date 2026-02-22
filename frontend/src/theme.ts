import type { ThemeConfig } from 'antd';

export const droneTheme: ThemeConfig = {
  token: {
    colorPrimary: '#00D1FF', // 科技蓝
    colorBgBase: '#0A192F', // 深空蓝背景
    colorBgContainer: '#112240', // 容器背景
    colorText: '#E6F1FF', // 浅蓝白文字
    colorTextSecondary: '#8892B0', // 次要文字
    colorBorder: '#1E3A5F', // 边框颜色
    borderRadius: 2, // 硬朗风格
    fontFamily: "'Rajdhani', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: '#0A192F',
      siderBg: '#112240',
    },
    Menu: {
      itemBg: '#112240',
      itemColor: '#8892B0',
      itemSelectedColor: '#00D1FF',
      itemSelectedBg: 'rgba(0, 209, 255, 0.1)',
    },
    Card: {
      colorBgContainer: '#112240',
      colorBorderSecondary: '#233554',
    },
    Table: {
      colorBgContainer: '#112240',
      headerBg: '#1E3A5F',
      headerColor: '#00D1FF',
      rowHoverBg: '#1E3A5F',
      borderColor: '#233554',
    },
    Button: {
      primaryColor: '#0A192F',
      defaultBorderColor: '#00D1FF',
      defaultColor: '#00D1FF',
      defaultBg: 'transparent',
    },
    Input: {
      colorBgContainer: '#0A192F',
      colorBorder: '#233554',
      activeBorderColor: '#00D1FF',
    },
    Modal: {
      contentBg: '#112240',
      headerBg: '#112240',
    },
  },
};
