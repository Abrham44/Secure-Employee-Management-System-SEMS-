
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole, Document, AuditLog, Classification, Department } from './types';
import { MOCK_DOCUMENTS, MOCK_USERS } from './constants';
import { checkDocumentAccess, createAuditLog } from './securityEngine';
import { getSessionUser, startSession, endSession, login } from './authService';

// --- Security Components ---

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

const ClassificationBadge = ({ type }: { type: Classification }) => {
  const styles = {
    [Classification.PUBLIC]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    [Classification.INTERNAL]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    [Classification.CONFIDENTIAL]: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
  };
  const icons = {
    [Classification.PUBLIC]: 'fa-globe',
    [Classification.INTERNAL]: 'fa-building-lock',
    [Classification.CONFIDENTIAL]: 'fa-shield-halved'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border flex items-center gap-1.5 whitespace-nowrap ${styles[type]}`}>
      <i className={`fas ${icons[type]}`}></i>
      {type}
    </span>
  );
};

// --- Shared Layout Components ---

const Navbar = ({ user, onLogout }: { user: User; onLogout: () => void }) => {
  const location = useLocation();
  const navLinks = [
    { to: '/', label: 'Ops Desk', icon: 'fa-gauge-high' },
    { to: '/documents', label: 'Vault', icon: 'fa-box-archive' },
    { to: '/directory', label: 'Registry', icon: 'fa-users-gear' },
    { to: '/logs', label: 'Audit', icon: 'fa-terminal' },
  ];

  return (
    <nav className="bg-[#0f172a] text-white sticky top-0 z-[60] border-b border-slate-800/60 backdrop-blur-xl bg-opacity-80">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
            <i className="fas fa-shield-halved text-2xl"></i>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-black text-xl tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">SEMS <span className="text-blue-500">3.1</span></h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-1">Encrypted Infrastructure</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:flex gap-1">
            {navLinks.map(link => (
              <Link 
                key={link.to}
                to={link.to} 
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                  location.pathname === link.to 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <i className={`fas ${link.icon}`}></i>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4 pl-8 border-l border-slate-800/60">
            <Link to="/profile" className="flex items-center gap-3 group text-left">
              <div className="relative">
                <img src={user.avatar} className="w-10 h-10 rounded-xl border-2 border-slate-700 group-hover:border-blue-500 transition-colors object-cover" alt="avatar" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0f172a] shadow-sm"></div>
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{user.name}</p>
                <div className="flex items-center gap-2">
                   <ClassificationBadge type={user.accessLevel} />
                </div>
              </div>
            </Link>
            <button 
              onClick={onLogout}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-rose-600/20 hover:text-rose-500 transition-all border border-slate-700/50 flex items-center justify-center group"
            >
              <i className="fas fa-power-off text-sm group-hover:scale-110 transition-transform"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// --- View: Dashboard ---

const Dashboard = ({ user, logs, docs, users }: { user: User; logs: AuditLog[]; docs: Document[]; users: User[] }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: 'Authorized Assets', value: docs.filter(d => checkDocumentAccess(user, d).allowed).length, icon: 'fa-vault', color: 'blue' },
    { label: 'Network Nodes', value: '24/24', icon: 'fa-server', color: 'emerald' },
    { label: 'Security Breaches', value: '0', icon: 'fa-user-secret', color: 'rose' },
    { label: 'System Load', value: '14%', icon: 'fa-microchip', color: 'indigo' },
  ];

  const recentActivity = useMemo(() => logs.slice(-6).reverse(), [logs]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tightest uppercase mb-2">Central Operations</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identity: {user.id} Verified</span>
            </div>
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg shadow-lg text-white flex items-center gap-2">
               <i className="far fa-clock text-blue-400"></i>
               <span className="text-[10px] font-mono font-bold tracking-widest uppercase">{time.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="text-center px-4 border-r border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Users Online</p>
             <p className="text-xl font-black text-slate-900">128</p>
           </div>
           <div className="text-center px-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clearance</p>
             <ClassificationBadge type={user.accessLevel} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden text-left">
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-600 group-hover:bg-${s.color}-600 group-hover:text-white transition-all duration-300 mb-6`}>
                <i className={`fas ${s.icon} text-xl`}></i>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{s.value}</p>
            </div>
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 bg-${s.color}-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
              High-Value Assets
            </h3>
            <Link to="/documents" className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline">Vault Registry <i className="fas fa-arrow-right-long ml-2"></i></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.slice(0, 4).map(d => {
              const access = checkDocumentAccess(user, d);
              return (
                <div key={d.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all cursor-pointer relative overflow-hidden text-left">
                  {!access.allowed && (
                    <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-6 text-center">
                       <div className="bg-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center mb-4 ring-4 ring-slate-100/50">
                         <i className="fas fa-lock text-rose-500 text-lg"></i>
                       </div>
                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Encrypted</p>
                       <p className="text-[9px] text-slate-500 font-bold max-w-[150px] leading-tight">Access model {access.model} denied visibility</p>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-6">
                    <ClassificationBadge type={d.classification} />
                    <span className="text-[10px] font-mono text-slate-400 font-bold">#{d.id}</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg leading-tight mb-2 group-hover:text-blue-600 transition-colors">{d.title}</h4>
                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                        <i className="fas fa-building"></i>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{d.department}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono italic">REV: {d.lastModified}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
              Audit Stream
            </h3>
          </div>
          <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800 shadow-slate-900/40">
            <div className="p-5 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                 SIEM Live Feed
               </span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto custom-scrollbar text-left">
              {recentActivity.map(l => (
                <div key={l.id} className="p-5 hover:bg-slate-800/30 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${l.result === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {l.result}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">{l.timestamp.split(' ')[1]}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    <span className="text-white font-black group-hover:text-blue-400 transition-colors uppercase text-[10px]">{l.userName}</span>
                    <br/>
                    <span className="opacity-60">{l.action.replace('_', ' ')}</span>
                  </p>
                  {l.reason && <p className="text-[9px] text-rose-400 font-mono bg-rose-500/5 p-2 rounded-lg mt-3 border border-rose-500/10 leading-tight">ERR: {l.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- View: Employee Registry ---

const EmployeeDirectory = ({ user, users }: { user: User, users: User[] }) => {
  const [search, setSearch] = useState('');
  const canSeeSensitive = [UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER, UserRole.HR_DIRECTOR, UserRole.SECURITY_ADMIN].includes(user.role);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.id.includes(search) || 
    u.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tightest uppercase mb-2">Employee Registry</h2>
          <p className="text-slate-500 text-sm font-medium">System-wide personnel directory with identity masking.</p>
        </div>
        <div className="relative w-full md:w-96">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            type="text" 
            placeholder="Identity scan: ID, Name or Department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm bg-white font-bold text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group text-left">
            <div className="flex items-start justify-between mb-6">
              <div className="relative">
                <img src={u.avatar} className="w-16 h-16 rounded-[1.5rem] border-2 border-slate-100 group-hover:border-blue-500 transition-colors shadow-lg" alt="avatar" />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center ${u.mfaEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                   <i className={`fas fa-shield text-[8px] text-white ${u.mfaEnabled ? 'animate-pulse' : ''}`}></i>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 font-black tracking-widest">{u.id}</span>
                <div className="mt-2">
                  <ClassificationBadge type={u.accessLevel} />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-black text-slate-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{u.name}</h4>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{u.role}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</p>
                  <p className="text-xs font-bold text-slate-700">{u.department}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-xs font-bold text-slate-700">{u.employmentStatus}</p>
                </div>
              </div>

              {canSeeSensitive ? (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 space-y-2">
                   <div className="flex justify-between items-center">
                     <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Last Secure Login</span>
                     <span className="text-[10px] font-mono font-bold text-blue-600">{u.lastLogin}</span>
                   </div>
                   {u.contractEndDate && (
                     <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Access Expiry</span>
                       <span className="text-[10px] font-mono font-bold text-rose-600">{u.contractEndDate}</span>
                     </div>
                   )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
                   <i className="fas fa-eye-slash text-slate-300"></i>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity Redacted (RBAC)</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- View: User Profile / Settings ---

const ProfileView = ({ user }: { user: User }) => {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-12 text-center relative overflow-hidden">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
           <div className="relative z-10">
             <div className="w-32 h-32 mx-auto mb-6 relative group">
               <img src={user.avatar} className="w-full h-full rounded-[2.5rem] border-4 border-slate-800 shadow-2xl object-cover ring-4 ring-blue-500/20" alt="avatar" />
               <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-4 border-slate-900 hover:bg-blue-500 transition-colors">
                 <i className="fas fa-camera"></i>
               </button>
             </div>
             <h2 className="text-3xl font-black text-white tracking-tightest uppercase">{user.name}</h2>
             <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em] mt-2">{user.role}</p>
           </div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        </div>

        <div className="p-12 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-3">Identity Context</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold text-slate-500">Employee ID</span>
                  <span className="text-sm font-mono font-black text-slate-900">{user.id}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold text-slate-500">Department</span>
                  <span className="text-sm font-black text-slate-900">{user.department}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-bold text-slate-500">Clearance Level</span>
                  <ClassificationBadge type={user.accessLevel} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-3">Security Protocols</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-xs font-black text-slate-900">MFA Verification</p>
                    <p className="text-[9px] text-slate-400 font-medium">Second factor enforcement</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${user.mfaEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.mfaEnabled ? 'left-7' : 'left-1'}`}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-xs font-black text-slate-900">Session Lockout</p>
                    <p className="text-[9px] text-slate-400 font-medium">Auto-terminate (15m)</p>
                  </div>
                  <i className="fas fa-toggle-on text-emerald-500 text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                <i className="fas fa-fingerprint text-3xl"></i>
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Identity Rotation</p>
                <p className="text-sm text-slate-300">Update your secure access key every 30 days.</p>
              </div>
            </div>
            <button className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-colors">Rotate Key</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- View: Document Vault ---

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
      alert(`CRYPTO-CHALLENGE FAILED\n\nSecurity Policy: ${access.model}\nSystem Reason: ${access.reason}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tightest uppercase mb-2">Vault Explorer</h2>
          <p className="text-slate-500 text-sm font-medium">Multi-layer access enforcement for enterprise intelligence.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Search by ID or Title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm bg-white font-bold text-sm"
            />
          </div>
          <select 
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm bg-white font-black text-xs uppercase tracking-widest"
          >
            <option value="ALL">All Clearances</option>
            <option value={Classification.PUBLIC}>Public</option>
            <option value={Classification.INTERNAL}>Internal</option>
            <option value={Classification.CONFIDENTIAL}>Confidential</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Reference</th>
                <th className="px-8 py-6">Asset Specification</th>
                <th className="px-8 py-6">Department</th>
                <th className="px-8 py-6">Clearance</th>
                <th className="px-8 py-6">Revision</th>
                <th className="px-8 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 font-mono text-[11px] text-slate-400 font-bold">#{d.id}</td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{d.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Owner UID: {d.ownerId}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight">{d.department}</span>
                  </td>
                  <td className="px-8 py-6">
                    <ClassificationBadge type={d.classification} />
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-400 font-mono italic">{d.lastModified}</td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleDocClick(d)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-xl hover:shadow-blue-500/20 active:scale-95 group-hover:translate-x-[-4px]"
                    >
                      <i className="fas fa-file-shield text-xs"></i>
                      Decrypt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-left">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 border border-white/20">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-black text-2xl mb-2 tracking-tight uppercase">{selectedDoc.title}</h3>
                <div className="flex items-center gap-3">
                  <ClassificationBadge type={selectedDoc.classification} />
                  <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Doc Reference: {selectedDoc.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="relative z-10 bg-white/10 hover:bg-rose-600 w-12 h-12 rounded-2xl flex items-center justify-center transition-all group">
                <i className="fas fa-times text-xl group-hover:rotate-90 transition-transform"></i>
              </button>
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
            </div>
            <div className="p-12 space-y-10 bg-white">
              <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 font-serif leading-relaxed text-xl text-slate-800 italic relative overflow-hidden">
                <i className="fas fa-quote-left absolute top-6 left-6 text-slate-200/50 text-6xl"></i>
                <span className="relative z-10 block indent-6">{selectedDoc.content}</span>
                <div className="absolute bottom-0 right-0 p-4">
                   <div className="w-16 h-1 bg-gradient-to-r from-transparent to-blue-500 rounded-full"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-200">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Asset Creator</p>
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600">
                        <i className="fas fa-id-badge text-xl"></i>
                     </div>
                     <p className="text-sm font-black text-slate-800">{selectedDoc.ownerId}</p>
                   </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-200">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Custodial Dept</p>
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
                        <i className="fas fa-building text-xl"></i>
                     </div>
                     <p className="text-sm font-black text-slate-800">{selectedDoc.department}</p>
                   </div>
                </div>
              </div>
            </div>
            <div className="px-12 py-8 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button onClick={() => setSelectedDoc(null)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-rose-600 transition-all shadow-xl active:scale-95">Purge Buffer & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- View: Audit Log ---

const AuditLogView = ({ user, logs }: { user: User; logs: AuditLog[] }) => {
  const isSecurityAdmin = user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.SECURITY_ADMIN;
  
  const filteredLogs = useMemo(() => {
    if (isSecurityAdmin) return [...logs].reverse();
    return logs.filter(l => l.userId === user.id).reverse();
  }, [logs, user, isSecurityAdmin]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tightest uppercase mb-2">Audit Intelligence</h2>
          <p className="text-slate-500 text-sm font-medium">
            {isSecurityAdmin ? 'Universal System Log: Full Transparency' : 'Personal Activity Chain: Compliance Trace'}
          </p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-4 border border-slate-800 shadow-2xl">
          <i className="fas fa-microchip text-blue-400 animate-pulse"></i> SIEM Monitoring Enabled
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Timestamp</th>
                <th className="px-8 py-6">Operator</th>
                <th className="px-8 py-6">Directive</th>
                <th className="px-8 py-6">Target Resource</th>
                <th className="px-8 py-6">Outcome</th>
                <th className="px-8 py-6">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                  <td className="px-8 py-6 font-mono text-[11px] text-slate-500 font-bold">{l.timestamp}</td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 uppercase tracking-tight">{l.userName}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{l.userRole}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-mono text-[11px] font-black text-slate-600 bg-white shadow-inner px-3 py-1.5 rounded-lg border border-slate-100 uppercase">{l.action}</span>
                  </td>
                  <td className="px-8 py-6 text-slate-500 font-black uppercase text-[10px]">{l.targetTitle || '—'}</td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        l.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {l.result}
                      </span>
                      {l.reason && <p className="text-[9px] text-rose-400 italic mt-2 font-bold leading-tight flex items-center gap-2"><i className="fas fa-ban"></i> {l.reason}</p>}
                    </div>
                  </td>
                  <td className="px-8 py-6 font-mono text-[11px] text-slate-400 font-bold">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Login: Identity Layer ---

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

  const handleRefreshCaptcha = () => {
    setCaptchaSecret(generateCaptchaString());
    setCaptchaInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (captchaInput.toLowerCase() !== captchaSecret.toLowerCase()) {
      setError('Bot detection trigger. Incorrect CAPTCHA.');
      handleRefreshCaptcha();
      return;
    }

    const result = login(empId, pass);
    if (result.success && result.user) {
      if (result.user.mfaEnabled) {
        const newOtp = generateOtpCode();
        setCurrentOtp(newOtp);
        setShowMfa(true);
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
      setError('Verification token rejected');
    }
  };

  const quickFill = (id: string) => {
    setEmpId(id);
    setPass('password123');
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] relative overflow-hidden">
      
      {otpNotification && (
        <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right-full duration-500">
          <div className="bg-[#0f172a] border border-blue-500/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 flex items-start gap-5 ring-1 ring-blue-400/20 backdrop-blur-2xl">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <i className="fas fa-shield-halved text-white text-lg"></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">MFA Dispatch</p>
              <p className="text-xs text-slate-400 mb-3">One-time entry key for {empId}:</p>
              <p className="text-3xl font-black text-white font-mono tracking-[0.4em]">{otpNotification}</p>
            </div>
            <button onClick={() => setOtpNotification(null)} className="text-slate-600 hover:text-white transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 border border-slate-200">
        <div className="bg-[#0f172a] p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600"></div>
          <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-[0_20px_50px_rgba(37,99,235,0.4)] ring-4 ring-slate-800">
            <i className="fas fa-shield-halved text-white text-4xl"></i>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tightest uppercase mb-1">SEMS GATEWAY</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Multi-Protocol Auth Layer</p>
        </div>
        
        <div className="p-10">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-6 py-4 rounded-[1.5rem] text-xs mb-8 flex items-center gap-4 animate-in fade-in zoom-in duration-300">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <i className="fas fa-triangle-exclamation text-rose-500 text-lg"></i>
              </div>
              <p className="font-black uppercase tracking-tight leading-tight">{error}</p>
            </div>
          )}

          {!showMfa ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 px-1">Identity UID</label>
                  <div className="relative group">
                    <i className="fas fa-id-card absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input 
                      type="text" 
                      value={empId}
                      onChange={e => setEmpId(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-black bg-slate-50/50 uppercase tracking-widest" 
                      placeholder="EMP-XXX"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 px-1">Access Key</label>
                  <div className="relative group">
                    <i className="fas fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                    <input 
                      type="password" 
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-black bg-slate-50/50" 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bot Challenge</label>
                  <button type="button" onClick={handleRefreshCaptcha} className="text-blue-600 text-[10px] font-black uppercase hover:text-blue-800 transition-colors">Refresh</button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 px-6 py-4 rounded-2xl flex items-center justify-center flex-1 relative overflow-hidden">
                    <span className="text-2xl font-black text-white font-mono tracking-[0.4em] italic skew-x-12 relative z-10 select-none">
                      {captchaSecret}
                    </span>
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className="w-full h-px bg-white -rotate-12 translate-y-2"></div>
                      <div className="w-full h-px bg-white rotate-12 -translate-y-2"></div>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    value={captchaInput}
                    onChange={e => setCaptchaInput(e.target.value)}
                    className="w-28 px-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-center text-xl font-black uppercase font-mono bg-white"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <button className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-black py-6 rounded-[2rem] transition-all transform active:scale-95 shadow-2xl flex items-center justify-center gap-4 group uppercase tracking-[0.3em] text-xs">
                <span>Authorize</span>
                <i className="fas fa-chevron-right text-blue-500 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-10 animate-in zoom-in duration-500">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-blue-100 shadow-inner">
                  <i className="fas fa-shield-heart text-4xl text-blue-600 animate-pulse"></i>
                </div>
                <h2 className="font-black text-2xl tracking-tightest uppercase mb-2">MFA Challenge</h2>
                <p className="text-slate-500 text-xs px-8 leading-relaxed font-medium">Input the 6-digit dynamic token generated for your identity handle.</p>
              </div>
              <div className="relative group">
                <input 
                  type="text" 
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  className="w-full px-6 py-8 text-center text-5xl font-mono tracking-[0.4em] rounded-[2rem] border-4 border-slate-100 focus:border-blue-600 outline-none bg-slate-50 font-black shadow-inner transition-all" 
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] uppercase tracking-[0.3em] text-xs transition-all active:scale-95">
                Verify Identity
              </button>
              <div className="text-center">
                <button type="button" onClick={() => setShowMfa(false)} className="text-[10px] text-slate-400 uppercase font-black hover:text-slate-800 transition-colors tracking-widest">Abort Protocol</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="w-full max-w-6xl mt-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 px-6 opacity-40 hover:opacity-100 transition-all duration-700">
        {MOCK_USERS.map(u => (
          <button 
            key={u.id}
            onClick={() => quickFill(u.id)}
            className="flex flex-col items-center p-4 bg-slate-900/40 border border-white/5 rounded-[1.5rem] hover:bg-slate-900 hover:border-blue-500/30 transition-all group text-center"
          >
            <img src={u.avatar} className="w-10 h-10 rounded-xl mb-3 border border-slate-700 group-hover:border-blue-500 transition-colors" alt="" />
            <p className="text-[9px] font-black text-slate-400 group-hover:text-white uppercase truncate w-full">{u.name.split(' ')[0]}</p>
            <code className="text-[9px] text-blue-500/80 font-bold mt-1 uppercase">{u.id}</code>
          </button>
        ))}
      </div>

      <footer className="mt-auto py-10 text-[10px] text-slate-700 font-black uppercase tracking-[0.5em] flex items-center gap-8">
        <span>Protocols v3.1.2</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
        <span>Secure Vault Layer</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
        <span>End-to-End Audit</span>
      </footer>
    </div>
  );
};

// --- Main App Controller ---

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(getSessionUser());
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const initialLogs: AuditLog[] = [
      createAuditLog(MOCK_USERS[0], 'KERNEL_INIT', 'SUCCESS'),
      createAuditLog(MOCK_USERS[1], 'ENGINE_ENFORCEMENT_UP', 'SUCCESS'),
    ];
    setLogs(initialLogs);
  }, []);

  const handleLogin = (user: User) => {
    startSession(user);
    setCurrentUser(user);
    setLogs(prev => [...prev, createAuditLog(user, 'IDENTITY_HANDSHAKE_SUCCESS', 'SUCCESS')]);
  };

  const handleLogout = () => {
    if (currentUser) {
      setLogs(prev => [...prev, createAuditLog(currentUser, 'CONNECTION_TERMINATED', 'SUCCESS')]);
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
    <div className="min-h-screen pb-24 bg-[#f8fafc]">
      <Navbar user={currentUser} onLogout={handleLogout} />
      
      <main className="relative z-10">
        <Routes>
          <Route path="/" element={<Dashboard user={currentUser} docs={MOCK_DOCUMENTS} logs={logs} users={MOCK_USERS} />} />
          <Route path="/documents" element={<DocumentVault user={currentUser} docs={MOCK_DOCUMENTS} addLog={addLog} />} />
          <Route path="/directory" element={<EmployeeDirectory user={currentUser} users={MOCK_USERS} />} />
          <Route path="/logs" element={<AuditLogView user={currentUser} logs={logs} />} />
          <Route path="/profile" element={<ProfileView user={currentUser} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      <footer className="fixed bottom-0 w-full bg-[#0f172a] border-t border-slate-800 p-4 z-[50] shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-6">
             <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <i className="fas fa-fingerprint text-blue-500"></i>
               Identity Secure
             </span>
             <span className="w-1.5 h-1.5 rounded-full bg-slate-800 hidden md:block"></span>
             <span className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <i className="fas fa-server text-emerald-500"></i>
               Node: Mainframe-01
             </span>
           </div>
           <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
             SEMS 3.1 &copy; 2025 ENCRYPTED OPERATIONS
           </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out forwards; }
        .tracking-tightest { letter-spacing: -0.05em; }
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
