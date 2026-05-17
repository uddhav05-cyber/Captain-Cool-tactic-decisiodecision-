import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ai } from "./src/lib/gemini.ts";
import { AGENT_PROMPTS, PERSONA_PROMPTS, ANALYST_SCHEMA } from "./src/lib/agents.ts";
import { CaptainPersona } from "./src/lib/types.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to call Gemini with retry logic for 429s
  const callGeminiWithRetry = async (fn: () => Promise<any>, retries = 5, delay = 2000): Promise<any> => {
    try {
      return await fn();
    } catch (error: any) {
      const isQuota = error.message?.includes("429") || error.message?.toLowerCase().includes("quota");
      if (isQuota && retries > 0) {
        console.log(`[Gemini] Quota hit, waiting ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponential backoff
        return callGeminiWithRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  // API route for multi-agent analysis
  app.post("/api/analyze", async (req, res) => {
    const { url, manualState, persona = CaptainPersona.DHONI, history = [] } = req.body;
    
    // Format history for prompt context
    const historyContext = history.length > 0 
      ? `\n\nRecent History:\n${history.map((h: any) => `- Score: ${h.score}, Decision: ${h.decision}`).join('\n')}`
      : "";

    if (!process.env.GEMINI_API_KEY) {
      console.error("[Server] Missing GEMINI_API_KEY");
      return res.status(500).json({ error: "Gemini API key is not configured in the environment." });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering

    const sendChunk = (agent: string, data: any) => {
      try {
        if (res.writableEnded || isAborted) return;
        res.write(`data: ${JSON.stringify({ agent, data, timestamp: Date.now() })}\n\n`);
        if ((res as any).flush) (res as any).flush();
      } catch (e) {
        console.error("[Server] Failed to write chunk:", e);
      }
    };

    // Presence / Keep-alive heartbeat
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      }
    }, 10000); // Shorter heartbeat for better connectivity checks

    let isAborted = false;
    req.on('close', () => {
      isAborted = true;
      clearInterval(heartbeat);
      console.log("[Server] SSE Connection closed by client");
    });

    try {
      // Small buffer to ensure client has connected and headers are flushed
      await new Promise(resolve => setTimeout(resolve, 200));

      // Use gemini-1.5-flash for maximum reliability and quota
      const flashModel = "gemini-1.5-flash";
      const proModel = "gemini-1.5-pro";
      
      console.log(`[Server] Analysis started for persona: ${persona}`);
      
      if (isAborted) return;
      let matchContext = manualState;

      // Stage 0: Context Extraction from URL if provided
      if (url) {
        if (isAborted) return;
        console.log(`[Server] Scouting live data: ${url}`);
        sendChunk("extractor", "Scouting match data from live feed...");
        try {
          console.log("[Server] Calling Gemini for Context Extraction...");
          const extractionResponse = await callGeminiWithRetry(() => ai.models.generateContent({
            model: flashModel,
            contents: [{ role: 'user', parts: [{ text: `Task: Analyze the current live match state from this page: ${url}. Provide a summary of Score, overs, wickets, current batters, upcoming bowlers, venue, and pitch conditions. If the match hasn't started or is over, state the status.` }] }],
            config: {
              tools: [{ googleSearch: {} }]
            }
          }));
          matchContext = extractionResponse.text || "Could not extract specific match data from the URL.";
          console.log(`[Server] Context Extracted: ${matchContext.substring(0, 50)}...`);
        } catch (err: any) {
          console.error("[Server] Scout Error:", err.message || err);
          // If googleSearch failed or hit quota, try a plain prompt without tools as fallback
          try {
            console.log("[Server] Retrying scout without tools...");
            const fallbackResponse = await callGeminiWithRetry(() => ai.models.generateContent({
              model: flashModel,
              contents: [{ role: 'user', parts: [{ text: `What is the current match score and state for this URL: ${url}? (Based on your training data or basic URL analysis)` }] }]
            }));
            matchContext = fallbackResponse.text || `Provided URL: ${url}. (Auto-extraction failed)`;
            console.log("[Server] Fallback Context Success");
          } catch (innerErr) {
            console.error("[Server] Fallback Scout failed too");
            matchContext = `Provided URL: ${url}. (Connection to AI failed during extraction)`;
          }
        }
        sendChunk("extractor_done", matchContext);
        await new Promise(r => setTimeout(r, 1500)); 
      }

      // Stage 1: Stats Analyst
      if (isAborted) return;
      console.log("[Server] Starting Analyst Agent...");
      sendChunk("analyst", "Agent 1: Fetching situational stats & records...");
      let statsResponse;
      try {
        console.log("[Server] Calling Gemini for Stats Analysis...");
        statsResponse = await callGeminiWithRetry(() => ai.models.generateContent({
          model: flashModel,
          contents: [{ role: 'user', parts: [{ text: `Match State Context: ${matchContext}${historyContext}\n\nTask: Analyze situational stats, player form, and matchups for this specific phase of the match. Use search if needed for recent records.` }] }],
          config: {
            systemInstruction: AGENT_PROMPTS.STATS_ANALYST,
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: ANALYST_SCHEMA
          }
        }));
      } catch (err: any) {
        console.error("[Server] Analyst Tool Error:", err.message || err);
        console.log("[Server] Retrying Analyst without tools...");
        statsResponse = await callGeminiWithRetry(() => ai.models.generateContent({
          model: flashModel,
          contents: [{ role: 'user', parts: [{ text: `Match State Context: ${matchContext}${historyContext}\n\nTask: Analyze situational stats, player form, and matchups. Provide output in JSON format matching the expected schema.` }] }],
          config: {
            systemInstruction: AGENT_PROMPTS.STATS_ANALYST,
            responseMimeType: "application/json",
            responseSchema: ANALYST_SCHEMA
          }
        }));
      }

      let statsData;
      try {
        const rawText = statsResponse.text || "{}";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        statsData = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      } catch (e) {
        console.error("[Server] JSON Parse Error for Stats:", e);
        statsData = { key_stats: "Error parsing stats", batter_weakness: "Unknown", bowler_recommendation: "Unknown", win_probability_current: 50 };
      }
      console.log("[Server] Analyst Done");
      sendChunk("analyst_done", statsData);
      await new Promise(r => setTimeout(r, 2000));

      // Stage 2: Strategist (Initial Call)
      if (isAborted) return;
      console.log(`[Server] Starting Strategist Agent (${persona})...`);
      sendChunk("strategist", `Agent 2: ${persona} formulating tactical move...`);
      const strategistResponse = await callGeminiWithRetry(() => ai.models.generateContent({
        model: flashModel,
        contents: [{ role: 'user', parts: [{ text: `Stats Analysis: ${JSON.stringify(statsData)}\nMatch Context: ${matchContext}${historyContext}\n\nWhat is your tactical call? Respond as the selected personality.` }] }],
        config: {
          systemInstruction: PERSONA_PROMPTS[persona as CaptainPersona]
        }
      }));
      const initialMove = strategistResponse.text || "No specific tactics proposed.";
      sendChunk("strategist_done", initialMove);
      await new Promise(r => setTimeout(r, 2000));

      // Stage 3: Devil's Advocate
      if (isAborted) return;
      sendChunk("advocate", "Agent 3: Challenging tactical flaws...");
      const advocateResponse = await callGeminiWithRetry(() => ai.models.generateContent({
        model: flashModel,
        contents: [{ role: 'user', parts: [{ text: `Strategist's Move: ${initialMove}\nStats: ${JSON.stringify(statsData)}` }] }],
        config: {
          systemInstruction: AGENT_PROMPTS.DEVILS_ADVOCATE
        }
      }));
      const challenge = advocateResponse.text || "No major flaws found in simple analysis.";
      sendChunk("advocate_done", challenge);
      await new Promise(r => setTimeout(r, 2000));

      // Stage 4: Strategist Responds
      if (isAborted) return;
      sendChunk("strategist_defense", "Agent 2: Finalizing tactical consensus...");
      const strategistDefense = await callGeminiWithRetry(() => ai.models.generateContent({
        model: flashModel,
        contents: [{ role: 'user', parts: [{ text: `Initial Move: ${initialMove}\nChallenge received: ${challenge}\n\nFinalize your tactical call. Address the challenge if valid, otherwise double down on your logic. Be decisive.` }] }],
        config: {
          systemInstruction: PERSONA_PROMPTS[persona as CaptainPersona]
        }
      }));
      const finalMove = strategistDefense.text || initialMove;
      sendChunk("strategist_defense_done", finalMove);
      await new Promise(r => setTimeout(r, 2000));

      // Stage 5: Commentator
      if (isAborted) return;
      sendChunk("commentator", "Agent 4: Narrative Synthesis (Harsha Bhogle)...");
      const commentatorResponse = await callGeminiWithRetry(() => ai.models.generateContent({
        model: flashModel,
        contents: [{ role: 'user', parts: [{ text: `Final Call: ${finalMove}\nChallenge proposed: ${challenge}\nStats: ${JSON.stringify(statsData)}\n\nDeliver the final Harsha-style commentary.` }] }],
        config: {
          systemInstruction: AGENT_PROMPTS.COMMENTATOR
        }
      }));
      const finalCommentary = commentatorResponse.text || "What a game we have on our hands!";
      sendChunk("commentator_done", finalCommentary);

      res.write(`data: ${JSON.stringify({ status: "complete" })}\n\n`);
      res.end();

    } catch (error: any) {
      console.error("Analysis Error:", error);
      let message = error.message || "An unknown error occurred";
      if (message.includes("429") || message.toLowerCase().includes("quota")) {
        message = "Gemini API Quota Exceeded. Please wait a minute and try again.";
      }
      sendChunk("error", message);
      res.end();
    }
  });

  // API route for lightweight score fetching (polling)
  app.post("/api/fetch-score", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "API key missing" });
    }

    try {
      const modelId = "gemini-1.5-flash";
      const extractionResponse = await callGeminiWithRetry(() => ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: `Extract the current live score and match state from this page: ${url}. Return ONLY the current score, overs, and status. Be extremely concise.` }] }],
        config: {
          // Poll without tools to save critical quota
          tools: [] 
        }
      }), 2, 3000); 
      res.json({ scoreState: extractionResponse.text || "No live data available at the moment." });
    } catch (error: any) {
      console.error("[Server] Score Fetch Error:", error);
      // Simplify error message for the client
      let message = "Network error while polling";
      if (error.message?.includes("finish_reason: RECITATION")) {
        message = "Copyright restriction on data extraction";
      } else if (error.message?.includes("SAFETY")) {
        message = "Safety filters blocked the score extraction";
      } else if (error.message?.includes("quota") || error.message?.includes("429")) {
        message = "API quota exceeded";
      }
      res.status(500).json({ error: message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly handle index.html in dev mode if Vite middleware doesn't catch it
    // This ensures that the SPA fallback works correctly even when the middleware is mounted late
    app.get('*', async (req, res, next) => {
      // Skip for API routes and files with extensions (assets)
      if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('.')) {
        return next();
      }
      
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
