import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Conversation, Message } from '../types';
import toast from 'react-hot-toast';
import {
  Plus, Send, Copy, Download, Settings, LogOut, Shield,
  Trash2, Terminal, Menu, User, Search, PanelLeft,
  ThumbsUp, ThumbsDown, Pencil
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [aiProvider, setAiProvider] = useState<'SCRIPTGPT' | 'GEMINI'>('SCRIPTGPT');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  useEffect(() => { scrollToBottom(); }, [messages, currentStreamingText]);

  const loadConversations = useCallback(async () => {
    try { const data = await api.get<Conversation[]>('/conversations'); setConversations(data); } catch {}
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (conversationId) { loadConversation(conversationId); } else { setMessages([]); }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const data = await api.get<Conversation & { messages: Message[] }>(`/conversations?id=${id}`);
      setMessages(data.messages || []);
      setAiProvider(data.aiProvider as any);
    } catch { toast.error('Failed to load conversation'); }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput('');
    setLoading(true);
    setStreaming(true);
    setCurrentStreamingText('');
    setMessages((prev) => [...prev, { id: Date.now().toString(), conversationId: conversationId || '', role: 'user', content: message, createdAt: new Date().toISOString() }]);

    const endpoint = aiProvider === 'GEMINI' ? '/gemini/chat' : '/scriptgpt/chat';
    try {
      let fullText = '';
      let newConversationId = conversationId;
      await api.streamChat(endpoint, { conversationId, message },
        (text) => { fullText += text; setCurrentStreamingText(fullText); },
        (convId) => {
          if (convId && !newConversationId) { newConversationId = convId; navigate(`/chat/${convId}`, { replace: true }); }
          setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), conversationId: newConversationId || '', role: 'assistant', content: fullText, aiProvider, createdAt: new Date().toISOString() }]);
          setCurrentStreamingText(''); loadConversations();
        },
        (error) => { toast.error(error); setCurrentStreamingText(''); }
      );
    } catch (e: any) { toast.error(e.message || 'Failed'); setCurrentStreamingText(''); }
    finally { setLoading(false); setStreaming(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleNewChat = () => { setMessages([]); navigate('/chat'); setMobileMenuOpen(false); };
  const handleDeleteConversation = async (id: string) => {
    try { await api.delete(`/conversations?id=${id}`); setConversations((p) => p.filter((c) => c.id !== id)); if (conversationId === id) navigate('/chat'); toast.success('Deleted'); } catch { toast.error('Failed'); }
  };
  const handleCopyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success('Copied!'); };
  const handleDownloadScript = (code: string) => {
    const blob = new Blob([code], { type: 'text/x-shellscript' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'script.sh'; a.click(); URL.revokeObjectURL(url); toast.success('Downloaded!');
  };
  const handleUploadScript = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setInput((p) => p + (p ? '\n\n' : '') + `Here's my script:\n\`\`\`bash\n${ev.target?.result}\n\`\`\`\n\nPlease help me improve this.`); toast.success('Uploaded!'); };
    reader.readAsText(file); e.target.value = '';
  };

  const markdownComponents = {
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !match;
      const codeString = String(children).replace(/\n$/, '');
      if (isInline) return <code className="px-1.5 py-0.5 rounded text-sm font-mono" style={{ background: '#f0f0f0', color: '#d63384' }} {...props}>{children}</code>;
      return (
        <div className="relative group my-3 rounded-xl overflow-hidden" style={{ background: '#1e1e1e' }}>
          <div className="flex items-center justify-between px-4 py-2" style={{ background: '#2d2d2d', borderBottom: '1px solid #3d3d3d' }}>
            <span className="text-xs font-mono" style={{ color: '#808080' }}>{language || 'code'}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => handleCopyCode(codeString)} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs" style={{ color: '#808080' }}>
                <Copy className="w-3.5 h-3.5" /> Copy code
              </button>
            </div>
          </div>
          <SyntaxHighlighter style={oneDark} language={language || 'bash'} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, background: '#1e1e1e', padding: '16px' }}>
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    },
    p({ children }: any) { return <p className="mb-3 last:mb-0" style={{ color: '#374151', lineHeight: '1.75rem' }}>{children}</p>; },
    h1({ children }: any) { return <h1 className="text-xl font-bold mb-3 mt-4" style={{ color: '#111827' }}>{children}</h1>; },
    h2({ children }: any) { return <h2 className="text-lg font-bold mb-2 mt-3" style={{ color: '#111827' }}>{children}</h2>; },
    h3({ children }: any) { return <h3 className="text-base font-semibold mb-2 mt-3" style={{ color: '#111827' }}>{children}</h3>; },
    ul({ children }: any) { return <ul className="list-disc list-inside space-y-1 mb-3" style={{ color: '#374151' }}>{children}</ul>; },
    ol({ children }: any) { return <ol className="list-decimal list-inside space-y-1 mb-3" style={{ color: '#374151' }}>{children}</ol>; },
    li({ children }: any) { return <li style={{ color: '#374151' }}>{children}</li>; },
    strong({ children }: any) { return <strong className="font-semibold" style={{ color: '#111827' }}>{children}</strong>; },
    a({ href, children }: any) { return <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#10a37f' }}>{children}</a>; },
    blockquote({ children }: any) { return <blockquote className="border-l-4 pl-4 italic my-3" style={{ borderColor: '#10a37f', color: '#6b7280' }}>{children}</blockquote>; },
  };

  const suggestions = [
    'Create a Docker installation script for Ubuntu',
    'How do I find all files larger than 100MB?',
    'Write a backup script with rotation',
    'Explain how pipes and redirects work',
    'Create a cron job to clean temp files daily',
    'How do I parse CSV files with awk?',
  ];

  const hasMessages = messages.length > 0 || streaming;

  // Group conversations by time
  const groupConversations = () => {
    const now = new Date();
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const previous7: Conversation[] = [];
    conversations.forEach((c) => {
      const diff = now.getTime() - new Date(c.updatedAt).getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      if (days < 1) today.push(c);
      else if (days < 2) yesterday.push(c);
      else if (days < 7) previous7.push(c);
      else previous7.push(c);
    });
    return { today, yesterday, previous7 };
  };

  const grouped = groupConversations();

  const renderConversationGroup = (title: string, convs: Conversation[]) => {
    if (convs.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-3 py-1.5 text-xs font-medium" style={{ color: '#6b7280' }}>{title}</div>
        {convs.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors`}
            style={{ background: conversationId === conv.id ? '#f0f0f0' : 'transparent', color: conversationId === conv.id ? '#111827' : '#374151' }}
            onClick={() => { navigate(`/chat/${conv.id}`); setMobileMenuOpen(false); }}
          >
            <Pencil className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9ca3af' }} />
            <span className="truncate flex-1">{conv.title}</span>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1" style={{ color: '#9ca3af' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen" style={{ background: '#ffffff' }}>
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-50 h-full w-[260px] flex flex-col transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarOpen ? '' : 'lg:hidden'}`} style={{ background: '#f7f7f8', borderRight: '1px solid #e5e7eb' }}>
        <div className="flex items-center justify-between p-3">
          <button onClick={handleNewChat} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium flex-1 transition-colors" style={{ color: '#111827', border: '1px solid #e5e7eb' }}>
            <Plus className="w-4 h-4" /> New chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className="p-2 ml-1 rounded-lg transition-colors" style={{ color: '#6b7280' }}>
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid #e5e7eb', color: '#9ca3af' }}>
            <Search className="w-4 h-4" /> Search conversations
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {renderConversationGroup('Today', grouped.today)}
          {renderConversationGroup('Yesterday', grouped.yesterday)}
          {renderConversationGroup('Previous 7 Days', grouped.previous7)}
        </div>

        <div className="p-3 space-y-1" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#374151' }}>
            My upgrades
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#374151' }}>
            Your library
          </button>
          <button onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#374151' }}>
            <Settings className="w-4 h-4" /> Settings
          </button>
          {user?.role === 'ADMIN' && (
            <button onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#374151' }}>
              <Shield className="w-4 h-4" /> Admin Panel
            </button>
          )}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm" style={{ color: '#374151' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#10a37f' }}>
              <User className="w-4 h-4" style={{ color: '#fff' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{user?.username}</div>
              <div className="text-xs" style={{ color: '#9ca3af' }}>Free plan</div>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#374151' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: '#ffffff' }}>
        {/* Top bar */}
        <header className="h-12 flex items-center px-4 gap-3 flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg transition-colors" style={{ color: '#6b7280' }}>
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2" style={{ color: '#6b7280' }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {hasMessages && messages.length > 0 && (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#374151' }}>
                <span className="font-medium truncate">{messages[0]?.content?.substring(0, 40)}...</span>
                <span style={{ color: '#9ca3af' }}>· Edited today</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{ border: '1px solid #e5e7eb', color: '#374151' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#10a37f' }}>
              <Terminal className="w-3 h-3" style={{ color: '#fff' }} />
            </div>
            ScriptGPT
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <h1 className="text-2xl font-semibold mb-6" style={{ color: '#111827' }}>What can I help with?</h1>
              <div className="w-full max-w-2xl grid grid-cols-2 gap-2">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setInput(s)} className="text-left px-4 py-3 rounded-xl text-sm transition-all" style={{ background: '#f7f7f8', color: '#374151', border: '1px solid #e5e7eb' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === 'user' ? (
                    <div className="flex justify-end gap-3 mb-6">
                      <div className="max-w-[80%] px-5 py-3 rounded-3xl" style={{ background: '#f0f0f0', color: '#111827' }}>
                        <p className="whitespace-pre-wrap text-[15px]" style={{ lineHeight: '1.5rem' }}>{msg.content}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f0f0f0' }}>
                        <User className="w-4 h-4" style={{ color: '#6b7280' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#10a37f' }}>
                        <Terminal className="w-4 h-4" style={{ color: '#fff' }} />
                      </div>
                      <div className="max-w-[85%] min-w-0 flex-1">
                        <div className="text-[15px]">
                          <Markdown components={markdownComponents}>{msg.content}</Markdown>
                        </div>
                        <div className="flex items-center gap-1 mt-3">
                          <button onClick={() => handleCopyCode(msg.content)} className="p-1.5 rounded-md transition-colors" style={{ color: '#9ca3af' }}>
                            <Copy className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-md transition-colors" style={{ color: '#9ca3af' }}>
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded-md transition-colors" style={{ color: '#9ca3af' }}>
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {streaming && currentStreamingText && (
                <div className="animate-fade-in flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#10a37f' }}>
                    <Terminal className="w-4 h-4" style={{ color: '#fff' }} />
                  </div>
                  <div className="max-w-[85%] min-w-0 flex-1">
                    <div className="text-[15px]">
                      <Markdown components={markdownComponents}>{currentStreamingText}</Markdown>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#10a37f', animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#10a37f', animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#10a37f', animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {loading && !streaming && (
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#10a37f' }}>
                    <Terminal className="w-4 h-4" style={{ color: '#fff' }} />
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#d1d5db', animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#d1d5db', animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#d1d5db', animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pb-4 flex-shrink-0" style={{ background: '#ffffff' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end rounded-2xl transition-colors" style={{ background: '#f0f0f0', border: '1px solid #e5e7eb' }}>
              <input type="file" ref={fileInputRef} onChange={handleUploadScript} accept=".sh,.bash,.shell,.txt" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 ml-1 flex-shrink-0 transition-colors" style={{ color: '#6b7280' }} title="Upload .sh file">
                <Plus className="w-5 h-5" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message ScriptGPT"
                className="flex-1 bg-transparent resize-none outline-none py-3 px-1 max-h-48 min-h-[44px] text-[15px]"
                style={{ color: '#111827', height: 'auto', minHeight: '44px', lineHeight: '1.5rem' }}
                rows={1}
                disabled={loading}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 192) + 'px'; }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-3 flex-shrink-0 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: input.trim() ? '#10a37f' : 'transparent' }}
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #d1d5db', borderTopColor: '#fff' }} />
                ) : (
                  <Send className="w-5 h-5" style={{ color: input.trim() ? '#fff' : '#9ca3af' }} />
                )}
              </button>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: '#9ca3af' }}>
              ScriptGPT can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
