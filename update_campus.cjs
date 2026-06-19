const fs = require('fs');
const content = fs.readFileSync('src/lib/campus.ts', 'utf8');

const stateMap = {
  abu: 'Kaduna', buk: 'Kano', unimaid: 'Borno', udus: 'Sokoto', unilorin: 'Kwara',
  unijos: 'Plateau', uniabuja: 'FCT', atbu: 'Bauchi', futminna: 'Niger', mau: 'Adamawa',
  fud: 'Jigawa', fudma: 'Katsina', fuk: 'Gombe', fulafia: 'Nasarawa', fulokoja: 'Kogi',
  fuwukari: 'Taraba', fubk: 'Kebbi', fuga: 'Yobe', fugusau: 'Zamfara', nda: 'Kaduna',
  npa: 'Kano', afit: 'Kaduna', naub: 'Borno', fuhso: 'Benue', fuhsa: 'Bauchi', fuaz: 'Kebbi',
  
  adsu: 'Adamawa', basug: 'Bauchi', bsum: 'Benue', bosu: 'Borno', gsu: 'Gombe',
  slu: 'Jigawa', kasu: 'Kaduna', adustw: 'Kano', yumsuk: 'Kano', umyu: 'Katsina',
  ksusta: 'Kebbi', paau: 'Kogi', kwasu: 'Kwara', nsuk: 'Nasarawa', ibbu: 'Niger',
  plasu: 'Plateau', ssu: 'Sokoto', tsu: 'Taraba', ysu: 'Yobe', zasu: 'Zamfara',

  alqalam: 'Katsina', aun: 'Adamawa', baze: 'FCT', bingham: 'Nasarawa', sun: 'Kano',
  nile: 'FCT', veritas: 'FCT', salem: 'Kogi', kwararafa: 'Taraba', ccuk: 'Kano', maaun: 'Kano'
};

let newContent = content.replace('type: "federal" | "state" | "private";', 'type: "federal" | "state" | "private";\n  state?: string;');

newContent = newContent.replace(/\{ id: "([^"]+)"(.*?)\}/g, (match, id, rest) => {
  const state = stateMap[id.toLowerCase()];
  if (state) {
    return `{ id: "${id}"${rest}, state: "${state}" }`;
  }
  return match;
});

fs.writeFileSync('src/lib/campus.ts', newContent);
console.log('Updated campus.ts with state field');
