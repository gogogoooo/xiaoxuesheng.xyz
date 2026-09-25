import { ArrowUpRight, ScanLine } from 'lucide-react';
import { SiteShell } from '@/components/site-shell';

export default function AppsPage() {
  return (
    <SiteShell>
      <main className="collection-page apps-page">
        <p className="eyebrow">APPS · DEMOS · TOOLS</p>
        <h1>
          让一个想法，
          <br />
          变成可以试试的东西。
        </h1>
        <p>
          这里会慢慢收集小程序、在线 Demo
          和实用小工具。每一个小作品都会带着它的由来、简介和访问入口来到这里。
        </p>
        <section
          className="app-demo-card"
          aria-labelledby="vehicle-dispatch-title"
        >
          <div className="app-demo-card__copy">
            <p className="app-demo-card__eyebrow">01 · 小程序体验 Demo</p>
            <h2 id="vehicle-dispatch-title">行序 · 车辆调度</h2>
            <p>
              面向组织内部用车场景的微信小程序交互演示，覆盖申请用车、智能派车、归还确认和车辆档案管理等流程。
            </p>
            <p className="app-demo-card__hint">
              演示账号：wangmin　密码：Demo123!
            </p>
            <a className="app-demo-card__link" href="/demos/vehicle-dispatch/">
              打开在线演示 <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          </div>
          <aside className="app-demo-card__qr" aria-label="小程序体验版二维码">
            <div className="app-demo-card__qr-title">
              <ScanLine aria-hidden="true" size={17} /> 扫码体验
            </div>
            <img
              src="/vehicle-dispatch-experience-qr.png"
              alt="行序车辆调度小程序体验版二维码"
            />
            <p>体验版 · 截至 9 月 19 日有效</p>
          </aside>
        </section>
        <section
          className="app-demo-card quicksand-demo-card"
          aria-labelledby="quicksand-title"
        >
          <div className="app-demo-card__copy">
            <p className="app-demo-card__eyebrow">02 · 离线沙盒小游戏</p>
            <h2 id="quicksand-title">流沙模拟器</h2>
            <p>
              画一片黄沙、巧克力或番茄酱，让方块小人走进去。旋转沙盘、放置克隆人，观察不同材质的下沉效果，自由玩一场没有输赢的小实验。
            </p>
            <p className="app-demo-card__hint">
              WASD 移动 · 自由涂画 · 伪 3D 视角 · 支持离线
            </p>
            <a
              className="app-demo-card__link"
              href="/games/quicksand-simulator/"
            >
              进入流沙沙盘 <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          </div>
          <a
            className="quicksand-preview"
            href="/games/quicksand-simulator/"
            aria-label="开始玩流沙模拟器"
          >
            <span className="quicksand-preview__label">
              QUICKSAND LAB / 001
            </span>
            <span className="quicksand-preview__board" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="quicksand-preview__caption">
              小小沙盘，大大好奇。 ↗
            </span>
          </a>
        </section>
        <section
          className="app-demo-card garden-demo-card"
          aria-labelledby="garden-defense-title"
        >
          <div className="app-demo-card__copy">
            <p className="app-demo-card__eyebrow">03 · 离线策略小游戏</p>
            <h2 id="garden-defense-title">花园防线</h2>
            <p>
              收集阳光，种下豆豆射手、向日花、坚果盾和爆爆果。在五行草坪上布置自己的防线，守住三波小怪物。
            </p>
            <p className="app-demo-card__hint">
              种植塔防 · 原创卡通画风 · 支持离线
            </p>
            <a className="app-demo-card__link" href="/games/garden-defense/">
              进入花园 <ArrowUpRight aria-hidden="true" size={18} />
            </a>
          </div>
          <a
            className="garden-preview"
            href="/games/garden-defense/"
            aria-label="开始玩花园防线"
          >
            <span className="garden-preview__eyebrow">
              GARDEN DEFENSE / 002
            </span>
            <span className="garden-preview__scene" aria-hidden="true">
              <i className="garden-preview__sun">☀</i>
              <i className="garden-preview__flower">✿</i>
              <i className="garden-preview__creature">◕</i>
            </span>
            <span className="garden-preview__caption">
              一格草坪，一场冒险。 ↗
            </span>
          </a>
        </section>
      </main>
    </SiteShell>
  );
}
