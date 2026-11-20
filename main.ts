// HEATWAVE Cover Studio — entrypoint for the make.fun gta6-cover-art-01 bounty.
// Node 22+, standard library only. The app itself is the static, offline app/
// folder beside this file (vanilla ES modules + Canvas 2D, no build step, no
// network at runtime). This program packages the entry: it copies app/ and
// screenshots/ into the output directory (process.env.MAKEFUN_OUTPUT_DIR, or
// /output in the grader) and writes dossier.json — the judge-facing summary —
// with the vendored make.fun library, under the scorer's own caps.
//
// Try the app locally:  node serve.ts   ->   http://localhost:8080
// Package it:           MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps (reference/gate.json). text_max_bytes bounds the dossier
// text; the rest refuse an entry the scorer would refuse: at most 4
// screenshots of <= 256 KiB each, at most 993 app files / 48 MiB of app bytes,
// and no app path longer than 1000 bytes.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });

// Ship the app exactly as authored — static files, fonts and samples included.
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

// Ship the four verified screenshots (the first by name is the cover).
const shotsDir = join(repoDir, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The judge-facing dossier, built by the vendored kit library.
const dossier = buildDossier(outputDir, caps);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const shotNames = existsSync(join(outputDir, 'screenshots'))
  ? readdirSync(join(outputDir, 'screenshots')).sort()
  : [];
console.log(`HEATWAVE Cover Studio packaged -> ${outputDir}`);
console.log(`  app/ copied, screenshots: ${shotNames.join(', ') || '(none)'}`);
console.log(`  dossier.json: ${dossier.byteLength} bytes`);
