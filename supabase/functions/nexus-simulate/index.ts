import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { topic } = await req.json();
    if (!topic) return new Response(JSON.stringify({ error: 'topic required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const scenarioSchema = {
      type: 'object',
      properties: {
        probability: { type: 'number' },
        outcomes: { type: 'array', items: { type: 'string' } },
        timeline: { type: 'array', items: { type: 'object', properties: { year: { type: 'string' }, event: { type: 'string' } }, required: ['year', 'event'] } },
        cascadeEffects: { type: 'array', items: { type: 'string' } },
      },
      required: ['probability', 'outcomes', 'timeline', 'cascadeEffects'],
    };

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a predictive simulation engine. Model 3 timeline scenarios for the given topic. Probabilities should sum to ~100.' },
          { role: 'user', content: `Topic: ${topic}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'emit_scenarios',
            parameters: {
              type: 'object',
              properties: { optimistic: scenarioSchema, realistic: scenarioSchema, catastrophic: scenarioSchema },
              required: ['optimistic', 'realistic', 'catastrophic'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'emit_scenarios' } },
      }),
    });
    const j = await res.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return new Response(args ?? '{}', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
