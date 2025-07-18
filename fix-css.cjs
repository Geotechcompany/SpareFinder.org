const fs = require('fs');
const path = require('path');

// Read the CSS file
const cssFile = path.join(__dirname, 'src', 'index.css');
let content = fs.readFileSync(cssFile, 'utf8');

console.log('🔧 Fixing CSS spacing issues...');

// Fix all dark: spacing issues (dark: -> dark:)
const beforeDarkCount = (content.match(/dark: /g) || []).length;
content = content.replace(/dark: /g, 'dark:');

// Fix any hover: spacing issues (hover: -> hover:)  
const beforeHoverCount = (content.match(/hover: /g) || []).length;
content = content.replace(/hover: /g, 'hover:');

// Fix any focus: spacing issues (focus: -> focus:)
const beforeFocusCount = (content.match(/focus: /g) || []).length;
content = content.replace(/focus: /g, 'focus:');

// Write the fixed content back
fs.writeFileSync(cssFile, content);

console.log(`✅ Fixed ${beforeDarkCount} dark: spacing issues`);
console.log(`✅ Fixed ${beforeHoverCount} hover: spacing issues`);
console.log(`✅ Fixed ${beforeFocusCount} focus: spacing issues`);
console.log('🎉 CSS fixed! Tailwind classes should now compile correctly.');