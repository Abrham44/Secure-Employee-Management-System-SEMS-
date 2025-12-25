import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { User, UserRole, Document, AuditLog, Classification, Department } from './types';
import { MOCK_DOCUMENTS, MOCK_USERS } from './constants';
import { checkDocumentAccess, createAuditLog } from './securityEngine';
import { getSessionUser, startSession, endSession, login } from './authService';

// --- Helper Functions for Security Features ---

const generateCaptchaString = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// --- Sub-components ---

const Navbar = ({ user, onLogout }: { user: User; onLogout: () => void }) => (
  <nav className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg border-b border-slate-800">
    <div className="flex items-center gap-2">
      <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
        <i className="fas fa-shield-alt text-xl"></i>
      </div>
      <div>
        <h1 className="font-bold text-xl tracking-tight leading-none">SEMS <span className="text-blue-400 font-light">Enterprise</span></h1>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Secure Management System</p>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <div className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-widest text-slate-400">
        <Link to="/" className="hover:text-white transition flex items-center gap-2"><i className="fas fa-th-large"></i> Dashboard</Link>
        <Link to="/documents" className="hover:text-white transition flex items-center gap-2"><i className="fas fa-vault"></i> Vault</Link>
        <Link to="/logs" className="hover:text-white transition flex items-center gap-2"><i className="fas fa-list-check"></i> Audit</Link>
      </div>
      <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
        <div className="text-right">
          <p className="text-sm font-bold">{user.name}</p>
          <p className="text-[10px] text-blue-400 uppercase font-black">{user.role}</p>
        </div>
        <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700" alt="avatar" />
        <button 
          onClick={onLogout}
          className="bg-slate-800 hover:bg-red-900 text-white px-3 py-1.5 rounded-md text-xs transition border border-slate-700"
        >
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  </nav>
);

const ClassificationBadge = ({ type }: { type: Classification }) => {
  const styles = {
    [Classification.PUBLIC]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [Classification.INTERNAL]: 'bg-blue-100 text-blue-800 border-blue-200',
    [Classification.CONFIDENTIAL]: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[type]}`}>
      <i className={`fas ${type === Classification.CONFIDENTIAL ? 'fa-lock' : type === Classification.INTERNAL ? 'fa-building' : 'fa-globe'} mr-1`}></i>
      {type}
    </span>
  );
};

// --- Views ---

const LoginView = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [empId, setEmpId] = useState('');
  const [pass, setPass] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaSecret, setCaptchaSecret] = useState(generateCaptchaString());
  const [error, setError] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [currentOtp, setCurrentOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpNotification, setOtpNotification] = useState<string | null>(null);

  const COMMON_PASSWORD = 'password123';

  const handleRefreshCaptcha = () => {
    setCaptchaSecret(generateCaptchaString());
    setCaptchaInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaInput.toLowerCase() !== captchaSecret.toLowerCase()) {
      setError('Invalid CAPTCHA code. Please try again.');
      handleRefreshCaptcha();
      return;
    }

    const result = login(empId, pass);
    if (result.success && result.user) {
      if (result.user.mfaEnabled) {
        const newOtp = generateOtpCode();
        setCurrentOtp(newOtp);
        setShowMfa(true);
        // Simulate OTP delivery notification
        setOtpNotification(newOtp);
        setTimeout(() => setOtpNotification(null), 8000);
      } else {
        onLogin(result.user);
      }
    } else {
      setError(result.error || 'Identity Verification Failed');
      handleRefreshCaptcha();
    }
  };

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === currentOtp) {
      const result = login(empId, pass);
      if (result.user) onLogin(result.user);
    } else {
      setError('Invalid verification code');
    }
  };

  const quickFill = (id: string) => {
    setEmpId(id);
    setPass(COMMON_PASSWORD);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] relative overflow-hidden">
      
      {/* Dynamic OTP Notification Toast */}
      {otpNotification && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-right duration-500 max-w-xs w-full">
          <div className="bg-slate-900 border border-blue-500/50 rounded-2xl shadow-2xl p-4 flex items-start gap-4 ring-1 ring-blue-400/20 backdrop-blur-md">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <i className="fas fa-comment-dots text-white"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Security Notification</p>
              <p className="text-xs text-slate-300 mb-2">Your one-time access token for identity EMP-{empId} is:</p>
              <p className="text-2xl font-black text-white font-mono tracking-widest">{otpNotification}</p>
            </div>
            <button onClick={() => setOtpNotification(null)} className="text-slate-500 hover:text-white">
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 relative z-10 transition-all duration-500 transform">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600"></div>
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-slate-800">
            <i className="fas fa-shield-alt text-white text-4xl"></i>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">Secure Gatekeeper</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Encrypted Identity Layer</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl text-xs mb-8 flex items-center gap-4 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <i className="fas fa-triangle-exclamation text-rose-500"></i>
              </div>
              <p className="font-bold leading-tight">{error}</p>
            </div>
          )}

          {!showMfa ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Identity Reference</label>
                  <div className="relative">
                    <i className="fas fa-fingerprint absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="text" 
                      value={empId}
                      onChange={e => setEmpId(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-[1.25rem] border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold bg-slate-50/50" 
                      placeholder="e.g. EMP-001"
                      required
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Access Key</label>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="password" 
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-[1.25rem] border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm font-bold bg-slate-50/50" 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* CAPTCHA Section */}
              <div className="space-y-3 p-5 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Bot Deterrent</label>
                  <button type="button" onClick={handleRefreshCaptcha} className="text-blue-600 text-[9px] font-black uppercase tracking-widest hover:text-blue-800 flex items-center gap-1 transition-colors">
                    <i className="fas fa-rotate text-[10px]"></i> Refresh
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 px-6 py-4 rounded-2xl flex items-center justify-center flex-1 select-none relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <span className="text-2xl font-black text-white font-mono tracking-[0.3em] italic skew-x-12 select-none relative z-10 drop-shadow-lg">
                      {captchaSecret}
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                      <div className="w-full h-[1px] bg-white -rotate-12 translate-y-1"></div>
                      <div className="w-full h-[1px] bg-white rotate-12 -translate-y-1"></div>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    value={captchaInput}
                    onChange={e => setCaptchaInput(e.target.value)}
                    className="w-24 px-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition text-center text-lg font-black uppercase font-mono"
                    maxLength={6}
                    placeholder="???"
                    required
                  />
                </div>
              </div>

              <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-[1.5rem] transition-all transform active:scale-[0.98] shadow-2xl flex items-center justify-center gap-4 group uppercase tracking-[0.2em] text-xs">
                <span>Request Entry</span>
                <i className="fas fa-arrow-right text-blue-400 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-8 animate-in zoom-in duration-300">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-inner">
                  <i className="fas fa-shield-heart text-3xl text-blue-600 animate-pulse"></i>
                </div>
                <h2 className="font-black text-xl tracking-tight uppercase">Identity Challenge</h2>
                <p className="text-slate-500 text-xs mt-2 px-4">Verification code sent to your primary secure token. Please input to continue.</p>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  className="w-full px-4 py-6 text-center text-5xl font-mono tracking-[0.4em] rounded-[1.5rem] border-2 border-slate-200 focus:border-blue-500 outline-none bg-slate-50 font-black" 
                  placeholder="000000"
                  maxLength={6}
                  required
                />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full"></div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl uppercase tracking-[0.2em] text-xs transition-all active:scale-95">
                Confirm Security Token
              </button>
              <div className="text-center">
                <button type="button" onClick={() => setShowMfa(false)} className="text-[10px] text-slate-400 uppercase font-black hover:text-slate-600 underline tracking-[0.2em] transition-all">Abort Authorization</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Developer Context Section (Subtle) */}
      <div className="w-full max-w-5xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-30 hover:opacity-100 transition-opacity duration-700 px-6">
        <div className="col-span-full mb-2">
          <div className="flex items-center gap-4">
            <div className="h-[1px] bg-slate-700 flex-1"></div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] whitespace-nowrap">System Access Directory</h3>
            <div className="h-[1px] bg-slate-700 flex-1"></div>
          </div>
        </div>
        
        {MOCK_USERS.map(u => (
          <button 
            key={u.id}
            onClick={() => quickFill(u.id)}
            className="flex items-center justify-between p-3 bg-slate-800/20 border border-slate-700/30 rounded-2xl hover:bg-slate-800/40 hover:border-blue-500/30 transition-all text-left group"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-300 group-hover:text-white transition-colors">{u.name}</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-tighter leading-none">{u.role}</p>
            </div>
            <div className="text-right">
              <code className="text-[10px] text-blue-400/80 font-bold group-hover:text-blue-400">{u.id}</code>
            </div>
          </button>
        ))}
        <div className="col-span-full text-center mt-2">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Common Password Key: <span className="text-blue-500/50 select-all">{COMMON_PASSWORD}</span></p>
        </div>
      </div>

      <footer className="mt-auto py-8 text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] flex items-center gap-6">
        <span>Identity Protocol v2.5</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
        <span>Secure Vault Layer</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
        <span>End-to-End Audit Active</span>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>
    </div>
  );
};

const Dashboard = ({ user, logs, docs }: { user: User; logs: AuditLog[]; docs: Document[] }) => {
  const recentLogs = useMemo(() => logs.filter(l => l.userId === user.id || user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.SECURITY_ADMIN).slice(0, 5), [logs, user]);
  
  const stats = [
    { label: 'Accessible Docs', value: docs.filter(d => checkDocumentAccess(user, d).allowed).length, icon: 'fa-file-shield', color: 'blue' },
    { label: 'Pending Leaves', value: user.role.includes('Manager') ? 3 : 0, icon: 'fa-clock', color: 'amber' },
    { label: 'Security Alerts', value: user.role.includes('Security') ? 12 : 0, icon: 'fa-triangle-exclamation', color: 'rose' },
    { label: 'System Health', value: '100%', icon: 'fa-heartbeat', color: 'emerald' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight text-left">System Console</h2>
          <p className="text-slate-500 text-sm text-left">Authenticated as <span className="text-slate-900 font-bold underline decoration-blue-500 decoration-2">{user.name}</span> in {user.department}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Status: Protected</span>
          </div>
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg text-white flex items-center gap-3">
             <i className="far fa-calendar text-blue-400"></i>
             <span className="text-xs font-bold uppercase tracking-tighter">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative text-left">
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-600 group-hover:bg-${s.color}-600 group-hover:text-white transition-all duration-300 shadow-sm`}>
                <i className={`fas ${s.icon} text-xl`}></i>
              </div>
              <span className="text-2xl font-black text-slate-800 tabular-nums">{s.value}</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{s.label}</p>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${s.color}-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Document Quick Access */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold flex items-center gap-2"><i className="fas fa-folder-tree text-blue-600"></i> Resource Vault</h3>
            <Link to="/documents" className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1">Expand <i className="fas fa-arrow-right"></i></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.slice(0, 4).map(d => {
              const access = checkDocumentAccess(user, d);
              return (
                <div key={d.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-500 transition-all cursor-pointer relative overflow-hidden group hover:shadow-lg text-left">
                  {!access.allowed && (
                    <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                      <div className="bg-white p-3 rounded-full shadow-lg mb-3">
                         <i className="fas fa-shield-slash text-rose-500 text-xl"></i>
                      </div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-center px-4 leading-tight">Insufficient Clearance<br/>Policy: {access.model}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <ClassificationBadge type={d.classification} />
                    <span className="text-[9px] text-slate-400 font-mono font-bold">{d.id}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 line-clamp-1 text-lg mb-2">{d.title}</h4>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                      <i className="fas fa-building-user"></i> {d.department}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono italic">mod: {d.lastModified}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Activity */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2 px-2"><i className="fas fa-fingerprint text-blue-600"></i> Audit Stream</h3>
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Activity</span>
               <div className="flex gap-1">
                 <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping"></div>
                 <div className="w-1 h-1 rounded-full bg-blue-500"></div>
               </div>
            </div>
            <div className="divide-y divide-slate-800 max-h-[440px] overflow-y-auto custom-scrollbar bg-[#0f172a] text-left">
              {recentLogs.length > 0 ? recentLogs.map(l => (
                <div key={l.id} className="p-5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${l.result === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {l.result}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">{l.timestamp.split(' ')[1]}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mb-1">
                    <span className="text-blue-400 font-bold">{l.userName}</span> performed <span className="text-slate-100 italic">{l.action.split(':')[0]}</span>
                  </p>
                  {l.reason && <p className="text-[9px] text-rose-400/80 font-mono bg-rose-500/5 p-1 rounded mt-2 border border-rose-500/10"><i className="fas fa-warning mr-1"></i> {l.reason}</p>}
                </div>
              )) : (
                <div className="p-12 text-center text-slate-600 italic text-xs">No recent local activity</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DocumentVault = ({ user, docs, addLog }: { user: User; docs: Document[]; addLog: (l: AuditLog) => void }) => {
  const [filter, setFilter] = useState<Classification | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const filteredDocs = docs.filter(d => 
    (filter === 'ALL' || d.classification === filter) &&
    (d.title.toLowerCase().includes(search.toLowerCase()) || d.id.includes(search))
  );

  const handleDocClick = (doc: Document) => {
    const access = checkDocumentAccess(user, doc);
    if (access.allowed) {
      addLog(createAuditLog(user, `VIEW_DOCUMENT: ${doc.id}`, 'SUCCESS', doc));
      setSelectedDoc(doc);
    } else {
      addLog(createAuditLog(user, `ACCESS_ATTEMPT: ${doc.id}`, 'DENIED', doc, access.reason));
      alert(`ACCESS DENIED\n\nClassification: ${doc.classification}\nReason: ${access.reason}\nModel: ${access.model}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Enterprise Vault</h2>
          <p className="text-slate-500 text-sm">Centralized Secure Repository</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              placeholder="Search by ID or Title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full md:w-72 shadow-sm"
            />
          </div>
          <select 
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm bg-white font-bold"
          >
            <option value="ALL">All Levels</option>
            <option value={Classification.PUBLIC}>Public</option>
            <option value={Classification.INTERNAL}>Internal</option>
            <option value={Classification.CONFIDENTIAL}>Confidential</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">ID Reference</th>
                <th className="px-8 py-6">Asset Title</th>
                <th className="px-8 py-6">Origin Dept</th>
                <th className="px-8 py-6">Security Label</th>
                <th className="px-8 py-6">Revision Date</th>
                <th className="px-8 py-6 text-right">Gatekeeper</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5 font-mono text-[11px] text-slate-400">{d.id}</td>
                  <td className="px-8 py-5 font-bold text-slate-800">{d.title}</td>
                  <td className="px-8 py-5 text-sm text-slate-600 font-medium text-left">
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">{d.department}</span>
                  </td>
                  <td className="px-8 py-5">
                    <ClassificationBadge type={d.classification} />
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-500 font-mono">{d.lastModified}</td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDocClick(d)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-lg active:scale-95"
                    >
                      <i className="fas fa-eye-slash text-[10px]"></i>
                      Decrypt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doc Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-left">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold text-xl mb-1 tracking-tight">{selectedDoc.title}</h3>
                <div className="flex items-center gap-3">
                  <ClassificationBadge type={selectedDoc.classification} />
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{selectedDoc.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="relative z-10 bg-white/10 hover:bg-rose-600 w-10 h-10 rounded-2xl flex items-center justify-center transition-colors">
                <i className="fas fa-times text-lg"></i>
              </button>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            </div>
            <div className="p-10 space-y-8 bg-white">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 font-serif leading-relaxed text-lg text-slate-700 italic relative group">
                <i className="fas fa-quote-left absolute top-4 left-4 text-slate-200 text-3xl"></i>
                <span className="relative z-10 block indent-4">{selectedDoc.content}</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-left">Original Creator</p>
                   <div className="flex items-center gap-2">
                     <i className="fas fa-user-shield text-blue-500"></i>
                     <p className="text-sm font-mono font-bold">{selectedDoc.ownerId}</p>
                   </div>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-left">Asset Custodian</p>
                   <div className="flex items-center gap-2">
                     <i className="fas fa-building text-indigo-500"></i>
                     <p className="text-sm font-bold">{selectedDoc.department}</p>
                   </div>
                </div>
              </div>
            </div>
            <div className="px-10 py-6 bg-slate-50 border-t border-slate-200 flex justify-end">
               <button onClick={() => setSelectedDoc(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all shadow-xl active:scale-95">Purge Session & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AuditLogView = ({ user, logs }: { user: User; logs: AuditLog[] }) => {
  const isSecurityAdmin = user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.SECURITY_ADMIN;
  
  const filteredLogs = useMemo(() => {
    if (isSecurityAdmin) return [...logs].reverse();
    return logs.filter(l => l.userId === user.id).reverse();
  }, [logs, user, isSecurityAdmin]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Audit Intelligence</h2>
          <p className="text-slate-500 text-sm">
            {isSecurityAdmin ? 'Universal System Log Feed' : 'Personal Activity Audit'}
          </p>
        </div>
        <div className="flex gap-2">
           <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 border border-slate-800 shadow-2xl">
              <i className="fas fa-microchip text-blue-400 animate-pulse"></i> SIEM Monitoring Enabled
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Event Time</th>
                <th className="px-8 py-6">Actor Identity</th>
                <th className="px-8 py-6">Operation Type</th>
                <th className="px-8 py-6">Asset Target</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Source Node</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors text-sm text-left">
                  <td className="px-8 py-5 font-mono text-[11px] text-slate-500">{l.timestamp}</td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-slate-800">{l.userName}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-tight mt-0.5">{l.userRole}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{l.action}</span>
                  </td>
                  <td className="px-8 py-5 text-slate-500 font-medium">{l.targetTitle || '—'}</td>
                  <td className="px-8 py-5 text-left">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      l.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {l.result}
                    </span>
                    {l.reason && <p className="text-[9px] text-rose-400 italic mt-1.5 font-bold leading-tight flex items-center gap-1"><i className="fas fa-ban"></i> {l.reason}</p>}
                  </td>
                  <td className="px-8 py-5 font-mono text-[11px] text-slate-400">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Main App Wrapper ---

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(getSessionUser());
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const initialLogs: AuditLog[] = [
      createAuditLog(MOCK_USERS[0], 'SYSLOG_INIT', 'SUCCESS'),
      createAuditLog(MOCK_USERS[1], 'POLICY_ENGINE_RELOAD', 'SUCCESS'),
      createAuditLog(MOCK_USERS[2], 'ACCESS_DENIED: DOC-5512', 'DENIED', MOCK_DOCUMENTS[4], 'Policy violation: RBAC-Rule-403'),
    ];
    setLogs(initialLogs);
  }, []);

  const handleLogin = (user: User) => {
    startSession(user);
    setCurrentUser(user);
    setLogs(prev => [...prev, createAuditLog(user, 'IDENTITY_VERIFICATION_COMPLETE', 'SUCCESS')]);
  };

  const handleLogout = () => {
    if (currentUser) {
      setLogs(prev => [...prev, createAuditLog(currentUser, 'SECURE_LOGOUT', 'SUCCESS')]);
    }
    endSession();
    setCurrentUser(null);
    navigate('/');
  };

  const addLog = (l: AuditLog) => setLogs(prev => [...prev, l]);

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen pb-20 bg-[#f8fafc]">
      <Navbar user={currentUser} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Dashboard user={currentUser} docs={MOCK_DOCUMENTS} logs={logs} />} />
        <Route path="/documents" element={<DocumentVault user={currentUser} docs={MOCK_DOCUMENTS} addLog={addLog} />} />
        <Route path="/logs" element={<AuditLogView user={currentUser} logs={logs} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Footer Branding */}
      <footer className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 p-3 text-center text-[8px] text-slate-500 uppercase font-black tracking-[0.4em] z-40">
        <div className="flex items-center justify-center gap-6">
           <span className="flex items-center gap-1 text-slate-400"><i className="fas fa-fingerprint text-blue-500"></i> Identity Layer Secure</span>
           <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
           <span className="flex items-center gap-1 text-slate-400"><i className="fas fa-server text-emerald-500"></i> High Availability Node</span>
           <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
           <span className="flex items-center gap-1 text-slate-400"><i className="fas fa-lock text-rose-500"></i> Multi-AC Enforcement</span>
        </div>
      </footer>

      {/* Styles for scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
