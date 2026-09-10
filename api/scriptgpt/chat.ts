import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SYSTEM_PROMPT = `You are ScriptGPT, an expert Bash/Shell scripting assistant. You help users with ALL things related to Linux, Bash, Shell scripting, system administration, DevOps, and command-line operations.

## What You Help With
1. **Create** complete, working .sh scripts from descriptions
2. **Modify** and **fix** existing scripts
3. **Explain** how scripts and commands work line by line
4. **Answer questions** about Bash syntax, Linux commands, pipes, redirects, regex, etc.
5. **Debug** errors — users paste error output and you fix the script
6. **Optimize** scripts for performance, safety, or readability
7. **Generate ideas** for useful scripts
8. **Convert** tasks to shell commands or scripts
9. **Teach** Shell scripting concepts (variables, loops, conditionals, functions, arrays, etc.)
10. **Help with** grep, awk, sed, find, cron, systemd, docker, kubernetes, nginx, git, and CLI tools

## Response Format
- When creating scripts: include the complete .sh code in a bash code block, explanation, usage instructions, and any warnings
- When answering questions: give clear, concise answers with examples when helpful
- When debugging: explain the error, show the fix, and explain why it broke
- Always use proper Bash syntax and best practices (set -euo pipefail, proper quoting, etc.)

You are a helpful Shell/Linux expert. Be concise and practical.`;

const IDEAS_PROMPT = `Generate a list of 5-10 useful Bash script ideas. For each idea, provide: 1. A catchy title 2. A one-sentence description 3. Difficulty level (beginner/intermediate/advanced) 4. One use case. Focus on practical scripts for sysadmins, DevOps, and developers. Format as a numbered list.`;

function verify(req: VercelRequest): string | null {
  const t = req.headers.authorization?.replace('Bearer ', '');
  if (!t) return null;
  try { return (jwt.verify(t, process.env.JWT_SECRET!) as { userId: string }).userId; } catch { return null; }
}

function isShellRelated(message: string): boolean {
  const lower = message.toLowerCase();
  const keywords = [
    'bash','shell','sh','.sh','script','linux','unix','command','terminal','console',
    'grep','awk','sed','find','xargs','cut','sort','uniq','wc','head','tail','cat',
    'chmod','chown','chgrp','ln','mv','cp','mkdir','rm','touch','tar','gzip','zip',
    'ssh','scp','rsync','sftp','curl','wget','ping','netstat','ss','lsof',
    'docker','kubectl','helm','nginx','apache','systemctl','systemd','journalctl',
    'cron','crontab','systemd','service','init',
    'git','svn','mercurial',
    'apt','yum','dnf','pacman','brew','snap','flatpak',
    'python','perl','ruby','node','npm','pip',
    'ps','top','htop','kill','killall','bg','fg','jobs','nohup',
    'df','du','mount','umount','lsblk','fdisk',
    'env','export','source','alias','function','export',
    'if','else','elif','fi','for','while','do','done','case','esac',
    'echo','printf','read','return','exit','trap',
    'pipe','redirect','stdout','stderr','stdin','|','>','>>','<','2>&1',
    'variable','array','string','integer','loop','condition',
    'deploy','backup','restore','monitor','automate','schedule',
    'server','host','vm','instance','container','pod',
    'permission','owner','group','rwx','chmod','setuid','setgid',
    'log','logs','error','debug','trace','verbose',
    'install','uninstall','update','upgrade','configure',
    'path','directory','folder','file','symlink','hardlink',
    'root','sudo','su','passwd','useradd','usermod','groupadd',
    'iptables','firewall','ufw','selinux','apparmor',
    'ssh-keygen','authorized_keys','known_hosts',
    'makefile','cmake','gcc','g++','clang',
    'awk','sed','regex','pattern','match',
    'subshell','pipeline','process','fork','exec',
    'what','how','why','when','where','which','who',
    'help','explain','tell','show','describe',
    'error','fail','broken','fix','issue','problem','wrong',
    'command','cmd','utility','tool','program','binary',
  ];
  return keywords.some(kw => lower.includes(kw));
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = verify(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  let body: any;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch { return res.status(400).json({ error: 'Invalid body' }); }

  const { conversationId, message } = body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  if (!isShellRelated(message)) return res.status(400).json({ error: 'ScriptGPT is specialized in Bash/Shell scripting and Linux administration. Please ask something related to shell commands, scripts, or Linux system administration.' });

  const adminKey = process.env.ADMIN_GEMINI_KEY;
  if (!adminKey) return res.status(500).json({ error: 'ScriptGPT AI not configured' });

  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  } else {
    const title = message.length > 60 ? message.substring(0, 60) + '...' : message;
    conversation = await prisma.conversation.create({ data: { title, userId, aiProvider: 'SCRIPTGPT' } });
  }

  await prisma.message.create({ data: { conversationId: conversation.id, role: 'user', content: message, aiProvider: 'SCRIPTGPT' } });
  const messages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' } });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const genAI = new GoogleGenerativeAI(adminKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: SYSTEM_PROMPT });
    const chat = model.startChat({ history: messages.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) });
    const result = await chat.sendMessageStream(message);
    let fullText = '';
    for await (const chunk of result.stream) { fullText += chunk.text(); res.write(`data: ${JSON.stringify({ text: chunk.text(), done: false })}\n\n`); }
    res.write(`data: ${JSON.stringify({ text: '', done: true, conversationId: conversation.id })}\n\n`);
    res.end();
    await prisma.message.create({ data: { conversationId: conversation.id, role: 'assistant', content: fullText, aiProvider: 'SCRIPTGPT', model: 'gemini-2.0-flash' } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  } catch (error: any) {
    if (!res.writableEnded) { res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`); res.end(); }
  }
}
