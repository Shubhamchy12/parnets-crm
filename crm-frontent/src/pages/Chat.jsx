import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { socketService } from '../services/socketService';
import PageHeader from '../components/common/PageHeader';
import Avatar from '../components/common/Avatar';
import { Send, Hash, User } from 'lucide-react';

const CHANNELS = [
  { id: 'general', name: 'general', type: 'channel' },
  { id: 'engineering', name: 'engineering', type: 'channel' },
  { id: 'sales', name: 'sales', type: 'channel' },
  { id: 'announcements', name: 'announcements', type: 'channel' },
];

const Chat = () => {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0]);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const bottomRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const socket = socketService.connect(token);
    socket?.on('chat:message', (msg) => {
      setMessages(prev => ({
        ...prev,
        [msg.channel]: [...(prev[msg.channel] || []), msg],
      }));
    });
    return () => socketService.disconnect();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeChannel]);

  const send = () => {
    if (!input.trim()) return;
    const msg = { channel: activeChannel.id, message: input, sender: user, timestamp: new Date() };
    socketService.emit('chat:message', msg);
    setMessages(prev => ({ ...prev, [activeChannel.id]: [...(prev[activeChannel.id] || []), msg] }));
    setInput('');
  };

  const channelMessages = messages[activeChannel.id] || [];

  return (
    <div>
      <PageHeader title="Team Chat" breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Chat' }]} />
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-56 bg-slate-900 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-700">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Channels</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {CHANNELS.map(ch => (
                <button key={ch.id} onClick={() => setActiveChannel(ch)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeChannel.id === ch.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{activeChannel.name}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {channelMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No messages yet. Start the conversation!</div>
              ) : channelMessages.map((msg, i) => {
                const isMe = msg.sender?._id === user?._id || msg.sender?.email === user?.email;
                return (
                  <div key={i} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar name={msg.sender?.name || ''} size="sm" />
                    <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{msg.sender?.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={`Message #${activeChannel.name}`}
                  className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button onClick={send} disabled={!input.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
