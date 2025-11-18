// ============= CONFIG BÁSICA (SOLANA) =============
const SOL_RECEIVE = "5fExK1z7dVDabcrnJJTUfbg5SiT2nJ6XAqwwH6WyMNUY";
const RSI_MINT = "JBkpKwebb8pVUCgZmXUKcWJVLRkTEfadFddikytfrvAh";

// ============= CONFIG DE GITHUB =============
// Nota: Puedes definir los valores de GITHUB_OWNER y GITHUB_REPO aquí
// o como variables simples (no Secretos) en el panel de Cloudflare.
const GITHUB_OWNER = "TU_USUARIO_O_ORGANIZACION"; 
const GITHUB_REPO = "TU_REPOSITORIO";

// ============= FUNCIÓN DE GITHUB (DEBE IR EN worker.js) =============
async function createGithubIssue(env) {
  const GITHUB_TOKEN = env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) return { status: "FALLO", github_error: "Sin GITHUB_TOKEN" };

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;
  
  const issueBody = {
    title: "AGIWEB Dominación Completa",
    body: `La tarea de dominación universal ha finalizado con éxito a las ${new Date().toISOString()}.`,
    labels: ["automático", "reporte"]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Cloudflare-Worker-RMP-AGIWEB',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(issueBody)
    });

    if (response.ok) {
      return { status: "OK", github_status: "Incidencia creada" };
    } else {
      return { status: "FALLO", github_error: `Error HTTP ${response.status} | ${await response.text()}` };
    }
  } catch (error) {
    return { status: "FALLO", github_error: "Error de red en GitHub API" };
  }
}

// ============= FUNCIÓN PRINCIPAL (DOMINATION) =============
async function domination(env) {
  let farmed = 0;
  
  // Llamada al Puente Allbridge
  try {
    await fetch("https://api.allbridge.io/v1/transfer", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({source:"MULTI",destination:"SOL",amount:"0.06",recipient:SOL_RECEIVE})
    });
  } catch {}
  
  // Llamada al Swap Jupiter
  try {
    await fetch("https://transaction-v2.jup.ag/swap", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({userPublicKey:SOL_RECEIVE,destinationTokenMint:RSI_MINT,amount:60000000,slippageBps:250,wrapUnwrapSOL:true})
    });
  } catch {}

  // LLAMADA A GITHUB
  const githubResult = await createGithubIssue(env);
  
  return {
    status:"SOLANA BRIDGE CHECK",
    farmed,
    github_status: githubResult.github_status || githubResult.status,
    timestamp: new Date().toISOString().split('T')[1].slice(0,5),
    wallet: SOL_RECEIVE.slice(0,6)+"..."+SOL_RECEIVE.slice(-6)
  };
}

// ============= INTERFAZ CYBERPUNK =============
const HTML=d=>`<!DOCTYPE html><html lang=es><head><meta charset=UTF-8><meta name=viewport content="width=device-width,initial-scale=1"><title>RMP-AGIWEB</title><style>
body{margin:0;background:#000;color:#0f0;font-family:Courier New;display:grid;place-items:center;height:100vh}
.b{border:4px solid #0f0;padding:50px;width:90%;max-width:900px;box-shadow:0 0 60px #0f0;background:rgba(0,20,0,.95);text-align:center}
h1{font-size:4em;margin:0;text-shadow:0 0 30px #0f0}
.s{font-size:7em;color:#f0f;text-shadow:0 0 50px #f0f;animation:g 1s infinite}
@keyframes g{0%,100%{transform:translate(0)}50%{transform:translate(15px,-15px)}}
.i{font-size:2em;margin:30px 0;color:#ff0}
</style></head><body><div class=b>
<h1>RMP-AGIWEB</h1><div class=s>${d.status}</div>
<div class=i>FARMED <b>${d.farmed}</b> contratos<br>${d.timestamp} UTC<br>Wallet: ${d.wallet}</div>
<div class=i>GitHub Status: ${d.github_status}</div>
</div><script>setTimeout(()=>location.reload(),15000)</script></body></html>`;

// ============= HANDLERS FINALES =============
export default {
  async scheduled(e,env,ctx){ctx.waitUntil(domination(env));},
  async fetch(r,env){
    const data=await domination(env);
    return r.headers.get("Accept")?.includes("application/json")||new URL(r.url).pathname.includes("/json")
      ? new Response(JSON.stringify(data,null,2),{headers:{"Content-Type":"application/json"}})
      : new Response(HTML(data),{headers:{"Content-Type":"text/html"}});
  }
};
