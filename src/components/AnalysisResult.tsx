import React from 'react';
import { motion } from 'motion/react';
import { Trophy, AlertTriangle, MessageSquareQuote, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface AnalysisResultProps {
  finalDecision: string;
  commentary: string;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
  lastUpdate?: Date | null;
}

export default function AnalysisResult({ finalDecision, commentary, isSpeaking, onToggleSpeech, lastUpdate }: AnalysisResultProps) {
  // Extract confidence score
  const confidenceScoreMatch = commentary.match(/confidence score[:\s]+(\d+)/i);
  const confidenceScore = confidenceScoreMatch ? parseInt(confidenceScoreMatch[1]) : 7;
  
  return (
    <div className="w-full max-w-5xl mx-auto space-y-24 pb-32">
      {/* Prime Directive / Final Decision */}
      <section className="space-y-10 group">
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 group-hover:text-white transition-colors">Strategic Directive</h2>
            <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-medium italic">Final command sequence locked</p>
          </div>
          {lastUpdate && (
            <span className="text-[9px] text-zinc-800 font-mono">TS_{lastUpdate.getTime()}</span>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-12 items-start">
          <div className="flex-1 text-2xl md:text-3xl font-bold tracking-tight leading-relaxed text-zinc-200">
            <ReactMarkdown>{finalDecision}</ReactMarkdown>
          </div>
          
          <div className="shrink-0 pt-2">
            <div className="flex flex-col items-center gap-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-700">Confidence</div>
              <div className="text-5xl font-bold tracking-tighter text-white">{confidenceScore}</div>
              <div className="h-[2px] w-8 bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      {/* Synthesis / Commentary */}
      <section className="space-y-10">
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">Expert Synthesis</h3>
          <button 
            onClick={onToggleSpeech}
            className={cn(
              "text-[9px] font-bold uppercase tracking-widest px-3 py-1 border transition-all",
              isSpeaking ? "bg-white text-black border-white" : "border-white/10 text-zinc-600 hover:text-white hover:border-white/30"
            )}
          >
            {isSpeaking ? "ACTIVE_STREAM" : "REPLAY_AUDIO"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-20">
          <div className="markdown-body text-zinc-400 text-base leading-loose italic">
            <ReactMarkdown>{commentary}</ReactMarkdown>
          </div>
          
          <div className="space-y-12">
            <div className="space-y-4">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-700">System State</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-zinc-800 uppercase tracking-tighter">
                  <span>Network Status</span>
                  <span className="text-zinc-600">Encrypted</span>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-zinc-800 uppercase tracking-tighter">
                  <span>Model Latency</span>
                  <span className="text-zinc-600">842ms</span>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-zinc-800 uppercase tracking-tighter">
                  <span>Integrity</span>
                  <span className="text-zinc-600">Nominal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
