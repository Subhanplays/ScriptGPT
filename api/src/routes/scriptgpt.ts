import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { trackUsage, logUsage } from '../middleware/usage';
import { SCRIPTGPT_SYSTEM_PROMPT, SCRIPT_IDEAS_PROMPT } from '../utils/scriptgpt-prompt';

const router = Router();

const isBashRelated = (message: string): boolean => {
  const lower = message.toLowerCase();
  const bashKeywords = [
    'script', 'bash', 'shell', 'sh', '.sh', 'linux', 'unix', 'command',
    'terminal', 'console', 'docker', 'grep', 'awk', 'sed', 'cron',
    'bash script', 'shell script', 'install', 'deploy', 'automate',
    'backup', 'monitor', 'parse', 'process', 'pipeline', 'pipe',
    'chmod', 'chown', 'ssh', 'scp', 'rsync', 'tar', 'gzip',
    'apt', 'yum', 'dnf', 'pacman', 'systemctl', 'systemd',
    'nginx', 'apache', 'mysql', 'postgresql', 'redis',
    'dockerfile', 'docker-compose', 'kubernetes', 'k8s',
    'aws', 'gcp', 'azure', 'terraform', 'ansible',
    'vi', 'vim', 'nano', 'emacs', 'git',
    'idea', 'ideas', 'create', 'make', 'build', 'write',
    'generate', 'help me', 'can you', 'i need', 'i want',
    'how to', 'what is', 'explain', 'fix', 'modify', 'improve',
    'add', 'remove', 'update', 'change', 'optimize',
    'for loop', 'while loop', 'if statement', 'function',
    'variable', 'array', 'string', 'number', 'file',
    'directory', 'folder', 'path', 'permission', 'owner',
    'user', 'group', 'process', 'service', 'daemon',
    'log', 'logs', 'error', 'output', 'input', 'stdin', 'stdout', 'stderr',
    'exit', 'return', 'error handling', 'try', 'catch',
    'sed', 'awk', 'grep', 'find', 'xargs', 'cut', 'sort', 'uniq',
    'wc', 'head', 'tail', 'cat', 'less', 'more', 'echo', 'printf',
    'test', '[', '[[', 'case', 'select', 'read',
    'getopts', 'getopt', 'shift', 'unset', 'export',
    'source', '.', 'eval', 'exec', 'trap', 'wait',
    'kill', 'signal', 'pid', 'background', 'foreground', 'job',
    'fg', 'bg', 'nohup', 'screen', 'tmux',
    'ssh', 'scp', 'rsync', 'sftp', 'ftp', 'wget', 'curl',
    'git', 'svn', 'mercurial', 'hg',
    'python', 'perl', 'ruby', 'php', 'node',
    'make', 'cmake', 'gcc', 'g++', 'clang',
    'java', 'javac', 'gradle', 'maven',
    'docker', 'podman', 'container',
    'kubernetes', 'kubectl', 'helm', 'istio',
    'terraform', 'ansible', 'puppet', 'chef', 'saltstack',
    'jenkins', 'travis', 'circle', 'github actions', 'gitlab ci',
    'aws', 'gcp', 'azure', 'cloud',
    'nginx', 'apache', 'caddy', 'traefik',
    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
    'prometheus', 'grafana', 'nagios', 'zabbix',
    'systemd', 'init', 'upstart', 'sysv',
    'crontab', 'at', 'batch',
    'bash', 'zsh', 'fish', 'ksh', 'tcsh', 'csh',
    'bashrc', 'zshrc', 'profile', 'bash_profile',
    'env', 'environment', 'path', 'home',
    'tmp', 'temp', 'var', 'etc', 'usr', 'bin', 'sbin',
    'opt', 'proc', 'sys', 'dev', 'boot', 'root',
    'mount', 'umount', 'fdisk', 'lsblk', 'df', 'du',
    'ps', 'top', 'htop', 'kill', 'killall', 'pkill',
    'free', 'vmstat', 'iostat', 'sar', 'dmesg',
    'journalctl', 'systemctl', 'service',
    'ip', 'ifconfig', 'netstat', 'ss', 'ping', 'traceroute',
    'dig', 'nslookup', 'host', 'whois',
    'iptables', 'firewall', 'ufw', 'nftables',
    'openssl', 'ssl', 'tls', 'certbot', 'letsencrypt',
    'wget', 'curl', 'aria2', 'axel',
    'ssh-keygen', 'ssh-agent', 'ssh-add',
    'gpg', 'pgp', 'encrypt', 'decrypt',
    'base64', 'md5', 'sha', 'hash',
    'jq', 'yq', 'xmlstarlet', 'csvtool',
    'parallel', 'xargs', 'screen', 'tmux',
    'script', 'expect', 'unbuffer',
    'strace', 'ltrace', 'lsof', 'netcat', 'nc',
    'dd', 'cp', 'mv', 'rm', 'ln', 'touch',
    'chmod', 'chown', 'chgrp', 'umask',
    'tar', 'zip', 'unzip', 'gzip', 'bzip2', 'xz', 'zstd',
    'rsync', 'rclone', 'mc', 'midnight commander',
    'vim', 'nvim', 'emacs', 'nano', 'micro', 'code',
    'git', 'tig', 'lazygit', 'gitk', 'git-gui',
    'make', 'just', 'task', 'mage', 'invoke',
    'docker', 'podman', 'buildah', 'skopeo',
    'kubectl', 'k9s', 'lens', 'rancher',
    'terraform', 'terragrunt', 'pulumi',
    'ansible', 'ansible-playbook', 'ansible-galaxy',
    'helm', 'kustomize', 'kapp',
    'prometheus', 'alertmanager', 'grafana',
    'loki', 'tempo', 'mimir',
    'consul', 'vault', 'nomad',
    'etcd', 'zookeeper', 'raft',
    'bash', 'shell', 'scripting', 'automation',
  ];
  return bashKeywords.some((kw) => lower.includes(kw));
};

router.post('/chat', authenticate, trackUsage, async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!isBashRelated(message)) {
      return res.status(400).json({
        error: 'ScriptGPT only handles Bash/Shell scripting requests. Please ask about creating, modifying, fixing, or explaining Bash scripts.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: req.user!.id },
      });
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    } else {
      const title = message.length > 60 ? message.substring(0, 60) + '...' : message;
      conversation = await prisma.conversation.create({
        data: {
          title,
          userId: req.user!.id,
          aiProvider: 'SCRIPTGPT',
        },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
        aiProvider: 'SCRIPTGPT',
      },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    const adminKey = process.env.ADMIN_GEMINI_KEY;
    if (!adminKey) {
      return res.status(500).json({ error: 'ScriptGPT AI is not configured. Please contact the administrator.' });
    }

    const genAI = new GoogleGenerativeAI(adminKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SCRIPTGPT_SYSTEM_PROMPT,
    });

    const chat = model.startChat({
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await chat.sendMessageStream(message);
    let fullResponse = '';

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ text: '', done: true, conversationId: conversation.id })}\n\n`);
    res.end();

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: fullResponse,
        aiProvider: 'SCRIPTGPT',
        model: 'gemini-2.0-flash',
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await logUsage(
      req.user!.id,
      'SCRIPTGPT',
      'gemini-2.0-flash',
      { prompt: message.length, completion: fullResponse.length, total: message.length + fullResponse.length },
      conversation.id,
      'chat'
    );
  } catch (error) {
    console.error('ScriptGPT chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

router.post('/ideas', authenticate, trackUsage, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const adminKey = process.env.ADMIN_GEMINI_KEY;
    if (!adminKey) {
      return res.status(500).json({ error: 'ScriptGPT AI is not configured' });
    }

    const genAI = new GoogleGenerativeAI(adminKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SCRIPTGPT_SYSTEM_PROMPT,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await model.generateContentStream(SCRIPT_IDEAS_PROMPT);
    let fullResponse = '';

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();

    await logUsage(
      req.user!.id,
      'SCRIPTGPT',
      'gemini-2.0-flash',
      { prompt: 50, completion: fullResponse.length, total: 50 + fullResponse.length },
      undefined,
      'ideas'
    );
  } catch (error) {
    console.error('ScriptGPT ideas error:', error);
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

export default router;
