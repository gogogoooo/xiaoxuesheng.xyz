# 小小电路实验室 · 首版

面向七岁孩子、安卓平板横屏独立自由探索。参考用户给出的 NOBOOK 截图：深灰桌面、写实器材、右侧器材柜。无任务、评分、账号业务或教学弹窗。

已实现：器材添加、拖动、点选两接线柱连线、移除器材/导线、开关、灯亮、电机旋转/反转、撤销、清桌、示例恢复、音效开关、全屏、本机保存。

模型：直流节点电压法；电池1.5V、内阻0.25Ω，灯泡8Ω，电机等效12Ω，开关闭合0.02Ω。支持串并联和多个电源；任一电池电流超过2A时全桌虚拟暂停供电，改好接线即恢复。灯泡为固定电阻近似，不模拟灯丝温度或损坏。

验证：9项独立电路单元检查通过，覆盖断路、欧姆关系、串并联、电机极性、短路、孤立器材和存储数据校验；TypeScript检查与生产构建通过。未进行安卓真机测试。WebMCP为可选读回接口，尚未在支持的浏览器上下文中验证，不影响正常浏览器玩法。

暂不包含离线安装、化学和天平。预览/发布版需要网络，桌面保存于当前浏览器。

素材：public/apparatus.png，内置 imagegen 原创生成透明2×2素材表；提示：realistic silver laboratory circuit apparatus, transparent 2×2 sprite sheet; horizontal AA battery, unlit bulb, open knife switch, silver motor with green three-blade fan; blue left/red right terminals; almost frontal perspective; no labels/logos/environment.
