import {ReportAccessGate} from '@/components/report-access-gate';
import {SiteShell} from '@/components/site-shell';

export default function ReportsPage() {
  return <SiteShell><main className="reports-page"><ReportAccessGate><section className="reports-index"><p className="eyebrow">REPORT ARCHIVE</p><h1>汇报材料</h1><p>把阶段性的思考、图谱和工作记录整理成可以慢慢阅读的档案。</p><a className="report-entry" href="/works/reports/2026-national-day"><span><b>2026 年国庆汇报</b><small>基础采集研发部门汇报稿</small></span><span aria-hidden="true">↗</span></a></section></ReportAccessGate></main></SiteShell>;
}
