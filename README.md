<p align="center">
  <img src="./assets/readme-hero.png" alt="PhotoFrame Pro 专业的图片批量处理工具" width="100%" />
</p>

<h1 align="center">PhotoFrame Pro</h1>

<p align="center">
  面向摄影师、内容创作者和电商运营的跨平台桌面图片批处理工具。
</p>

<p align="center">
  <strong>macOS / Windows</strong> · <strong>Electron</strong> · <strong>TypeScript</strong> · <strong>本地图片处理</strong>
</p>

PhotoFrame Pro 是一款面向摄影师、内容创作者和电商运营的桌面图片批处理工具。它会按照片原始比例生成带边框和参数信息的成片，支持高斯模糊背景、白边相纸、底部信息栏三种模板，并可批量导出 JPG、PNG 或 WEBP。

## 功能

- 图片拖拽导入、文件选择导入、文件夹批量导入
- 按原图比例输出，保留照片真实像素尺寸
- 高斯模糊背景、纯色背景、渐变背景
- 主体图片自动缩放居中，支持边框、圆角和阴影
- 根据 EXIF 自动适配 Nikon、Sony、Canon、Fujifilm、Leica 等相机品牌 Logo
- 文件大小、修改时间、相机、镜头、快门、光圈、ISO 等信息读取和展示
- 内置高斯模糊、通用底部边框、通用白色边框三套模板
- 批量导出 JPG、PNG、WEBP，支持质量和命名规则设置

## 技术栈

- Electron
- React
- TypeScript
- Vite
- Zustand
- exifr
- Sharp

图片处理在本地完成，不需要上传到服务器。

## 开发

```bash
npm install
npm run electron:dev
```

只调试前端界面时可以使用：

```bash
npm run dev
```

## 构建

```bash
npm run build
```

生成桌面应用目录：

```bash
npm run package
```

## 使用流程

1. 导入单张图片或整个图片文件夹。
2. 选择高斯模糊、底部边框或白色边框模板。
3. 按需要调整背景、边框、阴影、相机 Logo 和 EXIF 文案。
4. 选择输出目录、格式、质量和命名规则。
5. 点击「开始批量导出」。

## 验收范围

当前版本覆盖 MVP 所需的核心链路：

- 导入 20 张以上图片
- 按原图比例生成高斯模糊背景
- 显示文件信息和 EXIF
- 自动匹配相机品牌 Logo
- 批量导出 JPG
- 导出尺寸与预览设置一致

## 许可证

暂未指定许可证。
