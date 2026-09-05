import React, { useState } from 'react';
import { CallLog, User } from '../../types';
import { Avatar } from '../common/Avatar';
import { useSocket } from '../../context/SocketContext';
import { formatDuration, formatTime } from '../../utils/audio';
import { 
  Phone, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Plus, 
  Search,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

interface CallsViewProps {
  callLogs: CallLog[];
  allUsers: User[];
  currentUserId: string;
}

export const CallsView: React.FC<CallsViewProps> = ({
  callLogs,
  allUsers,
  currentUserId,
}) => {
  const { startCall } = useSocket();
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = callLogs.filter((call) => {
    if (filter === 'missed') {
      return call.status === 'missed' || call.status === 'rejected';
    }
    return true;
  });

  const getPartnerInfo = (call: CallLog) => {
    const isCaller = call.callerId === currentUserId;
    return {
      name: isCaller ? call.receiverName : call.callerName,
      avatar: isCaller ? call.receiverAvatar : call.callerAvatar,
      id: isCaller ? call.receiverId : call.callerId,
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-400" />
            <span>Call History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Encrypted HD voice and video calls
          </p>
        </div>

        <button
          onClick={() => setShowNewCallModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>New Call</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'missed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
              filter === tab
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab} Calls
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-slate-500">
            <Phone className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p className="text-xs font-medium">No call records found</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Start an audio or video call with any contact
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const partner = getPartnerInfo(log);
            const isMissed = log.status === 'missed';
            const isOutgoing = log.direction === 'outgoing';

            return (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar src={partner.avatar} name={partner.name} size="md" />

                  <div className="min-w-0">
                    <h4 className={`text-xs font-bold truncate ${isMissed ? 'text-rose-400' : 'text-slate-200'}`}>
                      {partner.name}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      {isMissed ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-rose-400" />
                      ) : isOutgoing ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>{formatTime(log.startedAt)}</span>
                      {log.duration ? <span>• {formatDuration(log.duration)}</span> : null}
                    </div>
                  </div>
                </div>

                {/* Redial Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startCall(partner.id, partner.name, partner.avatar, 'audio')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-400 transition"
                    title="Audio Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => startCall(partner.id, partner.name, partner.avatar, 'video')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-400 transition"
                    title="Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Call Modal */}
      {showNewCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Start a New Call</h3>
              <button onClick={() => setShowNewCallModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-3 relative mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {allUsers
                .filter((u) => u.id !== currentUserId)
                .filter((u) => !searchQuery || u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-xs text-slate-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar src={u.avatarUrl} name={u.displayName} size="sm" isOnline={u.isOnline} />
                      <span className="font-semibold">{u.displayName}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          startCall(u.id, u.displayName, u.avatarUrl, 'audio');
                          setShowNewCallModal(false);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          startCall(u.id, u.displayName, u.avatarUrl, 'video');
                          setShowNewCallModal(false);
                        }}
                        className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 transition"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
