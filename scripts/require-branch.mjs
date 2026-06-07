import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const expectedBranch = process.argv[2];

if (!expectedBranch) {
  console.error('Usage: node scripts/require-branch.mjs <branch-name>');
  process.exit(2);
}

const gitHeadPath = join(process.cwd(), '.git', 'HEAD');

if (!existsSync(gitHeadPath)) {
  console.error('Could not read .git/HEAD. Run this command from the repository root.');
  process.exit(2);
}

const head = readFileSync(gitHeadPath, 'utf8').trim();
const branchPrefix = 'ref: refs/heads/';
const currentBranch = head.startsWith(branchPrefix) ? head.slice(branchPrefix.length) : '';

if (!currentBranch) {
  console.error('Refusing deploy from detached HEAD.');
  process.exit(1);
}

if (currentBranch !== expectedBranch) {
  console.error(`Refusing deploy from "${currentBranch}". Expected branch "${expectedBranch}".`);
  process.exit(1);
}

console.log(`Branch guard passed: ${currentBranch}`);
