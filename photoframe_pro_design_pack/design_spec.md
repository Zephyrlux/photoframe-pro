# PhotoFrame Pro 设计规范

## 1. 产品定位

PhotoFrame Pro 是一款桌面端图片批处理工具，用于快速生成摄影发布图、商品展示图、自媒体封面图。

核心体验：

- 拖入图片
- 选择模板
- 实时预览
- 批量导出

---

## 2. 设计风格

整体风格：现代、专业、深色、偏 macOS 桌面软件质感。

关键词：

- Dark UI
- Glass Panel
- Blue Accent
- Professional Photo Tool
- Batch Workflow

---

## 3. 页面结构

主界面采用三栏布局：

```text
┌──────────────────────────────────────────────┐
│ 顶部标题栏 / 工具栏                           │
├──────────────┬────────────────┬──────────────┤
│ 图片列表区    │ 图片预览区       │ 参数设置区    │
├──────────────┴────────────────┴──────────────┤
│ 底部导出设置区                                │
└──────────────────────────────────────────────┘
```

### 3.1 左侧图片区

功能：

- 导入图片
- 导入文件夹
- 展示图片列表
- 展示文件名
- 展示图片尺寸
- 当前选中状态
- 图片处理完成状态

### 3.2 中间预览区

功能：

- 展示最终效果
- 支持缩放
- 支持全屏预览
- 支持多图缩略预览
- 显示输出尺寸

### 3.3 右侧参数区

功能模块：

- 输出比例
- 背景设置
- 主体设置
- 水印 Logo
- EXIF 信息
- 模板设置

### 3.4 底部导出区

功能：

- 导出格式
- JPG 质量
- 输出目录
- 文件命名规则
- 开始批量导出

---

## 4. 色彩规范

### 4.1 主色

| 名称 | 色值 | 用途 |
|---|---|---|
| Primary Blue | `#1677FF` | 主按钮、选中状态、滑块 |
| Primary Blue Hover | `#4096FF` | Hover 状态 |
| Success Green | `#35C759` | 完成状态 |
| Warning Orange | `#FF9500` | 警告 |
| Danger Red | `#FF4D4F` | 删除、错误 |

### 4.2 背景色

| 名称 | 色值 | 用途 |
|---|---|---|
| App Background | `#0F1115` | 应用主背景 |
| Panel Background | `#171A21` | 左右面板 |
| Card Background | `#20242D` | 图片卡片、控件 |
| Input Background | `#242933` | 输入框、选择框 |
| Border Color | `#303642` | 分割线、边框 |

### 4.3 文字色

| 名称 | 色值 | 用途 |
|---|---|---|
| Text Primary | `#F5F7FA` | 主要文字 |
| Text Secondary | `#A8B0BD` | 次级文字 |
| Text Muted | `#6F7785` | 弱提示 |
| Text Disabled | `#4D5562` | 禁用状态 |

---

## 5. 字体规范

推荐字体：

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
```

| 类型 | 字号 | 字重 | 用途 |
|---|---:|---:|---|
| Page Title | 18px | 600 | 应用标题 |
| Section Title | 15px | 600 | 模块标题 |
| Body | 14px | 400 | 普通内容 |
| Small | 12px | 400 | 图片尺寸、说明 |
| Button | 14px | 500 | 按钮 |

---

## 6. 间距规范

基础间距单位：`4px`

| Token | 数值 |
|---|---:|
| `space-xs` | 4px |
| `space-sm` | 8px |
| `space-md` | 12px |
| `space-lg` | 16px |
| `space-xl` | 24px |
| `space-2xl` | 32px |

---

## 7. 圆角规范

| Token | 数值 | 用途 |
|---|---:|---|
| `radius-sm` | 6px | 小按钮、标签 |
| `radius-md` | 8px | 输入框、普通卡片 |
| `radius-lg` | 12px | 图片卡片、预览图 |
| `radius-xl` | 16px | 大容器 |

---

## 8. 组件规范

### 8.1 主按钮

```css
height: 44px;
border-radius: 8px;
background: #1677FF;
color: #FFFFFF;
font-size: 14px;
font-weight: 500;
```

状态：

- Default：`#1677FF`
- Hover：`#4096FF`
- Disabled：`#303642`

### 8.2 图片列表卡片

默认：

```css
background: #20242D;
border: 1px solid transparent;
border-radius: 8px;
```

选中：

```css
border-color: #1677FF;
box-shadow: 0 0 0 1px rgba(22,119,255,.3);
```

### 8.3 参数滑块

- 轨道色：`#303642`
- 激活色：`#1677FF`
- 圆点色：`#A9C7FF`

### 8.4 比例选择卡片

选中状态：

```css
border: 1px solid #1677FF;
background: rgba(22,119,255,.12);
color: #4096FF;
```

---

## 9. Logo 规范

### 9.1 Logo 组成

Logo 由两部分组成：

- 相机图标
- PhotoFrame Pro 文字

### 9.2 主 Logo 使用场景

- 应用顶部栏
- 官网首页
- 安装包图标说明

### 9.3 图标版使用场景

- Dock 图标
- Windows 应用图标
- 小尺寸按钮

### 9.4 安全距离

Logo 四周至少保留图标高度的 `0.5x` 空白。

---

## 10. 交互动效

推荐：

- 按钮 hover：150ms
- 面板展开：200ms
- 预览刷新：300ms fade
- 批量导出进度：linear progress

---

## 11. 响应式规则

最小窗口尺寸：

```text
1280 × 800
```

推荐窗口尺寸：

```text
1440 × 900
```

布局宽度：

| 区域 | 宽度 |
|---|---:|
| 左侧图片区 | 300px |
| 右侧设置区 | 380px |
| 中间预览区 | 自适应 |
| 底部导出区 | 80px |

---

## 12. 设计图

设计图文件：

```text
assets/ui_mockup_dark.png
```
