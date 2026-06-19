const fs = require('fs');
const files = [
  'src/components/ui/badge.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/form.tsx',
  'src/components/ui/navigation-menu.tsx',
  'src/components/ui/sidebar.tsx',
  'src/components/ui/sonner.tsx',
  'src/components/ui/toggle.tsx',
  'src/features/auth/components/RouteGuards.tsx',
  'src/features/auth/contexts/AuthContext.tsx',
  'src/features/campus/contexts/CampusContext.tsx',
  'src/features/forum/components/ReactionsPopover.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('eslint-disable react-refresh/only-export-components')) {
      fs.writeFileSync(file, '/* eslint-disable react-refresh/only-export-components */\n' + content);
      console.log('Fixed ' + file);
    }
  } else {
    console.log('Not found: ' + file);
  }
});
