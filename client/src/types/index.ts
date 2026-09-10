export interface User {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  geminiModel?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UsageInfo {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  totalUsed?: number;
  recentLogs?: UsageLog[];
}

export interface UsageLog {
  id: string;
  userId: string;
  conversationId?: string;
  aiProvider: string;
  model?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestType?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  aiProvider: string;
  model?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  user?: { id: string; username: string; email: string };
  _count?: { messages: number };
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  aiProvider?: string;
  model?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalUsage: number;
  dailyUsage: number;
  weeklyUsage: number;
  recentUsers: User[];
  usageByProvider: { aiProvider: string; _count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  dailyLimit: number;
  monthlyLimit: number;
  createdAt: string;
  _count: { conversations: number; usageLogs: number };
}

export interface GeminiModel {
  id: string;
  name: string;
  description: string;
}

export interface SystemLog {
  id: string;
  level: string;
  message: string;
  metadata?: any;
  createdAt: string;
}
