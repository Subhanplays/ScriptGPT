import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Conversation, Message } from '../types';
import toast from 'react-hot-toast';
import {
  Plus, Send, Copy, Download, Upload, Lightbulb,
  Settings, LogOut, Shield, Trash2, Terminal, X,
  Code2, Zap, Menu, ChevronDown, User, Bot
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      setSidebarOpen(false);
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
        (text) => {
          fullText += text;
          setCurrentStreamingText(fullText);
        },
        (convId) => {
          if (convId && !newConversationId) {
            newConversationId = convId;
            navigate(`/chat/${convId}`, { replace: true });
          }
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            conversationId: newConversationId || '',
            role: 'assistant',
            content: fullText,
            aiProvider,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentStreamingText('');
          loadConversations();
        },
        (error) => {
          toast.error(error);
          setCurrentStreamingText('');
        }
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    navigate('/chat');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.delete(`/conversations?id=${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) navigate('/chat');
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard!');
  };

  const handleDownloadScript = (code: string, title: string) => {
    const blob = new Blob([code], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.sh`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script downloaded!');
  };

  const handleUploadScript = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInput((prev) => prev + (prev ? '\n\n' : '') + `Here's my script:\n\`\`\`bash\n${content}\n\`\`\`\n\nPlease help me improve this script.`);
      toast.success('Script uploaded!');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const markdownComponents = {
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !match;
      const codeString = String(children).replace(/\n$/, '');

      if (isInline) {
        return <code className="bg-dark-800 text-scriptgpt-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
      }

      return (
        <div className="relative group my-4 rounded-xl overflow-hidden border border-dark-700">
          <div className="flex items-center justify-between bg-dark-800 border-b border-dark-700 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-scriptgpt-400" />
              <span className="text-xs text-dark-400 font-mono">{language || 'bash'}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopyCode(codeString)}
                className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-dark-700 rounded-md text-dark-400 hover:text-dark-200 transition-colors text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </button>
              {language === 'bash' || language === 'sh' || language === 'shell' ? (
                <button
                  onClick={() => handleDownloadScript(codeString, 'script')}
                  className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-dark-700 rounded-md text-dark-400 hover:text-dark-200 transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">.sh</span>
                </button>
              ) : null}
            </div>
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={language || 'bash'}
            PreTag="div"
            className="!m-0 !rounded-none"
            customStyle={{ margin: 0, borderRadius: 0, background: '#0d1117' }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    },
    p({ children }: any) {
      return <p className="text-dark-200 leading-7 mb-3 last:mb-0">{children}</p>;
    },
    h1({ children }: any) {
      return <h1 className="text-xl font-bold text-dark-50 mb-3 mt-4">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-lg font-bold text-dark-50 mb-2 mt-3">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-base font-semibold text-dark-100 mb-2 mt-3">{children}</h3>;
    },
    ul({ children }: any) {
      return <ul className="list-disc list-inside text-dark-200 space-y-1 mb-3">{children}</ul>;
    },
    ol({ children }: any) {
      return <ol className="list-decimal list-inside text-dark-200 space-y-1 mb-3">{children}</ol>;
    },
    li({ children }: any) {
      return <li className="text-dark-200">{children}</li>;
    },
    strong({ children }: any) {
      return <strong className="text-dark-50 font-semibold">{children}</strong>;
    },
    a({ href, children }: any) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-scriptgpt-400 hover:text-scriptgpt-300 underline">
          {children}
        </a>
      );
    },
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-scriptgpt-600 pl-4 text-dark-300 italic my-3">
          {children}
        </blockquote>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm text-dark-200 border-collapse">{children}</table>
        </div>
      );
    },
    th({ children }: any) {
      return <th className="border border-dark-700 bg-dark-800 px-3 py-2 text-left font-semibold">{children}</th>;
    },
    td({ children }: any) {
      return <td className="border border-dark-700 px-3 py-2">{children}</td>;
    },
  };

  const suggestions = [
    { text: 'Create a Docker installation script for Ubuntu' },
    { text: 'How do I find all files larger than 100MB?' },
    { text: 'Write a backup script with rotation' },
    { text: 'Explain how pipes and redirects work in Bash' },
    { text: 'Create a cron job to clean temp files daily' },
    { text: 'How do I parse CSV files with awk?' },
  ];

  return (
    <div className="flex h-screen bg-[#212121] overflow-hidden">
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-50 h-full w-[260px] bg-[#171717] flex flex-col transition-transform duration-200 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${sidebarOpen ? '' : 'lg:hidden'}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${conversationId === conv.id ? 'bg-[#2a2a2a] text-white' : 'text-dark-400 hover:bg-[#212121]'}`}
                onClick={() => { navigate(`/chat/${conv.id}`); setMobileMenuOpen(false); }}
              >
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-dark-600 hover:text-red-400 transition-opacity p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-[#2a2a2a] space-y-1">
          <button onClick={() => navigate('/settings')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-dark-400 hover:bg-[#212121] transition-colors">
            <Settings className="w-4 h-4" />
            Settings
          </button>
          {user?.role === 'ADMIN' && (
            <button onClick={() => navigate('/admin')} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-dark-400 hover:bg-[#212121] transition-colors">
              <Shield className="w-4 h-4" />
              Admin Panel
            </button>
          )}
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-dark-400 hover:bg-[#212121] transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-[#2a2a2a] flex items-center px-3 gap-2 flex-shrink-0 bg-[#212121]">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-dark-400 hover:text-dark-200">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:flex p-2 text-dark-400 hover:text-dark-200">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-sm font-medium text-dark-200 truncate">ScriptGPT</h1>
          </div>

          <div className="flex items-center gap-1 bg-[#2a2a2a] rounded-lg p-1">
            <button
              onClick={() => setAiProvider('SCRIPTGPT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${aiProvider === 'SCRIPTGPT' ? 'bg-scriptgpt-600 text-white' : 'text-dark-400 hover:text-dark-200'}`}
            >
              <Zap className="w-3 h-3" />
              ScriptGPT
            </button>
            <button
              onClick={() => setAiProvider('GEMINI')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${aiProvider === 'GEMINI' ? 'bg-scriptgpt-600 text-white' : 'text-dark-400 hover:text-dark-200'}`}
            >
              <Code2 className="w-3 h-3" />
              Gemini
            </button>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full px-4">
              <div className="w-12 h-12 rounded-full bg-scriptgpt-600 flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">How can I help you today?</h1>
              <p className="text-dark-400 text-center max-w-md mb-8 text-sm">
                I'm ScriptGPT — I help with Bash scripts, Linux commands, and shell scripting questions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-2xl w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(s.text)}
                    className="text-left p-3 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] hover:border-[#444] rounded-xl text-sm text-dark-300 hover:text-white transition-all"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  {msg.role === 'user' ? (
                    /* User message — right-aligned with avatar */
                    <div className="flex justify-end gap-3">
                      <div className="max-w-[80%] bg-[#2f2f2f] rounded-2xl px-5 py-3">
                        <p className="text-white whitespace-pre-wrap text-[15px] leading-6">{msg.content}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#2f2f2f] flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-dark-300" />
                      </div>
                    </div>
                  ) : (
                    /* Assistant message — left-aligned with avatar */
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-scriptgpt-600 flex items-center justify-center flex-shrink-0">
                        <Terminal className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[85%] min-w-0">
                        <div className="prose prose-invert max-w-none text-[15px]">
                          <Markdown components={markdownComponents}>{msg.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming response */}
              {streaming && currentStreamingText && (
                <div className="animate-fade-in flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-scriptgpt-600 flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-4 h-4 text-white" />
                  </div>
                  <div className="max-w-[85%] min-w-0">
                    <div className="prose prose-invert max-w-none text-[15px]">
                      <Markdown components={markdownComponents}>{currentStreamingText}</Markdown>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 bg-scriptgpt-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-scriptgpt-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-scriptgpt-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {loading && !streaming && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-scriptgpt-600 flex items-center justify-center flex-shrink-0">
                    <Terminal className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2 text-dark-400 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-dark-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-[#2a2a2a] bg-[#212121] px-4 py-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-[#2f2f2f] rounded-2xl border border-[#3a3a3a] focus-within:border-dark-600 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadScript}
                accept=".sh,.bash,.shell,.txt"
                className="hidden"
              />
              <div className="flex items-end">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-dark-500 hover:text-dark-300 transition-colors flex-shrink-0"
                  title="Upload .sh file"
                >
                  <Upload className="w-5 h-5" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={aiProvider === 'SCRIPTGPT' ? 'Ask about Bash, scripts, or Linux commands...' : 'Ask anything...'}
                  className="flex-1 bg-transparent text-white placeholder:text-dark-500 resize-none outline-none py-3 px-1 max-h-48 min-h-[44px] text-[15px] leading-6"
                  rows={1}
                  disabled={loading}
                  style={{ height: 'auto', minHeight: '44px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 192) + 'px';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-3 text-white disabled:text-dark-600 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-dark-600 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-dark-600 mt-2 text-center">
              ScriptGPT can help with Bash scripts, Linux commands, and shell scripting questions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
