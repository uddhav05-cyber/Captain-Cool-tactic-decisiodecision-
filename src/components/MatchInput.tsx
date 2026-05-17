import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface MatchInputProps {
  onAnalyze: (data: { url?: string; manualState?: string }) => void;
  isLoading: boolean;
  isLive: boolean;
  onToggleLive: (val: boolean) => void;
}

export default function MatchInput({ onAnalyze, isLoading, isLive, onToggleLive }: MatchInputProps) {
  const [useUrl, setUseUrl] = useState(true);
  const [url, setUrl] = useState('');
  const [manualState, setManualState] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useUrl) {
      onAnalyze({ url });
    } else {
      onAnalyze({ manualState });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      <div className="flex items-center gap-12 border-b border-white/5 px-4 mb-4">
        <button
          onClick={() => setUseUrl(true)}
          className={cn(
            "py-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative",
            useUrl ? "text-white" : "text-zinc-600 hover:text-zinc-400"
          )}
        >
          Stream Source
          {useUrl && <motion.div layoutId="input_tab" className="absolute bottom-0 inset-x-0 h-px bg-white" />}
        </button>
        <button
          onClick={() => setUseUrl(false)}
          className={cn(
            "py-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all relative",
            !useUrl ? "text-white" : "text-zinc-600 hover:text-zinc-400"
          )}
        >
          Manual Override
          {!useUrl && <motion.div layoutId="input_tab" className="absolute bottom-0 inset-x-0 h-px bg-white" />}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {useUrl ? (
          <div className="space-y-6">
            <div className="flex justify-between items-end px-1">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Cricbuzz Protocol</p>
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-medium italic">Active scraping connection required</p>
              </div>
              <label className="flex items-center gap-4 cursor-pointer group">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Real-time Sync</span>
                <div 
                  onClick={() => onToggleLive(!isLive)}
                  className={cn(
                    "w-8 h-4 rounded-full p-1 transition-all duration-300 border",
                    isLive ? "border-zinc-400 bg-zinc-400" : "border-white/10 bg-transparent"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isLive ? "bg-[#0a0a0a] translate-x-4" : "bg-zinc-800"
                  )} />
                </div>
              </label>
            </div>
            <input
              type="url"
              placeholder="ENTRY_URL_001"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[#0a0a0a] border-b border-white/10 text-white text-xl p-4 focus:border-white outline-none placeholder:text-zinc-900 transition-all font-mono"
              required
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-end px-1">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Manual Entry Data</p>
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-medium italic">Construct simulation state</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setManualState("MI vs CSK. 19th Over. MI 182/6. Dhoni is keeping. Pathirana has 1 over left. Deshpande has 1. Hardik is on strike. Pitch is flat but dew is heavy.")}
                  className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 border border-white/5 px-3 py-1.5 rounded transition-all"
                >
                  Scenario: Death Over
                </button>
                <button
                  type="button"
                  onClick={() => setManualState("RCB vs KKR. Powerplay over 4. Kohli on 34(12). Narine just came on. Pitch is turning square. KKR has 1 impact sub left.")}
                  className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 border border-white/5 px-3 py-1.5 rounded transition-all"
                >
                  Scenario: Turning Pitch
                </button>
              </div>
            </div>
            <textarea
              placeholder="Example: Innings 2, Over 14.2, 145/4. Striker: SKY 45(22). Bowler: Rashid Khan (2 overs left). Venue: Wankhede. Pitch: Flat. Dew: Heavy. Impact Player: Available."
              value={manualState}
              onChange={(e) => setManualState(e.target.value)}
              rows={4}
              className="w-full bg-[#0a0a0a] border-b border-white/10 text-white text-lg p-4 focus:border-white outline-none placeholder:text-zinc-900 transition-all resize-none font-mono"
              required
            />
          </div>
        )}

        <div className="flex justify-center pt-8">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative px-12 py-4 text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-400 hover:text-white transition-all disabled:opacity-20"
          >
            {isLoading ? "Executing..." : "[ Initiate Analysis ]"}
            <div className="absolute inset-0 border border-white/5 group-hover:border-white/20 transition-colors" />
          </button>
        </div>
      </form>
    </div>
  );
}
