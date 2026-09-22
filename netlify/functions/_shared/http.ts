// Same-origin by construction (the frontend calls /.netlify/functions/<name>
// on its own domain), so CORS doesn't apply here the way it did when these
// lived on api.<project>.supabase.co — these headers are just defensive
// (e.g. for `netlify dev` on a different local port).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export { corsHeaders };
