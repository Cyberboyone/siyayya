const fs = require('fs');
const path = require('path');

const campusFile = path.resolve(__dirname, 'src/lib/campus.ts');
const content = fs.readFileSync(campusFile, 'utf8');

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

const marker = 'type: "federal" | "state" | "private";';
let newContent = content.replace(marker, 'type: "federal" | "state" | "private";\n  state?: string;');

if (!newContent.includes('state?: string;')) {
  console.error(`Marker '${marker}' not found in campus.ts. No changes made.`);
  process.exit(1);
}

newContent = newContent.replace(/\{ id: "([^"]+)"(.*?)\}/g, (match, id, rest) => {
  const state = stateMap[id.toLowerCase()];
  if (state) {
    if (rest.includes('state:')) return match;
    return `{ id: "${id}"${rest}, state: "${state}" }`;
  }
  return match;
});

fs.writeFileSync(campusFile, newContent);
console.log('Updated campus.ts with state field');
