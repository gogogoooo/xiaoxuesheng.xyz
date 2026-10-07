'use client';

import {FormEvent, ReactNode, useEffect, useState} from 'react';

const STORAGE_KEY = 'za:reports:unlocked';
const PASSWORD_HASH = 'b16948653eb3c4d96fc2c1ad3ddc0f942518d77d75999bc04e084f570fe07972';

async function hashPassword(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function ReportAccessGate({children}: {children: ReactNode}) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(STORAGE_KEY) === PASSWORD_HASH);
    setReady(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if ((await hashPassword(password)) !== PASSWORD_HASH) {
      setPassword('');
      setError('密码不正确，请再试一次。');
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, PASSWORD_HASH);
    setUnlocked(true);
    setPassword('');
  }

  function lock() {
    sessionStorage.removeItem(STORAGE_KEY);
    setUnlocked(false);
  }

  if (!ready) return <section className="report-gate report-gate--loading" aria-busy="true">正在准备汇报材料…</section>;
  if (unlocked) return <>{children}<button className="report-lock-button" type="button" onClick={lock}>重新锁定汇报材料</button></>;

  return <section className="report-gate" aria-labelledby="report-gate-title">
    <span className="report-gate__mark" aria-hidden="true">✦</span>
    <p className="eyebrow">PRIVATE ARCHIVE</p>
    <h1 id="report-gate-title">汇报材料</h1>
    <p>这是一份整理中的工作汇报，请输入访问密码后阅读。</p>
    <form onSubmit={handleSubmit} className="report-gate__form">
      <label htmlFor="report-password">访问密码</label>
      <div className="report-gate__input-row">
        <input id="report-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" required />
        <button type="submit">进入阅读</button>
      </div>
      <p className="report-gate__hint" aria-live="polite">{error || '密码只在当前浏览器会话中生效。'}</p>
    </form>
    <a className="report-gate__back" href="/works">← 返回作品陈列</a>
  </section>;
}
