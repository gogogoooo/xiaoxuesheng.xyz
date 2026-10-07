import {ReportAccessGate} from '@/components/report-access-gate';
import {ReportMarkdown} from '@/components/report-markdown';
import {SiteShell} from '@/components/site-shell';

export default function NationalDayReportPage() {
  return <SiteShell><main className="reports-page"><ReportAccessGate><section className="reports-detail"><a className="report-back" href="/works/reports">← 汇报材料目录</a><ReportMarkdown /></section></ReportAccessGate></main></SiteShell>;
}
