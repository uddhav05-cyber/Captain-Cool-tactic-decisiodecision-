import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Zap, Info, Loader2, Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from './lib/utils';
import { CaptainPersona } from './lib/types';
import CaptainSelector from './components/CaptainSelector';
import MatchInput from './components/MatchInput';
import AgentDebate, { Message } from './components/AgentDebate';
import FinalDecision from './components/AnalysisResult';
import StatsPanel from './components/StatsPanel';
import { WinProbabilityChart } from './components/WinProbabilityChart';
import { TacticalCall } from './lib/types';

export default function App() {
  const [persona, setPersona] = useState<CaptainPersona>(CaptainPersona.DHONI);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  
  const [matchContext, setMatchContext] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [debateMessages, setDebateMessages] = useState<Message[]>([]);
  const [finalMove, setFinalMove] = useState<string | null>(null);
  const [commentary, setCommentary] = useState<string | null>(null);
  
  const [history, setHistory] = useState<TacticalCall[]>([]);
  const [probHistory, setProbHistory] = useState<{ time: string; prob: number }[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [isLive, setIsLive] = useState(false);
  const [lastScoreState, setLastScoreState] = useState<string | null>(null);
  const [matchUrl, setMatchUrl] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const analysisControllerRef = useRef<AbortController | null>(null);

  const handleAnalyze = async (input: { url?: string; manualState?: string }, skipReset = false) => {
    // Abort any existing analysis to prevent races
    if (analysisControllerRef.current) {
      analysisControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    analysisControllerRef.current = controller;

    setIsLoading(true);
    setAnalysisError(null);

    if (!skipReset) {
      setCurrentStep("Establishing Uplink...");
      setMatchContext(null);
      setStatsData(null);
      setDebateMessages([]);
      setFinalMove(null);
      setCommentary(null);
      stopSpeech();
    } else {
      setCurrentStep("Live Update Sync...");
    }

    if (input.url) setMatchUrl(input.url);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...input, 
          persona,
          history: history.slice(0, 3).map(h => ({
            score: h.scoreState,
            decision: h.strategistCall
          }))
        }),
        signal: controller.signal
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      console.log("[App] Reading stream...");
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("[App] Stream reader finished.");
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        
        for (const part of parts) {
          const line = part.trim();
          if (!line || line === ': heartbeat') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.replace('data: ', '');
              const json = JSON.parse(dataStr);
              handleAgentOutput(json);
            } catch (e) {
              console.warn("[App] Failed to parse SSE JSON:", line, e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("[App] Analysis aborted by user.");
        return;
      }
      console.error('Analysis failed:', error);
      setAnalysisError(error.message || "A network error occurred during analysis.");
      setCurrentStep(null);
    } finally {
      setIsLoading(false);
      setLastUpdate(new Date());
      if (!skipReset) setCurrentStep(null);
      analysisControllerRef.current = null;
    }
  };

  // Polling logic for Live Mode
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLive && matchUrl && !isLoading) {
      interval = setInterval(async () => {
        try {
          console.log("[Live] Polling score update...");
          const res = await fetch('/api/fetch-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: matchUrl }),
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
          }
          
          const data = await res.json();
          setPollingError(null); // Clear error on success
          
          if (data.scoreState && data.scoreState !== lastScoreState) {
            console.log("[Live] Match state changed! Triggering re-analysis.");
            setLastScoreState(data.scoreState);
            handleAnalyze({ url: matchUrl }, true);
          }
        } catch (err: any) {
          console.error("[Live] Polling failed:", err);
          const msg = err.message || "Failed to fetch live score update.";
          setPollingError(msg);
          
          if (msg.toLowerCase().includes("quota")) {
            console.warn("[Live] Quota hit, suspending live mode.");
            setIsLive(false);
          }
        }
      }, 60000); // 60 seconds to be more quota-friendly
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, matchUrl, isLoading, lastScoreState, persona]);

  const handleAgentOutput = (json: any) => {
    switch (json.agent) {
      case 'extractor':
        setCurrentStep("Syncing Match Data...");
        break;
      case 'extractor_done':
        setMatchContext(json.data);
        break;
      case 'analyst':
        setCurrentStep("Agent 1: Behavioral Data Analysis...");
        break;
      case 'analyst_done':
        setStatsData(json.data);
        break;
      case 'strategist':
        setCurrentStep("Agent 2: Tactical Evaluation...");
        break;
      case 'strategist_done':
        setDebateMessages(prev => [...prev, { agent: 'strategist', text: json.data }]);
        break;
      case 'advocate':
        setCurrentStep("Agent 3: Adversarial Challenge...");
        break;
      case 'advocate_done':
        setDebateMessages(prev => [...prev, { agent: 'advocate', text: json.data }]);
        break;
      case 'strategist_defense':
        setCurrentStep("Agent 2: Strategy Finalization...");
        break;
      case 'strategist_defense_done':
        setDebateMessages(prev => [...prev, { agent: 'defense', text: json.data }]);
        setFinalMove(json.data);
        break;
      case 'commentator':
        setCurrentStep("Agent 4: Narrative Synthesis...");
        break;
      case 'commentator_done':
        setCommentary(json.data);
        // Add to history when commentary (the last step) is done
        if (statsData && finalMove) {
          const newCall: TacticalCall = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            scoreState: lastScoreState || "Initial State",
            persona,
            analystData: statsData,
            strategistCall: finalMove,
            commentary: json.data
          };
          setHistory(prev => [newCall, ...prev]);
          setProbHistory(prev => {
            const newHistory = [...prev, { 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
              prob: statsData.win_probability_current 
            }];
            // Keep last 15 points
            return newHistory.slice(-15);
          });
        }
        break;
      case 'error':
        setCurrentStep(null);
        setIsLoading(false);
        setAnalysisError(json.data);
        console.error("Agent Critical Error:", json.data);
        break;
    }
  };

  useEffect(() => {
    if (commentary && !isLoading) {
      // Auto play if commentary arrives and not loading
      speak(commentary);
    }
  }, [commentary, isLoading]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    stopSpeech();
    
    // Process text to remove markdown markers for cleaner speech
    const cleanText = text.replace(/[*_#`~]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 selection:bg-zinc-100 selection:text-black font-sans tracking-tight">
      {/* Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a]" />
      </div>

      {/* Sidebar Archive */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#111] border-l border-white/5 z-50 p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-12">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Tactical Log</h3>
                <button 
                  onClick={() => setIsHistoryOpen(false)} 
                  className="text-zinc-500 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-widest"
                >
                  Close
                </button>
              </div>
              
              <div className="space-y-8">
                {history.length === 0 && (
                  <div className="text-center py-20 text-zinc-700 text-[10px] uppercase tracking-widest">Archive Empty</div>
                )}
                {history.map((call) => (
                  <div key={call.id} className="group cursor-default">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">{call.persona}</span>
                      <span className="text-[9px] text-zinc-700 font-mono tracking-tighter">{new Date(call.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 leading-relaxed group-hover:text-zinc-300 transition-colors">
                      {call.scoreState} — <span className="italic text-zinc-600">"{call.strategistCall}"</span>
                    </div>
                    <div className="mt-3 h-[1px] w-full bg-white/5" />
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="relative pt-24 pb-16 px-6 z-10">
        <div className="container mx-auto text-center space-y-8">
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-3 px-3 py-1 rounded-full border border-white/5 bg-white/[0.02]"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
            <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-[0.4em]">Multi-Agent Intelligence</span>
          </motion.div>
          
          <div className="space-y-4">
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-6xl md:text-8xl font-bold tracking-tighter leading-none"
            >
              COMMAND
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 text-sm max-w-lg mx-auto font-medium"
            >
              High-fidelity tactical analysis for elite match scenarios.
            </motion.p>
          </div>

          <div className="flex justify-center gap-6">
             {analysisError && (
               <div className="text-red-500 text-[10px] uppercase font-bold tracking-widest px-4 py-2 border border-red-500/20 bg-red-500/5 rounded">
                 Error: {analysisError}
               </div>
             )}
             <button 
               onClick={() => setIsHistoryOpen(true)}
               className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
             >
               Archive ({history.length})
             </button>
             <button 
               onClick={() => {
                 setCommentary(null);
                 setFinalMove(null);
                 setDebateMessages([]);
                 setStatsData(null);
                 setMatchContext(null);
                 stopSpeech();
               }}
               className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors"
             >
               Reset
             </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pb-32 z-10 relative">
        {/* Step 1: Persona */}
        {!isLoading && !commentary && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-20">
            <CaptainSelector selected={persona} onSelect={setPersona} />
          </motion.section>
        )}

        {/* Step 2: Input */}
        {!isLoading && !commentary && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <MatchInput 
              onAnalyze={handleAnalyze} 
              isLoading={isLoading} 
              isLive={isLive}
              onToggleLive={setIsLive}
            />
          </motion.section>
        )}

        {/* Live Indicator */}
        {(isLive && matchUrl && !isLoading) && (
          <div className="flex flex-col items-center gap-4 mb-20">
            <div className="flex items-center gap-3 px-4 py-2 border border-white/5 bg-white/[0.02] rounded-full">
              <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
                Live Stream Active
              </span>
            </div>
            
            <AnimatePresence>
              {pollingError && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-red-500 text-[9px] uppercase font-bold tracking-widest opacity-50"
                >
                  {pollingError.includes("quota") ? "Quota Limit Reached" : "Connectivity Issue"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-16">
            <div className="relative w-16 h-16">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-white rounded-full opacity-20"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 border-r-2 border-zinc-500 rounded-full opacity-40"
              />
            </div>

            <div className="flex flex-col items-center gap-8 max-w-sm w-full">
              <div className="text-center space-y-3">
                <motion.h3 
                  key={currentStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-bold uppercase tracking-[0.6em] text-white"
                >
                  {currentStep}
                </motion.h3>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-1 bg-zinc-500 rounded-full"
                    />
                  ))}
                </div>
              </div>

              <div className="w-full space-y-4">
                <LoadingStep 
                  active={currentStep?.includes("Sync")} 
                  complete={!!matchContext} 
                  label="Match State Decryption" 
                />
                <LoadingStep 
                  active={currentStep?.includes("Agent 1")} 
                  complete={!!statsData} 
                  label="Agent 1: Statistical Analysis" 
                />
                <LoadingStep 
                  active={currentStep?.includes("Agent 2") && !currentStep?.includes("Finalization")} 
                  complete={debateMessages.some(m => m.agent === 'strategist')} 
                  label="Agent 2: Tactical Proposing" 
                />
                <LoadingStep 
                  active={currentStep?.includes("Agent 3")} 
                  complete={debateMessages.some(m => m.agent === 'advocate')} 
                  label="Agent 3: Adversarial Review" 
                />
                <LoadingStep 
                  active={currentStep?.includes("Finalization") || currentStep?.includes("Narrative")} 
                  complete={!!finalMove} 
                  label="Consensus Protocol" 
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        <div className="space-y-24">
          <div className="max-w-5xl mx-auto">
            {probHistory.length > 1 && <WinProbabilityChart history={probHistory} />}
          </div>
          
          {statsData && <StatsPanel data={statsData} />}
          
          {debateMessages.length > 0 && (
            <AgentDebateContainer>
              <AgentDebate messages={debateMessages} />
            </AgentDebateContainer>
          )}

          {commentary && finalMove && (
            <FinalDecision 
              finalDecision={finalMove} 
              commentary={commentary} 
              isSpeaking={isSpeaking}
              onToggleSpeech={() => isSpeaking ? stopSpeech() : speak(commentary)}
              lastUpdate={lastUpdate}
            />
          )}
        </div>
      </main>

      <footer className="py-24 px-6 border-t border-white/5 opacity-50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-zinc-700">
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">COMMAND_SYSTEM_A1</p>
            <p className="text-[9px] uppercase tracking-widest max-w-xs leading-relaxed">High-fidelity tactical orchestration for competitive match environments.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            <span className="text-[9px] uppercase tracking-widest border-l border-zinc-800 pl-4">Release 3.1.0</span>
            <span className="text-[9px] uppercase tracking-widest border-l border-zinc-800 pl-4">SSE_ACTIVE</span>
            <span className="text-[9px] uppercase tracking-widest border-l border-zinc-800 pl-4">GPT_CORE</span>
            <span className="text-[9px] uppercase tracking-widest border-l border-zinc-800 pl-4">NODE_v20</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AgentDebateContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-6 mb-16 overflow-hidden">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.6em] whitespace-nowrap">Tactical Deliberation</span>
        <div className="h-[1px] flex-1 bg-white/5" />
      </div>
      {children}
    </div>
  );
}

function LoadingStep({ active, complete, label }: { active: boolean, complete: boolean, label: string }) {
  return (
    <div className="flex items-center gap-4 transition-opacity duration-500">
      <div className={cn(
        "w-1.5 h-1.5 rounded-full transition-all duration-500",
        complete ? "bg-white" : active ? "bg-zinc-400 animate-pulse" : "bg-zinc-800"
      )} />
      <span className={cn(
        "text-[8px] uppercase tracking-widest font-bold transition-colors duration-500",
        complete ? "text-zinc-100" : active ? "text-zinc-400" : "text-zinc-700"
      )}>
        {label}
      </span>
    </div>
  );
}
