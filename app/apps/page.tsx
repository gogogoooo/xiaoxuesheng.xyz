import {ArrowUpRight, ScanLine} from 'lucide-react';
import {SiteShell} from '@/components/site-shell';

export default function AppsPage() {
  return <SiteShell><main className="collection-page apps-page">
    <p className="eyebrow">APPS · DEMOS · TOOLS</p>
    <h1>让一个想法，<br/>变成可以试试的东西。</h1>
    <p>这里会慢慢收集小程序、在线 Demo 和实用小工具。每一个小作品都会带着它的由来、简介和访问入口来到这里。</p>
    <section className="app-demo-card" aria-labelledby="vehicle-dispatch-title">
      <div className="app-demo-card__copy">
        <p className="app-demo-card__eyebrow">01 · 小程序体验 Demo</p>
        <h2 id="vehicle-dispatch-title">行序 · 车辆调度</h2>
        <p>面向组织内部用车场景的微信小程序交互演示，覆盖申请用车、智能派车、归还确认和车辆档案管理等流程。</p>
        <p className="app-demo-card__hint">演示账号：wangmin　密码：Demo123!</p>
        <a className="app-demo-card__link" href="/demos/vehicle-dispatch/">打开在线演示 <ArrowUpRight aria-hidden="true" size={18}/></a>
      </div>
      <aside className="app-demo-card__qr" aria-label="小程序体验版二维码">
        <div className="app-demo-card__qr-title"><ScanLine aria-hidden="true" size={17}/> 扫码体验</div>
        <img src="/vehicle-dispatch-experience-qr.png" alt="行序车辆调度小程序体验版二维码"/>
        <p>体验版 · 截至 9 月 19 日有效</p>
      </aside>
    </section>
  </main></SiteShell>;
}
