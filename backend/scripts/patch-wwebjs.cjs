// Postinstall : corrige le crash "Data passed to getter must include an id
// property" lors de l'envoi de médias avec whatsapp-web.js (issue #201922).
// Le spread du modèle MediaData injecte __x_id qui écrase l'ID du message.
// À retirer quand le fix upstream sera publié.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'whatsapp-web.js', 'src', 'util', 'Injected', 'Utils.js');

if (!fs.existsSync(file)) {
  console.log('[patch-wwebjs] whatsapp-web.js absent, patch ignoré');
  process.exit(0);
}

const src = fs.readFileSync(file, 'utf8');
if (src.includes('delete message.__x_id;')) {
  console.log('[patch-wwebjs] déjà appliqué');
  process.exit(0);
}

const anchorRe = /^([ \t]*)\/\/.*canonicalUrl is set \(linking\)/m;
const match = src.match(anchorRe);
if (!match) {
  console.warn('[patch-wwebjs] ancre introuvable — vérifier la version de whatsapp-web.js');
  process.exit(0);
}

fs.writeFileSync(file, src.replace(anchorRe,
  `${match[1]}delete message.__x_id;\n\n${match[0]}`));
console.log('[patch-wwebjs] patch appliqué');
