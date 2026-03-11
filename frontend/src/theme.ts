import type { ThemeConfig } from 'antd';

export const darkTheme: ThemeConfig = {
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

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#5B7CFA', // 参考图2中的紫色/蓝色风格
    colorBgBase: '#f5f7fa', // 柔和的灰蓝背景
    colorBgContainer: '#ffffff', // 纯白容器
    colorText: '#2C3E50', // 深蓝灰文字，比纯黑更柔和
    colorTextSecondary: '#7F8C8D', // 次要文字
    colorBorder: '#E5E7EB', // 浅色边框
    borderRadius: 8, // 更圆润的角，符合现代UI
    fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', // 增加默认阴影感
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#2C3E50', // 深色侧边栏，参考图1
      bodyBg: '#f5f7fa',
    },
    Menu: {
      // 侧边栏菜单深色配置
      itemBg: '#2C3E50',
      itemColor: '#BDC3C7',
      itemSelectedColor: '#ffffff',
      itemSelectedBg: '#5B7CFA', // 选中项紫色背景
      itemHoverBg: 'rgba(255, 255, 255, 0.1)',
      
      // 顶部菜单或下拉菜单浅色配置 (Antd Menu组件无法同时支持两套，需要在Layout中覆盖)
      // 这里主要为Sider服务
    },
    Card: {
      colorBgContainer: '#ffffff',
      headerFontSize: 16,
      headerFontWeight: 600,
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
    },
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#F8FAFC', // 表头浅灰
      headerColor: '#64748B', // 表头文字灰
      headerSplitColor: 'transparent', // 去掉分割线
      rowHoverBg: '#F1F5F9',
      borderColor: '#E2E8F0',
      borderRadiusLG: 8,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 36, // 稍微高一点的按钮
      primaryShadow: '0 4px 10px rgba(91, 124, 250, 0.3)', // 主按钮阴影
    },
    Input: {
       colorBgContainer: '#ffffff',
       controlHeight: 36,
       borderRadius: 6,
       activeBorderColor: '#5B7CFA',
       hoverBorderColor: '#5B7CFA',
    },
    Select: {
        controlHeight: 36,
        borderRadius: 6,
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      borderRadiusLG: 12,
    },
    Tag: {
        borderRadiusSM: 4,
    }
  },
};
