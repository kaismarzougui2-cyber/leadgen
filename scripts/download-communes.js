#!/usr/bin/env node
/**
 * Télécharge le fichier des communes françaises depuis geo.api.gouv.fr
 * et le place dans public/communes.json pour le système de suggestions de villes
 * et le Mode Booster.
 *
 * Usage : node scripts/download-communes.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const URL =
  "https://geo.api.gouv.fr/communes?fields=nom,code,centre,codesPostaux,population,departement,region&format=json&geometry=centre";
const OUTPUT = path.join(__dirname, "../public/communes.json");

console.log("⬇️  Téléchargement des communes françaises...");

const file = fs.createWriteStream(OUTPUT);

https
  .get(URL, (res) => {
    if (res.statusCode !== 200) {
      console.error(`❌ HTTP ${res.statusCode}`);
      fs.unlinkSync(OUTPUT);
      process.exit(1);
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
        const stats = fs.statSync(OUTPUT);
        console.log(
          `\n✅ communes.json enregistré (${(stats.size / 1024 / 1024).toFixed(1)} Mo) → public/communes.json`
        );

        // Vérification rapide
        try {
          const data = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
          console.log(`   ${data.length} communes chargées.`);
          if (data[0]?.departement) {
            console.log("   ✓ Champs population/département/région inclus (Mode Booster prêt).");
          } else {
            console.warn("   ⚠️  Champs département/région absents — vérifiez l'URL.");
          }
        } catch {
          console.error("⚠️  Fichier téléchargé mais JSON invalide.");
        }
      });
    });
  })
  .on("error", (err) => {
    fs.unlink(OUTPUT, () => {});
    console.error("❌ Erreur réseau :", err.message);
    process.exit(1);
  });
