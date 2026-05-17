# 🏏 Captain Cool — Multi-Agent IPL Match Strategist

> Built on Google Gemini | Google AI Studio Hackathon 2026

![Captain Cool Banner](https://private-user-images.githubusercontent.com/159876365/477138731-0aa67016-6eaf-458a-adb2-6e31a0763ed6.png)

Captain Cool is an agentic AI system that thinks like an IPL captain — making real-time tactical decisions the way Dhoni, Rohit, or Hardik would. Powered entirely by the Google Gemini stack with 4 named agents that genuinely debate before committing to a call.

---

## ✨ What Makes It Different

- 🎯 **4 named Gemini agents** that genuinely debate before committing to a call — not a single prompt wearing 4 hats
- 🧊 **Captain Persona Selector** — pick Dhoni (calm & calculated), Rohit (aggressive), or Hardik (instinctive)
- 🌐 **Live match scraping** via Gemini's URL context tool — paste a Cricbuzz URL, no manual input needed
- ⚔️ **Real agent debate shown in UI** — Strategist proposes → Devil's Advocate challenges → Strategist defends
- 📊 **Counterfactual analysis** — "If you'd bowled X instead, win probability drops ~11%"
- 🎙️ **Voice commentary** — Commentator speaks the final call aloud via Web Speech API
- 🔴 **Confidence score** — visual badge per decision (green >7, yellow 5–7, red <5)

---

## 🤖 Agent Architecture

```
User Input (Cricbuzz URL or manual match state)
                    ↓
             Orchestrator
  ┌───────────────────────────────────────┐
  │ Agent 1: Stats Analyst                │ ← Google Search tool call (live player stats)
  │ Agent 2: Strategist (persona-driven)  │ ← Proposes tactical decision
  │ Agent 3: Devil's Advocate             │ ← Challenges the call hard
  │ Agent 4: Commentator                  │ ← Harsha Bhogle-style output + counterfactual
  └───────────────────────────────────────┘
                    ↓
       Final Decision + Debate UI + Voice Output
```

### Agent System Prompts

| Agent | Role | System Prompt Summary |
|-------|------|----------------------|
| Stats Analyst | Data & Tool Use | Analyzes pitch, dew, bowler economy, batter weaknesses. Uses Google Search to fetch live player form. Outputs structured JSON with win probability. |
| Strategist (Dhoni) | Decision Maker | "Ice in your veins. Back your bowlers, never panic, always think 2 overs ahead. Make ONE decisive call." |
| Strategist (Rohit) | Decision Maker | "Bold and aggressive. Back your instincts and your big hitters. Make the attacking call others won't." |
| Strategist (Hardik) | Decision Maker | "Unconventional and fearless. Make the call that surprises everyone but works." |
| Devil's Advocate | Challenger | "Challenge the Strategist's decision hard. Find the flaw. Propose a specific alternative. Be direct." |
| Commentator | Final Output | Harsha Bhogle-style explanation with counterfactual and confidence score out of 10. |

---

## 🔄 Orchestrator Flow

```
1. Extract match state from Cricbuzz URL (Gemini URL context) or manual form
2. Stats Analyst → structured JSON with win probability
3. Strategist (selected persona) → proposed tactical decision
4. Devil's Advocate → challenge + alternative
5. Strategist → final defended decision
6. Commentator → cricket-language output + counterfactual + confidence score + voice
```

---

## 🎮 One Full Match Scenario

**Input:**
- MI vs CSK, 2nd innings, over 16, CSK need 34 off 24, 4 wickets down
- Rohit Sharma on strike (67*), Jadeja non-striker (12*)
- Bumrah has 2 overs left, Chahal has 1, flat pitch, heavy dew, Wankhede

**Stats Analyst:** Win prob MI 58% / CSK 42%. Dew negating seam movement. Jadeja vulnerable to pace outside off.

**Strategist (Dhoni mode):** Bowl Bumrah now — back him to nail yorkers despite dew.

**Devil's Advocate:** Dew renders Bumrah's seam useless. Save him for over 19. Bowl Chahal while Jadeja is on strike.

**Strategist (final):** Conceded the point. Chahal to bowl over 17.

**Commentator:** *"In dew-heavy Wankhede, Bumrah's famous seam is rendered ineffective. Rohit holds him back for the 19th — smart, calculated captaincy. Confidence: 8/10. If they'd bowled Bumrah here, win probability drops to 51%."* 🎙️

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript + Vite + CSS |
| AI Model | Google Gemini 2.5 Flash |
| SDK | `@google/genai` |
| Tool Use | Gemini built-in Google Search |
| Voice Output | Web Speech API |
| Build Environment | Google AI Studio |

---

## 🚀 Run Locally

**Prerequisites:** Node.js

```bash
# 1. Clone the repo
git clone https://github.com/uddhav05-cyber/Captain-Cool-tactic-decisiodecision-
cd Captain-Cool-tactic-decisiodecision-

# 2. Install dependencies
npm install

# 3. Add your Gemini API key
cp .env.example .env.local
# Edit .env.local → set GEMINI_API_KEY=your_key_here

# 4. Run
npm run dev
```

Get your free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

---

## 📁 Project Structure

```
/src
  /agents        ← 4 agent definitions + system prompts
  /components    ← AgentDebate, CaptainSelector, MatchInput, FinalDecision
  /lib           ← Gemini client, orchestrator logic
index.html
server.ts
vite.config.ts
.env.example
```

---

## 🔗 Links

- 🤖 [View in AI Studio](https://ai.studio/apps/adb39947-b3f1-49aa-8ee8-2d0b606f5c90)
- 📝 [Dev.to Blog](#) ← add after publishing
- 👤 Built by [Uddhav Bhople](https://github.com/uddhav05-cyber) — Microsoft Learn Student Ambassador | Google Student Ambassador | B.Tech AI/ML @ D.Y. Patil University Pune

---

> Cricket is a captain's game. Built on Gemini. 🏆
