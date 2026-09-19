# 毛线编织图解编辑器 · Knitting Chart Studio

> 类型：前端 Web 应用（含 Canvas 网格编辑器）｜难度：★★★｜建议技术栈：React + TypeScript + Vite + Canvas 2D + Web Worker

## 1. 一句话简介
把「一张十字绣/提花图案」变成可打印的编织图解，并算准总共要买几团线。

## 2. 真实场景与痛点
织毛衣的人常遇到：
- 想把照片/喜欢的图案织成提花，但不会用专业图样软件，靠 Excel 手画格子累到崩溃。
- 图案对不对得上「针数×行数」、一针占几格、要不要留边针，全靠经验。
- 买线永远买多或买少：算不清总针数、单色占比、要几团（团重、线长）。

## 3. 目标用户
- 手工编织爱好者、编织小店店主、汉服/毛线团卖家（附赠图解是加分项）。

## 4. 核心功能（MVP）
1. **画布网格**：可设画布宽（针数）高（行数），缩放/平移，网格线每 10 格加粗。
2. **调色板与图例**：每个色号 = 一个线号；自动生成图例表（符号 + 色块 + 用量格子数）。
3. **绘图工具**：铅笔、油漆桶、直线、矩形、镜像对称、复制/粘贴区块。
4. **图片转图解**：导入 PNG → 按目标针数缩放 → 色彩量化到指定色板（中位切分 / K-means）→ 生成格子。
5. **用线量计算**：输入针距（针/10cm、行/10cm）、线团规格（克重 / 米数）→ 计算各色所需米数与建议团数（含 15% 余量）。
6. **导出**：PNG 图解 + 图例（含行号，支持奇偶行左右镜像说明）、PDF A4 分页打印。

## 5. 进阶功能
- 符号库（正针、反针、加针、减针、麻花、镂空）绘制符号图解而不只是色块。
- 起针数/减针曲线助手（插肩袖、领口圆顺）。
- 撤销/重做 + 版本历史。
- 分享：把图解编码为短链接或导出 `.knit.json`。

## 6. 页面结构
```
/            我的图解列表（缩略图预览）
/editor/:id  左侧工具栏 | 中间网格画布 | 右侧色板 / 图例 / 尺寸与用线量
/print/:id   打印视图
```

## 7. 数据模型
```ts
type Palette = { id: string; name: string; hex: string; yarnCode?: string };
type Chart = {
  id: string; title: string; cols: number; rows: number;
  palette: Palette[];
  cells: Uint16Array;      // 索引到 palette，长度 cols*rows
  gauge: { stsPer10cm: number; rowsPer10cm: number };
  yarn: { gramsPerSkein: number; metersPerSkein: number };
};
```

## 8. 关键实现点
- 大网格（512×512 = 262144 格）用 `Uint16Array` + 离屏 Canvas 分层绘制（网格层 / 图案层 / 选中层），不要把每格画成 DOM。
- 图片量化放 Web Worker，避免卡 UI；量化用中位切分保证主色不丢。
- 用线量公式：`米数 = 格数 × 单针耗线系数 × 针距换算`，单针耗线系数由针号/线粗细给出默认表。
- 导出 PNG 用 `canvas.toBlob()`，打印视图用 CSS Grid 每 N 行分页。

## 9. 交互与视觉要点
- 米白图纸底 + 细网格，像真实的方格纸；色板可拖拽排序（排序后自动重导图例序号）。
- 右键吸管、空格拖拽平移、滚轮缩放（10%~1600%）。
- 顶部常驻「已用格数 / 各色占比」条，颜色变化即时更新。

## 10. 验收标准
- 256×256 网格下铅笔连续绘制不掉帧（>45fps）。
- 300×400 图片转图解在 3s 内完成且不阻塞交互。
- 用线量结果与手算误差 ≤ 10%；导出 PNG 放大 8 倍不糊。

## 11. 边界（刻意不做）
不做手绘板/绘画类画布应用、不做图像标注工具——避开黑名单的截图标注与代码片段管理方向；核心只服务「编织图解 + 用线量」。

## 12. 容器化与构建（Docker）

本项目交付**必须能通过 Docker 构建与运行**，验收一律以容器内运行结果为准。

- **Dockerfile（多阶段）**
  - `builder`：`node:20-alpine` → `npm ci` → `npm run build`，产物 `dist/`
  - `runtime`：`nginx:1.27-alpine`，仅拷贝 `dist/` 与 `nginx.conf`
- **docker-compose.yml**：服务名 `app-009`，端口 `8089:80`，`restart: unless-stopped`
- **nginx.conf**
  - SPA 回退：`try_files $uri $uri/ /index.html`
  - `.js`（含 Web Worker 文件）MIME 必须为 `text/javascript`，否则 Worker 加载失败
  - 静态资源长缓存 `immutable`；`index.html` 与 `sw.js`（如有）`no-cache`；开启 gzip（js/css/json/svg/wasm）
- **健康检查**：`HEALTHCHECK` 请求 `/healthz`
- **无后端依赖**：图片量化、图解导出全部在浏览器内完成，容器只需静态托管；离线可用

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

- **验收**：`http://localhost:8089` 可用；256×256 网格绘制 > 45fps；300×400 图片转图解 < 3s；镜像体积 < 60MB。
