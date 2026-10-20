// Contrôle des leurres du quiz : la bonne réponse ne doit pas se repérer à sa longueur.
// Règle : chaque leurre fait au moins 80 % de la longueur de la bonne réponse
// (tolérance de 3 caractères pour les réponses de 10 caractères ou moins).
// Usage : node scripts/verifier-leurres.js   (code de sortie 1 en cas d'erreur)
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const bloc = (debut, fin) => { const a = html.indexOf(debut); const b = html.indexOf(fin, a); return html.slice(a + debut.length, b); };
const cartes = {};
for (const l of bloc('const RAW = `', '`;').trim().split('\n')) {
  if (!l.trim()) continue; const p = l.split('|'); const id = p[0].trim();
  if (!(id in cartes)) cartes[id] = (p[1] || '').trim();
}
const erreurs = []; let total = 0, plusLongue = 0;
for (const l of bloc('const RAW_DECOYS = `', '`;').trim().split('\n')) {
  if (!l.includes('|')) continue; const p = l.split('|'); const id = p[0].trim();
  if (!(id in cartes)) continue;
  const bonne = cartes[id], L = bonne.length;
  const leurres = p[1].split(';').map(x => x.trim()).filter(Boolean);
  if (leurres.length < 3) erreurs.push(`${id} : moins de 3 leurres`);
  total++; if (L > Math.max(...leurres.map(x => x.length))) plusLongue++;
  for (const x of leurres) {
    const ok = x.length >= 0.8 * L || (L <= 10 && L - x.length <= 3);
    if (!ok) erreurs.push(`${id} : leurre trop court (${x.length} car. contre ${L}) « ${x} »`);
  }
}
console.log(`${total} questions contrôlées. Bonne réponse la plus longue : ${Math.round(100 * plusLongue / total)} % (hasard : 25 %).`);
if (erreurs.length) { console.log(`\n${erreurs.length} problème(s) :\n- ` + erreurs.join('\n- ')); process.exit(1); }
console.log('Aucun leurre trop court.');
