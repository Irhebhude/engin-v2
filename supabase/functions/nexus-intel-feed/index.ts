import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Return cached if fresh (<60s)
    const { data: recent } = await supabase
      .from('nexus_intel_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);
    if (recent && recent.length > 0) {
      const ageMs = Date.now() - new Date(recent[0].created_at).getTime();
      if (ageMs < 60_000) {
        return new Response(JSON.stringify({ items: recent, cached: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: "You are a global intelligence analyst. Generate 8 plausible breaking developments spanning technology, science, finance, geopolitics, and AI for the current moment. Mark 1-2 as anomalies (anomaly: true) if they are unusual signals." },
          { role: 'user', content: "Return ONLY JSON with key 'items', no prose." },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'emit_intel',
            parameters: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      domain: { type: 'string', enum: ['WEB', 'SCIENCE', 'FINANCE', 'GEO', 'TECH'] },
                      content: { type: 'string' },
                      anomaly: { type: 'boolean' },
                    },
                    required: ['title', 'domain', 'content', 'anomaly'],
                  },
                },
              },
              required: ['items'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'emit_intel' } },
      }),
    });
    const j = await res.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { items: [] };
    const items = parsed.items as Array<{ title: string; domain: string; content: string; anomaly: boolean }>;

    if (items.length) {
      await supabase.from('nexus_intel_feed').insert(items.map(i => ({ ...i })));
    }

    const { data: fresh } = await supabase.from('nexus_intel_feed').select('*').order('created_at', { ascending: false }).limit(8);
    return new Response(JSON.stringify({ items: fresh ?? [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
