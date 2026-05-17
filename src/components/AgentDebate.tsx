import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldAlert, Zap, Quote } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

export interface Message {
  agent: 'strategist' | 'advocate' | 'defense';
  text: string;
}

interface AgentDebateProps {
  messages: Message[];
}

export default function AgentDebate({ messages }: AgentDebateProps) {
  if (messages.length === 0) return null;

  return (
    <div className="w-full space-y-16">
      <div className="space-y-12">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-8"
            >
              <div className="space-y-1">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                  {msg.agent === 'strategist' ? "LEAD_STRAT" : 
                   msg.agent === 'advocate' ? "CHALLENGER" : "SYNTHESIS"}
                </div>
                <div className="h-[1px] w-4 bg-zinc-800" />
              </div>

              <div className={cn(
                "text-sm leading-relaxed max-w-2xl transition-colors",
                msg.agent === 'advocate' ? "text-red-400/80" : "text-zinc-400"
              )}>
                <div className="markdown-body">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
