export enum CaptainPersona {
  DHONI = "DHONI",
  ROHIT = "ROHIT",
  HARDIK = "HARDIK",
  PONTING = "PONTING",
  KOHLI = "KOHLI"
}

export interface StatsData {
  key_stats: string;
  batter_weakness: string;
  bowler_recommendation: string;
  win_probability_current: number;
  matchups?: { batter: string; bowler: string; advantage: string }[];
}

export interface TacticalCall {
  id: string;
  timestamp: Date;
  scoreState: string;
  persona: CaptainPersona;
  analystData: StatsData;
  strategistCall: string;
  commentary: string;
}
