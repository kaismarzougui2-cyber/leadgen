#!/usr/bin/env node
/**
 * Télécharge le fichier des communes françaises depuis geo.api.gouv.fr
 * et le place dans public/communes.json pour le système de suggestions de villes
 * et le Mode Booster.
 *
 * Robustesse déploiement :
 *  - téléchargement vers un fichier temporaire, renommé seulement en cas de succès
 *    (l'ancien communes.json n'est jamais perdu sur un échec réseau) ;
 *  - si le téléchargement échoue mais qu'un communes.json valide existe déjà,
 *    le build continue avec l'ancien fichier (exit 0) ;
 *  - échec bloquant uniquement si aucun fichier n'est disponible.
 *
 * Usage : node scripts/download-communes.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const URL =
  "https://geo.api.gouv.fr/communes?fields=nom,code,centre,codesPostaux,population,departement,region&format=json&geometry=centre";
const OUTPUT = path.join(__dirname, "../public/communes.json");
const TMP = OUTPUT + ".tmp";

function hasExistingFile() {
  try {
    const stats = fs.statSync(OUTPUT);
    return stats.size > 1024;
  } catch {
    return false;
  }
}

function failGracefully(reason) {
  fs.rm(TMP, { force: true }, () => {});
  if (hasExistingFile()) {
    console.warn(`⚠️  ${reason} — l'ancien public/communes.json est conservé.`);
    process.exit(0);
  }
  console.error(`❌ ${reason} — et aucun communes.json existant. Relancez plus tard.`);
  process.exit(1);
}

console.log("⬇️  Téléchargement des communes françaises...");

const file = fs.createWriteStream(TMP);

https
  .get(URL, (res) => {
    if (res.statusCode !== 200) {
      res.resume();
      failGracefully(`Téléchargement impossible (HTTP ${res.statusCode})`);
      return;
    }

    let downloaded = 0;
    res.on("data", (chunk) => {
      downloaded += chunk.length;
      process.stdout.write(
        `\r   ${(downloaded / 1024 / 1024).toFixed(1)} Mo téléchargés...`
      );
    });

    res.pipe(file);

    file.on("finish", () => {
      file.close(() => {
        // Validation avant de remplacer l'ancien fichier
        try {
          const data = JSON.parse(fs.readFileSync(TMP, "utf8"));
          if (!Array.isArray(data) || data.length < 1000) {
            failGracefully("Fichier téléchargé invalide (JSON incomplet)");
            return;
          }
          fs.renameSync(TMP, OUTPUT);
          const stats = fs.statSync(OUTPUT);
          console.log(
            `\n✅ communes.json enregistré (${(stats.size / 1024 / 1024).toFixed(1)} Mo) → public/communes.json`
          );
          console.log(`   ${data.length} communes chargées.`);
          if (data[0]?.departement) {
            console.log("   ✓ Champs population/département/région inclus (Mode Booster prêt).");
          } else {
            console.warn("   ⚠️  Champs département/région absents — vérifiez l'URL.");
          }
        } catch {
          failGracefully("Fichier téléchargé mais JSON invalide");
        }
      });
    });
  })
  .on("error", (err) => {
    failGracefully(`Erreur réseau : ${err.message}`);
  });
