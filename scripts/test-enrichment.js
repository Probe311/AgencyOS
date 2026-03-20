/**
 * Script de test rapide pour l'enrichissement
 * Teste avec seulement 3 leads pour vérifier que tout fonctionne
 */

import { spawn } from 'child_process';

// Définir MAX_LEADS=3 et lancer le script principal
process.env.MAX_LEADS = '3';

const child = spawn('node', ['enrich-leads.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
});

