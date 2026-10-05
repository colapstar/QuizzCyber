#!/usr/bin/env node
/*
 * Génère les grilles de mots fléchés à venir (grille pleine, cadre à doubles flèches).
 * Usage : node scripts/mots-fleches/generer.js [--jours 7] [--depuis AAAA-MM-JJ] [--largeur 9] [--hauteur 11]
 * Les grilles déjà générées ne sont jamais modifiées. Sortie : grilles/AAAA-MM-JJ.json + grilles/index.json
 */
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..');
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>v.startsWith('--')?[...a,[v.slice(2),arr[i+1]]]:a,[]));
const JOURS=+(args.jours||7),W=+(args.largeur||9),H=+(args.hauteur||11);
const OUT=path.join(ROOT,'grilles');

function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function seedOf(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}return h>>>0}
function loadDico(file){const m=new Map();
  for(const l of fs.readFileSync(file,'utf8').split('\n')){if(!l.trim()||l.startsWith('#'))continue;const p=l.split('|');if(p.length<3)continue;
    const w=p[0].trim().toUpperCase();if(!/^[A-Z]{2,}$/.test(w))continue;const e=m.get(w)||{w,defs:[],t:p[2].trim()};e.defs.push(p[1].trim());if(p[2].trim()==='i')e.t='i';m.set(w,e)}
  return m}
const isFrameClue=(r,c)=>(r===0&&c%2===0)||(c===0&&r%2===0);
const isFrameLetter=(r,c)=>(r===0&&c%2===1)||(c===0&&r%2===1);
function slotsOf(g,W,H){const out=[];const L=(r,c)=>r>=0&&c>=0&&r<H&&c<W&&!g[r][c];
  for(let r=0;r<H;r++)for(let c=0;c<W;c++){if(g[r][c])continue;
    if(!L(r,c-1)&&L(r,c+1)){let n=0;while(L(r,c+n))n++;out.push(c>0?{d:'h',r,c,L:n,cr:r,cc:c-1,a:'r'}:{d:'h',r,c,L:n,cr:r-1,cc:0,a:'dr'})}
    if(!L(r-1,c)&&L(r+1,c)){let n=0;while(L(r+n,c))n++;out.push(r>0?{d:'v',r,c,L:n,cr:r-1,cc:c,a:'d'}:{d:'v',r,c,L:n,cr:0,cc:c-1,a:'rd'})}}
  return out}
function makePattern(R,o){
  const maxLen=o.maxLen||7,target=o.density||0.22;
  const g=Array.from({length:H},(_,r)=>Array.from({length:W},(_,c)=>isFrameClue(r,c)?1:isFrameLetter(r,c)?0:null));
  const must=new Set();for(let c=1;c<W;c+=2)must.add('1,'+c);for(let r=1;r<H;r+=2)must.add(r+',1');
  const interior=(W-1)*(H-1);let clues=0,steps=0;
  const hlen=(r,c)=>{let k=0;for(let x=c-1;x>=0&&g[r][x]===0;x--)k++;return k};
  const vlen=(r,c)=>{let k=0;for(let x=r-1;x>=0&&g[x][c]===0;x--)k++;return k};
  const runH=(r,c)=>{let a=c,b=c;while(a-1>=0&&g[r][a-1]===0)a--;while(b+1<W&&g[r][b+1]===0)b++;return b-a+1};
  function final(){const d=clues/interior;if(d<target-0.06||d>target+0.08)return false;
    for(let r=0;r<H;r++)for(let c=0;c<W;c++){if(g[r][c])continue;let a=c,b=c;while(a-1>=0&&!g[r][a-1])a--;while(b+1<W&&!g[r][b+1])b++;
      let u=r,v=r;while(u-1>=0&&!g[u-1][c])u--;while(v+1<H&&!g[v+1][c])v++;if(b-a+1<2&&v-u+1<2)return false}
    const defs={};slotsOf(g,W,H).forEach(s=>defs[s.cr+','+s.cc]=(defs[s.cr+','+s.cc]||0)+1);
    for(let r=0;r<H;r++)for(let c=0;c<W;c++)if(g[r][c]&&!defs[r+','+c]&&!(r===H-1&&c===W-1))return false;
    return true}
  function rec(i){
    if(++steps>30000)return false;if(i===interior)return final();
    const r=1+Math.floor(i/(W-1)),c=1+i%(W-1),hl=hlen(r,c),vl=vlen(r,c);
    const canL=hl+1<=maxLen&&vl+1<=maxLen;let canC=!must.has(r+','+c);
    if(canC){if(vl===1&&runH(r-1,c)<2)canC=false;
      if(g[r-1][c]===1&&r-1>=1){let k=0;for(let x=c+1;x<W&&g[r-1][x]===0;x++)k++;if(k<2)canC=false}
      if(c===W-1&&r>=H-2)canC=false;if(r===H-1&&c>=W-2)canC=false;if(g[r][c-1]===1&&c-1>=1&&r>=H-2)canC=false}
    const p=(hl>=4||vl>=4)?0.55:(clues<target*interior?0.16:0.03);
    const order=[];if(canC&&R()<p)order.push(1);if(canL)order.push(0);if(canC&&!order.includes(1))order.push(1);
    for(const x of order){const added=[];
      if(x===1&&g[r][c-1]===1&&c-1>=1)for(const k of [(r+1)+','+(c-1),(r+2)+','+(c-1)])if(!must.has(k)){must.add(k);added.push(k)}
      g[r][c]=x;if(x)clues++;if(rec(i+1))return true;g[r][c]=null;if(x)clues--;added.forEach(k=>must.delete(k));if(steps>30000)return false}
    return false}
  return rec(0)?g.map(row=>row.map(x=>x===1)):null}
function fill(dico,g,R,maxSteps,recent){
  const slots=slotsOf(g,W,H);const byLen={};for(const w of dico.keys())(byLen[w.length]=byLen[w.length]||[]).push(w);
  for(const s of slots)if(!byLen[s.L])return null;
  const cells=Array.from({length:H},()=>Array(W).fill(null));
  slots.forEach(s=>{s.cells=[];for(let k=0;k<s.L;k++)s.cells.push(s.d==='h'?[s.r,s.c+k]:[s.r+k,s.c])});
  const assign=Array(slots.length).fill(null),used=new Set();let steps=0;
  const fits=(s,w)=>{for(let k=0;k<s.L;k++){const [r,c]=s.cells[k],x=cells[r][c];if(x!=null&&x!==w[k])return false}return true};
  const score=w=>(dico.get(w).t==='i'?1.2:0)-(recent.has(w)?0.8:0)+R()*1.3;
  function rec(){if(++steps>maxSteps)return false;let best=-1,bc=null;
    for(let i=0;i<slots.length;i++){if(assign[i])continue;const c=byLen[slots[i].L].filter(w=>!used.has(w)&&fits(slots[i],w));if(!c.length)return false;if(!bc||c.length<bc.length){best=i;bc=c;if(c.length===1)break}}
    if(best<0)return true;const s=slots[best];
    for(const w of bc.map(w=>({w,k:score(w)})).sort((a,b)=>b.k-a.k).slice(0,30).map(x=>x.w)){
      const set=[];s.cells.forEach(([r,c],k)=>{if(cells[r][c]==null){cells[r][c]=w[k];set.push([r,c])}});assign[best]=w;used.add(w);
      if(rec())return true;used.delete(w);assign[best]=null;set.forEach(([r,c])=>cells[r][c]=null);if(steps>maxSteps)return false}
    return false}
  return rec()?{slots,assign,cells}:null}
function generate(dico,date,recent){
  const R=rng(seedOf('mots-fleches|'+date));let best=null,found=0;
  for(let t=0;t<1500&&found<3;t++){const g=makePattern(R,{});if(!g)continue;const res=fill(dico,g,R,4000,recent);if(!res)continue;found++;
    const info=res.assign.filter(w=>dico.get(w).t==='i').length;if(!best||info>best.info)best={g,...res,info}}
  return best}
function encode(str,date){const k=seedOf('cle|'+date);const R=rng(k);return Buffer.from([...str].map(ch=>ch.charCodeAt(0)^Math.floor(R()*256))).toString('base64')}
function toJSON(dico,date,res){
  const R=rng(seedOf('defs|'+date));
  const pattern=res.g.map(row=>row.map(x=>x?'#':'.').join(''));
  const sol=res.cells.map((row,r)=>row.map((x,c)=>res.g[r][c]?'#':x).join('')).join('');
  const words=res.slots.map((s,i)=>{const e=dico.get(res.assign[i]);return{r:s.r,c:s.c,d:s.d,l:s.L,cr:s.cr,cc:s.cc,a:s.a,def:e.defs[Math.floor(R()*e.defs.length)],t:e.t}});
  return{version:1,date,w:W,h:H,pattern,words,sol:encode(sol,date),info:res.info}}
function parisToday(){const p=new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());return p}
function addDays(d,n){const [y,m,j]=d.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,j+n));return x.toISOString().slice(0,10)}
(function main(){
  const dico=loadDico(path.join(__dirname,'dictionnaire.txt'));
  fs.mkdirSync(OUT,{recursive:true});
  const start=args.depuis||parisToday();
  // mots des grilles récentes, pour limiter les répétitions d'un jour à l'autre
  const recent=new Set();
  for(let k=1;k<=7;k++){const f=path.join(OUT,addDays(start,-k)+'.json');if(fs.existsSync(f)){try{const j=JSON.parse(fs.readFileSync(f,'utf8'));/* mots non stockés en clair : on s'appuie sur les définitions */}catch(e){}}}
  let created=0;
  for(let k=0;k<=JOURS;k++){const date=addDays(start,k),file=path.join(OUT,date+'.json');
    if(fs.existsSync(file)){console.log(date,'déjà générée');continue}
    const t0=Date.now();const res=generate(dico,date,recent);
    if(!res){console.error(date,'ÉCHEC de génération');process.exitCode=1;continue}
    res.assign.forEach(w=>recent.add(w));
    fs.writeFileSync(file,JSON.stringify(toJSON(dico,date,res)));created++;
    console.log(date,`générée en ${((Date.now()-t0)/1000).toFixed(1)} s, ${res.assign.length} mots dont ${res.info} d'informatique`)}
  const dates=fs.readdirSync(OUT).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f=>f.slice(0,10)).sort();
  fs.writeFileSync(path.join(OUT,'index.json'),JSON.stringify({dates}));
  console.log(`${created} grille(s) créée(s), ${dates.length} au total.`);
})();
