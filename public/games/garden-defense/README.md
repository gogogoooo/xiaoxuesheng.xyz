# 花园防线

原创画风的离线植物塔防小游戏。双击本文件夹 `index.html` 即可试玩；四个文件 `index.html`、`style.css`、`rules.js`、`game.js` 须放在同一目录。网站中的访问地址是 `/games/garden-defense/`。

先选择植物卡，再点击草坪空格种植。点击场上太阳收集资源；选择小铲子后点击植物即可移走。键盘 1–4 选择植物，空格暂停，R 重来。移动端可横向滑动沙盘，点按种植、收太阳。

所有角色、图形由 Canvas 代码绘制，不含第三方图片、音乐或网络资源。规则集中于 `rules.js`，页面绘制与操作集中于 `game.js`。修改规则后运行 `node --test tests/garden-defense.test.mjs`。
