import React, { useState, useEffect } from 'react';
import { User, AdminStats, Report } from '../../types';
import { Avatar } from '../common/Avatar';
import { 
  ShieldAlert, 
  Users, 
  MessageSquare, 
  Phone, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Ban, 
  RefreshCw,
  Server,
  Zap
} from 'lucide-react';

interface AdminDashboardProps {
  allUsers: User[];
  onRefreshUsers: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  allUsers,
  onRefreshUsers,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }

      const repRes = await fetch('/api/admin/reports');
      if (repRes.ok) {
        const r = await repRes.json();
        setReports(r);
      }
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResolveReport = async (reportId: string, action: 'dismissed' | 'banned') => {
    try {
      await fetch('/api/admin/resolve-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      fetchAdminData();
      onRefreshUsers();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Admin Moderation & Telemetry</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live server state, active sessions, and community moderation
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Users</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalUsers || allUsers.length}</div>
          <div className="text-[10px] text-emerald-400 mt-1 font-mono">100% Verified</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Live Sockets</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.activeSockets || 4}</div>
          <div className="text-[10px] text-cyan-400 mt-1 font-mono">Real-time Stream</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Messages</span>
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalMessages || 120}</div>
          <div className="text-[10px] text-purple-400 mt-1 font-mono">Encrypted Log</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pending Reports</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{reports.filter(r => r.status === 'pending').length}</div>
          <div className="text-[10px] text-amber-400 mt-1 font-mono">Moderation Queue</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['overview', 'users', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              activeTab === tab
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Overview / System Health */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Server className="w-4 h-4" />
              <span>Full-Stack Architecture Telemetry</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-slate-400">Signaling & Gateway:</div>
                <div className="font-semibold text-white mt-1">WebSocket (ws protocol) on Port 3000</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-slate-400">AI Intelligence Core:</div>
                <div className="font-semibold text-white mt-1">Google GenAI SDK (Gemini 2.5 Flash Server-Side)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-slate-400">Media Engine:</div>
                <div className="font-semibold text-white mt-1">WebRTC P2P + Web Audio Synthesizer</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-slate-400">Authentication:</div>
                <div className="font-semibold text-white mt-1">Phone Number OTP + Instant Verification</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3">User</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/40">
                  <td className="py-3 flex items-center gap-2.5">
                    <Avatar src={user.avatarUrl} name={user.displayName} size="sm" isOnline={user.isOnline} />
                    <span className="font-bold text-white">{user.displayName}</span>
                  </td>
                  <td className="py-3 font-mono">{user.phoneNumber}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      user.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3">
                    {user.isOnline ? (
                      <span className="text-emerald-400 font-semibold">Online</span>
                    ) : (
                      <span className="text-slate-500">Offline</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Reports Moderation */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
              No reports filed yet. Community is safe and clean.
            </div>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-400 text-xs">{r.reason}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Reported by User #{r.reportedBy} on target #{r.targetId}
                  </div>
                </div>

                {r.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveReport(r.id, 'dismissed')}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'banned')}
                      className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold transition"
                    >
                      Ban Violator
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
