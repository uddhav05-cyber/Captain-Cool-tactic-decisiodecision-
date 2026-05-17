import React from 'react';
import { BarChart3, Target, UserMinus, Percent, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatsData {
  key_stats: string;
  batter_weakness: string;
  bowler_recommendation: string;
  win_probability_current: number;
  matchups?: { batter: string; bowler: string; advantage: string }[];
}

interface StatsPanelProps {
  data: StatsData;
}

export default function StatsPanel({ data }: StatsPanelProps) {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 mb-32">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5">
        <StatCard 
          title="Match Synopsis" 
          value={data.key_stats} 
          isImpactful
        />
        <StatCard 
          title="Tactical Vulnerability" 
          value={data.batter_weakness} 
        />
        <StatCard 
          title="Recommended Deployment" 
          value={data.bowler_recommendation} 
        />
        <StatCard 
          title="Success Index" 
          value={`${data.win_probability_current}%`} 
          isLarge
        />
      </div>

      {data.matchups && data.matchups.length > 0 && (
        <div className="space-y-8 px-4 md:px-0">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.5em] whitespace-nowrap">Target Matchups</span>
            <div className="h-[1px] flex-1 bg-white/5" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {data.matchups.map((m, idx) => (
              <div key={idx} className="space-y-4 cursor-default group">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <span>{m.batter}</span>
                  <span className="text-zinc-800 text-[8px]">vs</span>
                  <span>{m.bowler}</span>
                </div>
                <div className="text-[9px] text-zinc-600 font-medium uppercase tracking-[0.2em] leading-normal group-hover:text-zinc-500">
                  {m.advantage}
                </div>
                <div className="h-[1px] w-4 bg-zinc-800 group-hover:w-8 transition-all" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, isLarge, isImpactful }: { title: string, value: string, isLarge?: boolean, isImpactful?: boolean }) {
  return (
    <div className="bg-[#0a0a0a] p-8 space-y-6 cursor-default">
      <h4 className={cn(
        "font-bold uppercase text-[9px] tracking-[0.4em]",
        isImpactful ? "text-zinc-200" : "text-zinc-600"
      )}>
        {title}
      </h4>
      
      <div className={cn(
        "leading-relaxed transition-colors",
        isLarge ? "text-5xl font-bold tracking-tighter text-white" : "text-[11px] text-zinc-400 font-medium uppercase tracking-widest",
        isImpactful && "text-zinc-300"
      )}>
        {value}
      </div>
    </div>
  );
}
