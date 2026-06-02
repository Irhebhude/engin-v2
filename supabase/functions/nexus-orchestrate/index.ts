import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const AGENTS = {
  analyst: "You are the world's most advanced research analyst. Given the mission, extract every verifiable fact, data point, and expert consensus. Be exhaustive. Cite domains. Structure with headers. Max 400 words.",
  strategist: "You are the world's greatest strategic planner. Given the mission, produce a complete action plan: immediate steps, mid-term moves, long-term strategy. Number every action. Be specific and executable. Max 400 words.",
  critic: "You are the world's sharpest critical thinker. Given the mission, identify every assumption, flaw, risk, blind spot, and counter-argument. Be ruthless. Label each criticism by severity: LOW / MEDIUM / HIGH. Max 400 words.",
  futurist: "You are the world's foremost futurist. Given the mission, project its implications 1 year, 5 years, 20 years, and 100 years from now. Identify second-order effects, paradigm shifts, and civilizational consequences. Max 400 words.",
};

const SYNTHESIZER = "You are the OMEGA SYNTHESIZER — the final intelligence layer. You have received outputs from 4 specialist agents. Merge them into the single most complete, accurate, actionable intelligence report ever produced. Structure with these exact section headers: ## Executive Summary, ## Key Findings, ## Strategic Action Plan, ## Risk Assessment, ## Future Outlook, ## Confidence Score. End with an integer 0-100 on its own line after 'Confidence Score:'.";

async function callAI(system: string, user: string): Promise<string> {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { mission, user_id } = await req.json();
    if (!mission || !user_id) return new Response(JSON.stringify({ error: 'mission and user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: missionRow } = await supabase.from('nexus_missions').insert({ user_id, query: mission }).select().single();
    const mission_id = missionRow!.id;

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
        send({ type: 'mission', mission_id });

        const entries = Object.entries(AGENTS) as [string, string][];
        const results: Record<string, string> = {};
        await Promise.all(entries.map(async ([name, sys]) => {
          send({ type: 'agent_start', agent: name });
          try {
            const out = await callAI(sys, mission);
            results[name] = out;
            await supabase.from('nexus_agent_outputs').insert({ mission_id, user_id, agent_name: name, output: out });
            send({ type: 'agent_done', agent: name, output: out });
          } catch (e) {
            send({ type: 'agent_error', agent: name, error: String(e) });
          }
        }));

        send({ type: 'synthesizer_start' });
        try {
          const merged = Object.entries(results).map(([n, o]) => `### ${n.toUpperCase()}\n${o}`).join('\n\n');
          const syn = await callAI(SYNTHESIZER, `MISSION: ${mission}\n\nAGENT OUTPUTS:\n${merged}`);
          await supabase.from('nexus_agent_outputs').insert({ mission_id, user_id, agent_name: 'synthesizer', output: syn });

          // Extract confidence + store memory
          const m = syn.match(/Confidence Score[:\s]+(\d+)/i);
          const confidence = m ? parseInt(m[1]) : 75;
          const firstFinding = (syn.match(/## Key Findings\s+([\s\S]*?)(##|$)/i)?.[1] ?? '').slice(0, 500).trim();
          if (firstFinding) {
            await supabase.from('nexus_memory').insert({ user_id, insight: firstFinding, domain: 'mission', confidence });
          }
          await supabase.from('nexus_missions').update({ status: 'complete' }).eq('id', mission_id);
          send({ type: 'synthesizer_done', output: syn, confidence });
        } catch (e) {
          send({ type: 'synthesizer_error', error: String(e) });
        }

        send({ type: 'done' });
        controller.close();
      },
    });

    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
