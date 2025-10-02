// server.js
import fs from "fs";
import csv from "csv-parser";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import express from "express";
import cors from "cors";
import setupPdfRoute from "./routes/exportPDF.js";

const app = express();
app.use(cors());
app.use(express.json());

(async () => {
  // 1️⃣ Connexion à SQLite
  const db = await open({
    filename: "./gestion_fiche_paie.sqlite",
    driver: sqlite3.Database,
  });

  // 2️⃣ Création de la table personnels si elle n'existe pas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS personnels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricule TEXT,
      nom TEXT,
      prenom TEXT,
      poste TEXT
    )
  `);

  // Création de la table fiches si elle n'existe pas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS fiches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personnels_id INTEGER,
      matricule TEXT,
      classe TEXT,
      nom TEXT,
      prenom TEXT,
      mois TEXT,
      nb_conge INTEGER DEFAULT 0,
      salaire_base REAL,
      taux_horaire REAL,
      heures REAL,
      nbr_enfant REAL,
      allocation_conge REAL,
      preavis REAL,
      prime REAL,
      fm REAL,
      hs_exo_irsa REAL,
      hs_imposable REAL,
      majoration REAL,
      salaire_brut_total REAL,
      salaire_brut_imposable REAL,
      cnaps REAL,
      ostie REAL,
      nb_enf INTEGER,
      irsa REAL,
      avance15 REAL,
      avance_speciale REAL,
      autre REAL,
      cantine REAL,
      reglement REAL,
      salaire_net REAL,
      date_paiement TEXT,
      mode_paiement TEXT,
      periode_debut TEXT,
      periode_fin TEXT,
      poste TEXT,
      cnaps_num TEXT,
      FOREIGN KEY (personnels_id) REFERENCES personnels(id)
    )
  `);

  console.log("📂 Base SQLite initialisée et mise à jour !");

  // Reste du code du serveur...
  // 3️⃣ Importer CSV seulement si la table est vide
  const count = await db.get("SELECT COUNT(*) as nb FROM personnels");
  if (count.nb === 0) {
    console.log("📥 Importation du fichier personnels.csv ...");
    fs.createReadStream("./personnels.csv")
      .pipe(csv())
      .on("data", async (row) => {
        await db.run(
          "INSERT INTO personnels (matricule, nom, prenom, poste) VALUES (?, ?, ?, ?)",
          [row.matricule, row.nom, row.prenom, row.poste]
        );
      })
      .on("end", () => {
        console.log("✅ Import terminé !");
      });
  }

  // 4️⃣ Définition des routes
  app.get("/", (req, res) => {
    res.send("Le serveur backend fonctionne correctement !");
  });

  app.get("/personnels", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM personnels ORDER BY matricule ASC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/personnels", async (req, res) => {
    try {
      const { matricule, nom, prenom, poste } = req.body;
      const result = await db.run(
        "INSERT INTO personnels (matricule, nom, prenom, poste) VALUES (?, ?, ?, ?)",
        [matricule, nom, prenom, poste]
      );
      res.json({ message: "✅ Employé ajouté !", id: result.lastID });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/personnels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { matricule, nom, prenom, poste } = req.body;
      await db.run(
        "UPDATE personnels SET matricule=?, nom=?, prenom=?, poste=? WHERE id=?",
        [matricule, nom, prenom, poste, id]
      );
      res.json({ message: "✏️ Employé modifié !" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/personnels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.run("DELETE FROM personnels WHERE id=?", [id]);
      res.json({ message: "🗑️ Employé supprimé !" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/fiches", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM fiches ORDER BY matricule ASC, mois ASC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

app.post("/fiches", async (req, res) => { 
  try { 
    const { 
      matricule, classe, nom, prenom, mois, salaire_base, taux_horaire, heures, nbr_enfant, 
      allocation_conge, preavis, prime, fm, hs_exo_irsa, hs_imposable, majoration, 
      salaire_brut_total, salaire_brut_imposable, cnaps, ostie, nb_enf, irsa, avance15, 
      avance_speciale, autre, cantine, reglement, salaire_net, date_paiement, mode_paiement, 
      periode_debut, periode_fin, poste, cnaps_num, nb_conge
    } = req.body; 

      // Correction ici 
   const result = await db.run( 
      `INSERT INTO fiches (
       matricule, classe, nom, prenom, mois, salaire_base, taux_horaire, heures, nbr_enfant,
        allocation_conge, preavis, prime, fm, hs_exo_irsa, hs_imposable, majoration, 
        salaire_brut_total, salaire_brut_imposable, cnaps, ostie, nb_enf, irsa, avance15, 
        avance_speciale, autre, cantine, reglement, salaire_net, date_paiement, mode_paiement, 
        periode_debut, periode_fin, poste, cnaps_num, nb_conge
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ 
        // La liste des valeurs contient 34 éléments pour 34 colonnes 
        matricule, classe, nom, prenom, mois, salaire_base, taux_horaire, heures, nbr_enfant, 
        allocation_conge, preavis, prime, fm, hs_exo_irsa, hs_imposable, majoration, 
        salaire_brut_total, salaire_brut_imposable, cnaps, ostie, nb_enf, irsa, avance15, 
        avance_speciale, autre, cantine, reglement, salaire_net, date_paiement, mode_paiement, 
        periode_debut, periode_fin, poste, cnaps_num, nb_conge 
      ] 
    ); 
    res.json({ message: "Fiche ajoutée avec succès", id: result.lastID }); 
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ error: err.message }); 
  } 
});

  app.delete("/fiches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.run("DELETE FROM fiches WHERE id = ?", [id]);
      res.json({ message: "Fiche supprimée avec succès" });
    } catch (err) {
      console.error("Erreur suppression fiche:", err);
      res.status(500).json({ error: "Erreur lors de la suppression de la fiche" });
    }
  });

  app.put("/fiches/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        matricule, classe, nom, prenom, mois, salaire_base, taux_horaire, heures, nbr_enfant,
        allocation_conge, preavis, prime, fm, hs_exo_irsa, hs_imposable, majoration,
        salaire_brut_total, salaire_brut_imposable, cnaps, ostie, nb_enf, irsa, avance15,
        avance_speciale, autre, cantine, reglement, salaire_net, date_paiement, mode_paiement,
        periode_debut, periode_fin, poste, cnaps_num, nb_conge
      } = req.body;
      await db.run(
        `UPDATE fiches
        SET matricule=?, classe=?, nom=?, prenom=?, mois=?, salaire_base=?,
        taux_horaire=?, heures=?, nbr_enfant=?, allocation_conge=?, preavis=?, prime=?,
        fm=?, hs_exo_irsa=?, hs_imposable=?, majoration=?, salaire_brut_total=?,
        salaire_brut_imposable=?, cnaps=?, ostie=?, nb_enf=?, irsa=?, avance15=?,
        avance_speciale=?, autre=?, cantine=?, reglement=?, salaire_net=?,
        date_paiement=?, mode_paiement=?,
        periode_debut=?, periode_fin=?, poste=?, cnaps_num=?, nb_conge=?
        WHERE id=?`,
        [
          matricule, classe, nom, prenom, mois, salaire_base,
          taux_horaire, heures, nbr_enfant, allocation_conge, preavis, prime,
          fm, hs_exo_irsa, hs_imposable, majoration, salaire_brut_total,
          salaire_brut_imposable, cnaps, ostie, nb_enf, irsa, avance15,
          avance_speciale, autre, cantine, reglement, salaire_net,
          date_paiement, mode_paiement,
          periode_debut, periode_fin, poste, cnaps_num, nb_conge,
          id,
        ]
      );
      res.json({ message: "Fiche mise à jour avec succès" });
    } catch (err) {
      console.error("Erreur modification fiche:", err);
      res.status(500).json({ error: "Erreur lors de la modification de la fiche" });
    }
  });

  // Utilisez le routeur pour la génération de PDF
  app.use("/api", setupPdfRoute(db));

  // Gérer les routes inexistantes
  app.use((req, res) => {
    res.status(404).send("Page non trouvée");
  });

  // 6️⃣ Lancer le serveur
  app.listen(5000, () => {
    console.log("🚀 Serveur backend démarré sur http://localhost:5000");
  });
})();