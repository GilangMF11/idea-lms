const fs = require('fs');
const file = 'src/routes/classes/[id]/manage/+page.svelte';
let content = fs.readFileSync(file, 'utf8');

const regex = /(<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\s+{#each groups as group}\s+<div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">[\s\S]*?<\/div>\s+{ \/each}\s+<\/div>)/m;

// wait, the group card loop is bounded by:
// <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//   {#each groups as group}
//      ...
//   {/each}
// </div>

const startMarker = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n                  {#each groups as group}';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.log("Start marker not found");
  process.exit(1);
}

const endMarker = '                  {/each}\n                </div>';
let endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.log("End marker not found");
  // Let's try matching with different whitespaces
  const regex2 = /{#each groups as group}([\s\S]*?){\/each}\s*<\/div>/;
  const match = content.match(regex2);
  if(match) {
    console.log("Regex found");
  } else {
    console.log("Regex not found neither");
    process.exit(1);
  }
}

