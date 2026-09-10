import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Conversation, Message } from '../types';
import toast from 'react-hot-toast';
import {
  Plus, MessageSquare, Send, Copy, Download, Upload, Lightbulb,
  Settings, LogOut, Shield, ChevronLeft, Trash2, Terminal, X,
  Code2, FileCode, Zap, BarChart3, Loader2, Menu
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, usage, logout, refreshUsage } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [aiProvider, setAiProvider] = useState<'SCRIPTGPT' | 'GEMINI'>('SCRIPTGPT');
  const [showIdeas, setShowIdeas] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingText]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.get<Conversation[]>('/conversations');
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const data = await api.get<Conversation & { messages: Message[] }>(`/conversations/${id}`);
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
          refreshUsage();
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
      await api.delete(`/conversations/${id}`);
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

  const handleGetIdeas = async () => {
    setShowIdeas(true);
    setIdeasLoading(true);
    setCurrentStreamingText('');

    try {
      let fullText = '';
      await api.streamChat(
        '/scriptgpt/ideas',
        {},
        (text) => {
          fullText += text;
          setCurrentStreamingText(fullText);
        },
        () => {
          setIdeasLoading(false);
        },
        (error) => {
          toast.error(error);
          setIdeasLoading(false);
        }
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to get ideas');
      setIdeasLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-50 h-full w-72 bg-dark-900 border-r border-dark-700 flex flex-col transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarOpen ? '' : 'lg:hidden'}`}
      >
        <div className="p-4 border-b border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-scriptgpt-600 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-dark-50">ScriptGPT</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-dark-400 hover:text-dark-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <button onClick={handleNewChat} className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`sidebar-item group ${
                  conversationId === conv.id ? 'sidebar-item-active' : ''
                }`}
                onClick={() => {
                  navigate(`/chat/${conv.id}`);
                  setMobileMenuOpen(false);
                }}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1 text-sm">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-dark-500 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-dark-700 space-y-2">
          {usage && (
            <div className="px-3 py-2 bg-dark-800 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-dark-400 mb-1">
                <BarChart3 className="w-3 h-3" />
                <span>Today: {usage.dailyUsed}/{usage.dailyLimit}</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-1.5">
                <div
                  className="bg-scriptgpt-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min((usage.dailyUsed / usage.dailyLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="sidebar-item w-full"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="sidebar-item w-full"
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm">Admin Panel</span>
            </button>
          )}
          <div className="sidebar-item w-full" onClick={logout}>
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign out</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-dark-700 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden text-dark-400 hover:text-dark-200"
          >
            <Menu className="w-5 h-5" />
          </button>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="hidden lg:block text-dark-400 hover:text-dark-200"
            >
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </button>
          )}
          
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center bg-dark-800 rounded-lg p-1">
              <button
                onClick={() => setAiProvider('SCRIPTGPT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  aiProvider === 'SCRIPTGPT'
                    ? 'bg-scriptgpt-600 text-white'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                ScriptGPT AI
              </button>
              <button
                onClick={() => setAiProvider('GEMINI')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  aiProvider === 'GEMINI'
                    ? 'bg-scriptgpt-600 text-white'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Gemini
              </button>
            </div>
          </div>

          <button
            onClick={handleGetIdeas}
            disabled={ideasLoading}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Script Ideas</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !showIdeas ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="w-20 h-20 rounded-2xl bg-scriptgpt-600/10 border border-scriptgpt-600/20 flex items-center justify-center mb-6">
                <Terminal className="w-10 h-10 text-scriptgpt-500" />
              </div>
              <h2 className="text-2xl font-bold text-dark-50 mb-2">What can I help you script?</h2>
              <p className="text-dark-400 text-center max-w-md mb-8">
                Tell me what you want your shell script to do, and ScriptGPT creates it.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  { icon: Terminal, text: 'Create a Docker installation script' },
                  { icon: FileCode, text: 'Make a server backup script' },
                  { icon: Zap, text: 'Generate a file cleanup script' },
                  { icon: Lightbulb, text: 'Give me Linux automation ideas' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(item.text)}
                    className="flex items-center gap-3 p-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-600 rounded-xl text-left transition-all group"
                  >
                    <item.icon className="w-5 h-5 text-scriptgpt-500 group-hover:text-scriptgpt-400 flex-shrink-0" />
                    <span className="text-sm text-dark-300 group-hover:text-dark-100">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : showIdeas ? (
            <div className="max-w-3xl mx-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark-50 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Script Ideas
                </h2>
                <button
                  onClick={() => {
                    setShowIdeas(false);
                    setCurrentStreamingText('');
                  }}
                  className="text-dark-400 hover:text-dark-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {currentStreamingText ? (
                <div className="prose prose-dark max-w-none">
                  <Markdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match;
                        if (isInline) {
                          return <code className={className} {...props}>{children}</code>;
                        }
                        return (
                          <div className="relative group">
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopyCode(String(children).replace(/\n$/, ''))}
                                className="p-1.5 bg-dark-700 hover:bg-dark-600 rounded text-dark-300"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg !bg-dark-900"
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        );
                      },
                    }}
                  >
                    {currentStreamingText}
                  </Markdown>
                </div>
              ) : ideasLoading ? (
                <div className="flex items-center gap-3 text-dark-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating ideas...
                </div>
              ) : null}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`animate-fade-in ${
                    msg.role === 'user' ? 'flex justify-end' : ''
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                      msg.role === 'user'
                        ? 'bg-scriptgpt-600 text-white'
                        : 'bg-dark-800 border border-dark-700'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-dark max-w-none">
                        <Markdown
                          components={{
                            code({ node, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              const language = match ? match[1] : '';
                              const isInline = !match;
                              const codeString = String(children).replace(/\n$/, '');

                              if (isInline) {
                                return <code className={className} {...props}>{children}</code>;
                              }

                              return (
                                <div className="relative group my-3">
                                  <div className="flex items-center justify-between bg-dark-900 border border-dark-700 rounded-t-lg px-4 py-2">
                                    <div className="flex items-center gap-2">
                                      <FileCode className="w-3.5 h-3.5 text-scriptgpt-400" />
                                      <span className="text-xs text-dark-400 font-mono">{language || 'script'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleCopyCode(codeString)}
                                        className="p-1.5 hover:bg-dark-700 rounded text-dark-400 hover:text-dark-200 transition-colors"
                                        title="Copy"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDownloadScript(codeString, 'script')}
                                        className="p-1.5 hover:bg-dark-700 rounded text-dark-400 hover:text-dark-200 transition-colors"
                                        title="Download .sh"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <SyntaxHighlighter
                                    style={oneDark}
                                    language={language || 'bash'}
                                    PreTag="div"
                                    className="!rounded-t-none !rounded-b-lg !m-0 !border !border-dark-700 !border-t-0"
                                    customStyle={{
                                      margin: 0,
                                      borderRadius: '0 0 8px 8px',
                                      border: '1px solid #30363d',
                                      borderTop: 'none',
                                    }}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            },
                            p({ children }) {
                              return <p className="text-dark-200 leading-7 mb-3">{children}</p>;
                            },
                            h1({ children }) {
                              return <h1 className="text-lg font-bold text-dark-50 mb-3">{children}</h1>;
                            },
                            h2({ children }) {
                              return <h2 className="text-base font-bold text-dark-50 mb-2">{children}</h2>;
                            },
                            h3({ children }) {
                              return <h3 className="text-sm font-bold text-dark-100 mb-2">{children}</h3>;
                            },
                            ul({ children }) {
                              return <ul className="list-disc list-inside text-dark-200 space-y-1 mb-3">{children}</ul>;
                            },
                            ol({ children }) {
                              return <ol className="list-decimal list-inside text-dark-200 space-y-1 mb-3">{children}</ol>;
                            },
                            li({ children }) {
                              return <li className="text-dark-200">{children}</li>;
                            },
                            strong({ children }) {
                              return <strong className="text-dark-50 font-semibold">{children}</strong>;
                            },
                            a({ href, children }) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-scriptgpt-400 hover:text-scriptgpt-300 underline"
                                >
                                  {children}
                                </a>
                              );
                            },
                            blockquote({ children }) {
                              return (
                                <blockquote className="border-l-4 border-scriptgpt-600 pl-4 text-dark-300 italic my-3">
                                  {children}
                                </blockquote>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </Markdown>
                      </div>
                    ) : (
                      <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {streaming && currentStreamingText && (
                <div className="animate-fade-in">
                  <div className="max-w-[85%] rounded-2xl px-5 py-3 bg-dark-800 border border-dark-700">
                    <div className="prose prose-dark max-w-none">
                      <Markdown
                        components={{
                          code({ node, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            const isInline = !match;
                            const codeString = String(children).replace(/\n$/, '');
                            if (isInline) return <code className={className} {...props}>{children}</code>;
                            return (
                              <div className="relative group my-3">
                                <SyntaxHighlighter
                                  style={oneDark}
                                  language={language || 'bash'}
                                  PreTag="div"
                                  className="!rounded-lg !border !border-dark-700"
                                  customStyle={{ margin: 0, borderRadius: '8px' }}
                                >
                                  {codeString}
                                </SyntaxHighlighter>
                              </div>
                            );
                          },
                          p({ children }) { return <p className="text-dark-200 leading-7 mb-3">{children}</p>; },
                          strong({ children }) { return <strong className="text-dark-50 font-semibold">{children}</strong>; },
                        }}
                      >
                        {currentStreamingText}
                      </Markdown>
                    </div>
                    <div className="typing-cursor text-dark-500 mt-1" />
                  </div>
                </div>
              )}
              {loading && !streaming && (
                <div className="flex items-center gap-2 text-dark-400 animate-fade-in">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating script...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-dark-700 p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-dark-800 border border-dark-700 rounded-xl p-2 focus-within:border-scriptgpt-600 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadScript}
                accept=".sh,.bash,.shell,.txt"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-colors flex-shrink-0"
                title="Upload .sh file"
              >
                <Upload className="w-5 h-5" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me what you want your shell script to do..."
                className="flex-1 bg-transparent text-dark-100 placeholder:text-dark-500 resize-none outline-none py-2 px-1 max-h-32 min-h-[40px]"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2 bg-scriptgpt-600 hover:bg-scriptgpt-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-dark-600 mt-2 text-center">
              ScriptGPT creates Bash/Shell scripts. Upload a .sh file or describe what you need.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
