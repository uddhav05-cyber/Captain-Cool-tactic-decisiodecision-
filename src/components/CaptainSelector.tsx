import React from 'react';
import { CaptainPersona } from '../lib/types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface CaptainSelectorProps {
  selected: CaptainPersona;
  onSelect: (p: CaptainPersona) => void;
}

const captains = [
  {
    id: CaptainPersona.DHONI,
    name: "MS Dhoni",
    bio: "The Mastermind. Cool under pressure, trusts his instincts.",
    activeClass: "border-white bg-white/5",
  },
  {
    id: CaptainPersona.ROHIT,
    name: "Rohit Sharma",
    bio: "The Aggressor. Fearless, backs power hitters, makes bold changes.",
    activeClass: "border-white bg-white/5",
  },
  {
    id: CaptainPersona.HARDIK,
    name: "Hardik Pandya",
    bio: "The Maverick. Unconventional and sees unique angles.",
    activeClass: "border-white bg-white/5",
  },
  {
    id: CaptainPersona.PONTING,
    name: "Ricky Ponting",
    bio: "The Tactician. Ruthless precision and identifies weaknesses.",
    activeClass: "border-white bg-white/5",
  },
  {
    id: CaptainPersona.KOHLI,
    name: "Virat Kohli",
    bio: "The Warrior. Intense and leads with aggressive intent.",
    activeClass: "border-white bg-white/5",
  }
];

export default function CaptainSelector({ selected, onSelect }: CaptainSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/5 w-full max-w-7xl mx-auto border border-white/5">
      {captains.map((cap) => (
        <button
          key={cap.id}
          onClick={() => onSelect(cap.id)}
          className={cn(
            "p-8 text-left transition-all relative group bg-[#0a0a0a]",
            selected === cap.id ? "z-10" : "hover:bg-white/[0.02]"
          )}
        >
          <div className="space-y-4">
            <h3 className={cn(
              "text-[10px] font-bold uppercase tracking-[0.4em] transition-colors",
              selected === cap.id ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
            )}>
              {cap.name}
            </h3>
            <p className={cn(
              "text-[9px] leading-relaxed font-medium uppercase tracking-widest",
              selected === cap.id ? "text-zinc-400" : "text-zinc-700 group-hover:text-zinc-500"
            )}>
              {cap.bio}
            </p>
          </div>
          {selected === cap.id && (
            <motion.div 
              layoutId="selector"
              className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-white" 
            />
          )}
        </button>
      ))}
    </div>
  );
}
