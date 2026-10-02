# 车辆调度 V3.0 接入计划

目标：在小程序页面新增独立的 V3.0 网页 Demo 入口，保留全部原有入口。

架构：静态资源存放于 public/demos/vehicle-dispatch-v3，页面直接链接至独立 HTML，样式与脚本由 Demo 自己加载。

约束：新版入口不显示日期、上线时间、完成时间；不复用旧二维码；从 origin/main 建立独立分支；先本地验收，不合并或发布生产。

- [x] 导入压缩包中的六个网页资源，说明文档和自带测试保存于 docs/demos/vehicle-dispatch-v3。
- [x] 在 app/apps/page.tsx 首个位置新增 V3.0 卡片，保留旧车辆调度、流沙、花园入口。卡片使用独立类，仅增加局部样式。
- [x] 运行 node docs/demos/vehicle-dispatch-v3/tests/demo.test.cjs、node tests/site-content.test.mjs、node tests/circuit.test.mjs 和 pnpm build。
- [x] 验证构建中新版资源完整、旧页面保留；启动本地预览，检查入口、登录及角色切换。
- [x] 检查相对 origin/main 的改动范围，提交独立分支，交付预览供用户验收。

验证结果：Demo 41/41、站点 13/13、电路 9/9，静态构建成功。原包六个运行文件与 public、dist/client 的 SHA256 完全一致。浏览器验证入口、综合演示账号登录与车管中心主任身份切换。新旧 Demo、电路实验、流沙与花园路径 HTTP 200。

测试适配：测试文件从原目录移动到 docs 后，修正资源路径并通过 CommonJS 加载器读取原脚本，适配主站 ESM 环境；运行资源没有修改。
