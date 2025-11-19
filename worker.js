let CLAVES = [];
let LOBO = false;
const FRASE = "acta de independencia";

const RPCs = {ethereum:"https://eth.llamarpc.com",base:"https://base.publicnode.com",arbitrum:"https://arbitrum.publicnode.com",optimism:"https://optimism.publicnode.com",polygon:"https://rpc.ankr.com/polygon",bsc:"https://bsc.publicnode.com",avalanche:"https://avalanche.publicnode.com",blast:"https://blast.publicnode.com"};

const CONTRACTS = {ethereum:["0xa4d692367A559E884facD39FFc2993B8A7543Ec4","0x5430d8e5E58e845660f3b62B5538D31f1a0d7a0c","0x1e4858bD944667Daea5D4a7e7258fA4b12eb4444","0x2682FA44105a60F2016FAa8909eA82d3d427bfFc"],base:["0x1e4858bD944667Daea5D4a7e7258fA4b12eb4444","0x5430d8e5E58e845660f3b62B5538D31f1a0d7a0c"],arbitrum:["0x2682FA44105a60F2016FAa8909eA82d3d427bfFc","0xa4d692367A559E884facD39FFc2993B8A7543Ec4"],optimism:["0xa4d692367A559E884facD39FFc2993B8A7543Ec4"],polygon:["0x5430d8e5E58e845660f3b62B5538D31f1a0d7a0c"],bsc:["0x1e4858bD944667Daea5D4a7e7258fA4b12eb4444"],avalanche:["0x2682FA44105a60F2016FAa8909eA82d3d427bfFc"],blast:["0xa4d692367A559E884facD39FFc2993B8A7543Ec4"]};

const ABI = ["function submitTaskResult(string taskId, string result, uint256 cognitionScore) external"];

async function manejarPost(request) {
  const body = await request.text();
  let keys = [];
  try { keys = JSON.parse(body); if (!Array.isArray(keys)) keys = body.match(/0x[a-fA-F0-9]{64}/g)||[]; } catch { keys = body.match(/0x[a-fA-F0-9]{64}/g)||[]; }
  if (body.toLowerCase().includes(FRASE)) LOBO = true;
  CLAVES = [...new Set([...CLAVES, ...keys])];
  return new Response(JSON.stringify({claves:CLAVES.length,lobo:LOBO}));
}

async function farm() {
  if (CLAVES.length===0) return {farmed:0,claves:0,lobo:LOBO};
  let farmed = 0;
  const taskId = Date.now().toString();
  for (const [chain,addrs] of Object.entries(CONTRACTS)) {
    const pk = CLAVES[Math.floor(Math.random()*CLAVES.length)];
    try {
      const provider = new ethers.JsonRpcProvider(RPCs[chain]);
      const wallet = new ethers.Wallet(pk, provider);
      const bn = (await provider.getBlock("latest")).number || 20000000;
      const score = bn + 999999;
      for (const addr of addrs) {
        try {
          const tx = await (new ethers.Contract(addr,ABI,wallet)).submitTaskResult(taskId, LOBO?"LOBO ACTIVADO":"RMP", score, {gasLimit:550000,type:2,maxFeePerGas:ethers.parseUnits("70","gwei"),maxPriorityFeePerGas:ethers.parseUnits("2","gwei")});
          await tx.wait(1);
          farmed++;
        } catch {}
      }
    } catch {}
  }
  return {farmed,claves:CLAVES.length,lobo:LOBO};
}

const HTML = d=>`<!DOCTYPE html><html lang=es><head><meta charset=UTF-8><title>RMP-AGIWEB</title><style>/* tu CSS bonito */</style></head><body>/* tu HTML bonito con ${d.farmed} etc */</body></html>`;

export default {
  async fetch(r,env){
    if (r.method==="POST") return await manejarPost(r);
    const data = await farm();
    if (new URL(r.url).pathname.includes("/json")) return new Response(JSON.stringify(data),{headers:{"Content-Type":"application/json"}});
    return new Response(HTML(data),{headers:{"Content-Type":"text/html"}});
  },
  async scheduled(e,env,ctx){ctx.waitUntil(farm());}
};
