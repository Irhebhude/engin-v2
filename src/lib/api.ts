const GROQ_KEY = import.meta.env.VITE_GROQ_KEY

const KEY = 'poi_searches'

export async function runSearch(query) {

  localStorage.setItem(KEY, JSON.stringify([...JSON.parse(localStorage.getItem(KEY) || '[]'), query].slice(-100)))

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {

    method: 'POST',

    headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },

    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: query }] })

  })

  const data = await res.json()

  return { result: data.choices[0].message.content }

}

export async function getSearches() {

  return JSON.parse(localStorage.getItem(KEY) || '[]')

}
