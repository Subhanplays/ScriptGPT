import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Conversation, Message } from '../types';
import toast from 'react-hot-toast';
import {
  Plus, Send, Copy, Download, Settings, LogOut, Shield,
  Trash2, Terminal, Menu, User, Search, PanelLeft
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, currentStreamingText]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<Conversation[]>('/conversations');
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const data = await api.get<Conversation & { messages: Message[] }>(`/conversations?id=${id}`);
      setMessages(data.messages || []);
      setAiProvider(data.aiProvider as any);
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const message = input.trim();
    setInput('');
    setLoading(true);
    setStreaming(true);
    setCurrentStreamingText('');

    const userMessage: Message = {
      id: Date.now().toString(),
      conversationId: conversationId || '',
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const endpoint = aiProvider === 'GEMINI' ? '/gemini/chat' : '/scriptgpt/chat';

    try {
      let fullText = '';
      let newConversationId = conversationId;

      await api.streamChat(
        endpoint,
        { conversationId, message },
        (text) => { fullText += text; setCurrentStreamingText(fullText); },
        (convId) => {
          if (convId && !newConversationId) {
            newConversationId = convId;
            navigate(`/chat/${convId}`, { replace: true });
          }
          setMessages((prev) => [...prev, {
            id: (Date.now() + 1).toString(),
            conversationId: newConversationId || '',
            role: 'assistant',
            content: fullText,
            aiProvider,
            createdAt: new Date().toISOString(),
          }]);
          setCurrentStreamingText('');
          loadConversations();
        },
        (error) => { toast.error(error); setCurrentStreamingText(''); }
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      setCurrentStreamingText('');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleNewChat = () => { setMessages([]); navigate('/chat'); setMobileMenuOpen(false); };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.delete(`/conversations?id=${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) navigate('/chat');
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleCopyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success('Copied!'); };

  const handleDownloadScript = (code: string) => {
    const blob = new Blob([code], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'script.sh'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const handleUploadScript = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setInput((prev) => prev + (prev ? '\n\n' : '') + `Here's my script:\n\`\`\`bash\n${event.target?.result}\n\`\`\`\n\nPlease help me improve this.`);
      toast.success('Uploaded!');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const markdownComponents = {
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !match;
      const codeString = String(children).replace(/\n$/, '');
      if (isInline) {
        return <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-sm font-mono" style={{ color: '#e9ecef' }} {...props}>{children}</code>;
      }
      return (
        <div className="relative group my-3 rounded-xl overflow-hidden border border-[#2a2a2a]">
          <div className="flex items-center justify-between px-4 py-2" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" style={{ color: '#748ffc' }} />
              <span className="text-xs font-mono" style={{ color: '#868e96' }}>{language || 'bash'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleCopyCode(codeString)} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors" style={{ color: '#868e96' }}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              {(language === 'bash' || language === 'sh' || language === 'shell') && (
                <button onClick={() => handleDownloadScript(codeString)} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors" style={{ color: '#868e96' }}>
                  <Download className="w-3.5 h-3.5" /> .sh
                </button>
              )}
            </div>
          </div>
          <SyntaxHighlighter style={oneDark} language={language || 'bash'} PreTag="div" customStyle={{ margin: 0, borderRadius: 0, background: '#0d1117' }}>
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    },
    p({ children }: any) { return <p className="mb-3 last:mb-0" style={{ color: '#d1d5db', lineHeight: '1.75rem' }}>{children}</p>; },
    h1({ children }: any) { return <h1 className="text-xl font-bold mb-3 mt-4" style={{ color: '#f9fafb' }}>{children}</h1>; },
    h2({ children }: any) { return <h2 className="text-lg font-bold mb-2 mt-3" style={{ color: '#f9fafb' }}>{children}</h2>; },
    h3({ children }: any) { return <h3 className="text-base font-semibold mb-2 mt-3" style={{ color: '#e5e7eb' }}>{children}</h3>; },
    ul({ children }: any) { return <ul className="list-disc list-inside space-y-1 mb-3" style={{ color: '#d1d5db' }}>{children}</ul>; },
    ol({ children }: any) { return <ol className="list-decimal list-inside space-y-1 mb-3" style={{ color: '#d1d5db' }}>{children}</ol>; },
    li({ children }: any) { return <li style={{ color: '#d1d5db' }}>{children}</li>; },
    strong({ children }: any) { return <strong className="font-semibold" style={{ color: '#f9fafb' }}>{children}</strong>; },
    a({ href, children }: any) { return <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#748ffc' }}>{children}</a>; },
    blockquote({ children }: any) { return <blockquote className="border-l-4 pl-4 italic my-3" style={{ borderColor: '#4c6ef5', color: '#9ca3af' }}>{children}</blockquote>; },
  };

  const suggestions = [
    { icon: '🖥️', text: 'Create a Docker installation script for Ubuntu' },
    { icon: '🔍', text: 'How do I find all files larger than 100MB?' },
    { icon: '💾', text: 'Write a backup script with rotation' },
    { icon: '📚', text: 'Explain how pipes and redirects work' },
    { icon: '⏰', text: 'Create a cron job to clean temp files daily' },
    { icon: '📊', text: 'How do I parse CSV files with awk?' },
  ];

  const hasMessages = messages.length > 0 || streaming;

  return (
    <div className="flex h-screen" style={{ background: '#212121' }}>
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-50 h-full w-[260px] flex flex-col transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarOpen ? '' : 'lg:hidden'}`} style={{ background: '#171717' }}>
        <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <button onClick={handleNewChat} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm flex-1 transition-colors" style={{ color: '#e5e7eb' }}>
            <Plus className="w-4 h-4" /> New chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className="p-2 ml-1 rounded-lg transition-colors" style={{ color: '#868e96' }}>
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#2a2a2a', color: '#868e96' }}>
            <Search className="w-4 h-4" /> Search
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="px-2 py-1.5 text-xs font-medium" style={{ color: '#868e96' }}>Recents</div>
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors`}
                style={{ background: conversationId === conv.id ? '#2a2a2a' : 'transparent', color: conversationId === conv.id ? '#fff' : '#b0b8c1' }}
                onClick={() => { navigate(`/chat/${conv.id}`); setMobileMenuOpen(false); }}
              >
                <span className="truncate flex-1">{conv.title}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1" style={{ color: '#868e96' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 space-y-1" style={{ borderTop: '1px solid #2a2a2a' }}>
          <button onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#b0b8c1' }}>
            <Settings className="w-4 h-4" /> Settings
          </button>
          {user?.role === 'ADMIN' && (
            <button onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#b0b8c1' }}>
              <Shield className="w-4 h-4" /> Admin Panel
            </button>
          )}
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors" style={{ color: '#b0b8c1' }}>
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: '#212121' }}>
        <header className="h-12 flex items-center px-3 gap-2 flex-shrink-0" style={{ background: '#212121' }}>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg transition-colors" style={{ color: '#868e96' }}>
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2" style={{ color: '#868e96' }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1 rounded-full p-1" style={{ background: '#2a2a2a' }}>
            <button onClick={() => setAiProvider('SCRIPTGPT')} className="px-3 py-1 rounded-full text-xs font-medium transition-all" style={{ background: aiProvider === 'SCRIPTGPT' ? '#4c6ef5' : 'transparent', color: aiProvider === 'SCRIPTGPT' ? '#fff' : '#868e96' }}>
              ScriptGPT
            </button>
            <button onClick={() => setAiProvider('GEMINI')} className="px-3 py-1 rounded-full text-xs font-medium transition-all" style={{ background: aiProvider === 'GEMINI' ? '#4c6ef5' : 'transparent', color: aiProvider === 'GEMINI' ? '#fff' : '#868e96' }}>
              Gemini
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <h1 className="text-3xl font-semibold mb-8" style={{ color: '#fff' }}>What's on your mind today?</h1>
              <div className="w-full max-w-2xl grid grid-cols-2 gap-2">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setInput(s.text)} className="text-left px-4 py-3 rounded-xl text-sm transition-all" style={{ background: '#2a2a2a', color: '#b0b8c1', border: '1px solid #3a3a3a' }}>
                    {s.text}
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
                      <div className="max-w-[80%] px-5 py-3 rounded-2xl" style={{ background: '#2f2f2f' }}>
                        <p className="whitespace-pre-wrap text-[15px]" style={{ color: '#fff', lineHeight: '1.5rem' }}>{msg.content}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#2f2f2f' }}>
                        <User className="w-4 h-4" style={{ color: '#b0b8c1' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#4c6ef5' }}>
                        <Terminal className="w-4 h-4" style={{ color: '#fff' }} />
                      </div>
                      <div className="max-w-[85%] min-w-0">
                        <div className="text-[15px]">
                          <Markdown components={markdownComponents}>{msg.content}</Markdown>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <button onClick={() => handleCopyCode(msg.content)} className="p-1.5 rounded-md transition-colors" style={{ color: '#868e96' }}>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {streaming && currentStreamingText && (
                <div className="animate-fade-in flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#4c6ef5' }}>
                    <Terminal className="w-4 h-4" style={{ color: '#fff' }} />
                  </div>
                  <div className="max-w-[85%] min-w-0">
                    <div className="text-[15px]">
                      <Markdown components={markdownComponents}>{currentStreamingText}</Markdown>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#4c6ef5', animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#4c6ef5', animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#4c6ef5', animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {loading && !streaming && (
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#4c6ef5' }}>
                    <Terminal className="w-4 h-4" style={{ color: '#fff' }} />
                  </div>
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#495057', animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#495057', animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#495057', animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pb-4 flex-shrink-0" style={{ background: '#212121' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end rounded-3xl transition-colors" style={{ background: '#2f2f2f', border: '1px solid #3a3a3a' }}>
              <input type="file" ref={fileInputRef} onChange={handleUploadScript} accept=".sh,.bash,.shell,.txt" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 ml-1 flex-shrink-0 transition-colors" style={{ color: '#868e96' }} title="Upload .sh file">
                <Plus className="w-5 h-5" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                className="flex-1 bg-transparent resize-none outline-none py-3 px-1 max-h-48 min-h-[44px] text-[15px]"
                style={{ color: '#fff', height: 'auto', minHeight: '44px', lineHeight: '1.5rem' }}
                rows={1}
                disabled={loading}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 192) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-3 flex-shrink-0 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: input.trim() ? '#4c6ef5' : 'transparent' }}
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full animate-spin" style={{ border: '2px solid #495057', borderTopColor: '#fff' }} />
                ) : (
                  <Send className="w-5 h-5" style={{ color: input.trim() ? '#fff' : '#495057' }} />
                )}
              </button>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: '#495057' }}>
              ScriptGPT can help with Bash scripts, Linux commands, and shell scripting questions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
