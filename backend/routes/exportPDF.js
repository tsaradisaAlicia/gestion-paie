import { Router } from "express";
import PdfPrinter from "pdfmake";
import n2words from "n2words";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction pour convertir le numéro du mois en nom français
const convertirMoisEnTexte = (numeroMois) => {
    const mois = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    // S'assure que le numéro est valide (entre 1 et 12) et retourne le nom correspondant.
    // Les mois en JavaScript commencent à 0, donc on soustrait 1.
    const index = parseInt(numeroMois, 10) - 1;
    if (index >= 0 && index < 12) {
        return mois[index];
    }
    return numeroMois; // Retourne le numéro si la conversion échoue
};

// Fonction pour formater un nombre avec un espace comme séparateur de milliers et une virgule pour les décimales
const formatNumber = (number) => {
    // S'assurer que la valeur est un nombre et non nulle
    if (number === null || number === undefined || number === "") {
        return "0,00";
    }

    const num = Number(number);
    if (isNaN(num)) {
        return "0,00";
    }

    // Arrondir à deux décimales et les séparer du reste
    let parts = num.toFixed(2).split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? parts[1] : '00';

    // Insérer des espaces tous les 3 chiffres pour la partie entière
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    return `${formattedInteger},${decimalPart}`;
};

const setupPdfRoute = (db) => {
    const router = Router();

    router.get("/export-pdf/:id", async (req, res) => {
        try {
            const { id } = req.params;
            const fiche = await db.get("SELECT * FROM fiches WHERE id = ?", [id]);

            if (!fiche) {
                return res.status(404).json({ error: "Fiche de paie non trouvée" });
            }

            // ---------------------------- //
            // CALCULS (Simplifiés et corrigés pour plus de clarté)
            // ---------------------------- //
            const salaireBase = fiche.salaire_base || 0;
            const allocationConge = fiche.allocation_conge || 0;
            const prime = fiche.prime || 0;
            const hsExoIrsa = fiche.hs_exo_irsa || 0;
            const hsImposable = fiche.hs_imposable || 0;
            const majoration = fiche.majoration || 0;
            const cnaps = fiche.cnaps || 0;
            const ostie = fiche.ostie || 0;
            const irsa = fiche.irsa || 0;
            const avance15 = fiche.avance15 || 0;
            const avanceSpeciale = fiche.avance_speciale || 0;
            const autre = fiche.autre || 0;
            const cantine = fiche.cantine || 0;
            
            // Re-calcul des totaux pour plus de précision
            const totalSalairesBruts = salaireBase + hsExoIrsa + hsImposable + majoration + prime;
            const totalRetenues = cnaps + ostie + irsa + avance15 + avanceSpeciale + autre + cantine;
            const netAPayer = totalSalairesBruts - totalRetenues + allocationConge;
            
            const netEnLettres = n2words(Number(netAPayer.toFixed(2)), { lang: "fr" }).toUpperCase() + " ARIARY";

            // ----------------------------
            // DÉFINITION DES POLICES
            // ----------------------------
            const fonts = {
                Roboto: {
                    normal: path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf'),
                    bold: path.join(__dirname, '..', 'fonts', 'Roboto-Medium.ttf'),
                    italics: path.join(__dirname, '..', 'fonts', 'Roboto-Italic.ttf'),
                    bolditalics: path.join(__dirname, '..', 'fonts', 'Roboto-MediumItalic.ttf'),
                },
            };

            const printer = new PdfPrinter(fonts);

            // ----------------------------
            // DOCUMENT (Tableau principal corrigé)
            // ----------------------------
            const docDefinition = {
                pageMargins: [20, 20, 20, 20],
                content: [
                    // --- En-tête société + mois ---
                    {
                        table: {
                            widths: ["*", "*"],
                            body: [
                                [
                                    {
                                        stack: [
                                            { text: "THERMOCOOL TECHNOLOGY", bold: true, fontSize: 13, alignment: "left", color: "blue", italics: true},
                                            { text: "LOT 114 CI BEHITSY / BP : 8565", bold: true, fontSize: 10, alignment: "left" },
                                        ],
                                        border: [true, true, true, true],
                                        margin: [5, 3, 5, 3],
                                    },
                                    {
                                        stack: [
                                            { text: `PAIE MOIS DE : ${moisEnTexte}`, fontSize: 10, alignment: "left" },
                                            { text: `N°: ${fiche.id}`, fontSize: 10, alignment: "left" },
                                        ],
                                        border: [true, true, true, true],
                                        margin: [5, 3, 5, 3],
                                    },
                                ],
                            ],
                        },
                        margin: [0, 0, 0, 10],
                    },

                    // INFO
                    {
                        table: {
                            widths: ["*", "*"],
                            body: [
                                [
                                    {
                                        stack: [
                                            { text: `Matricule : ${fiche.matricule || ""}`, fontSize: 10, alignment: "left"},
                                            { text: `Nom et prénom: ${fiche.nom || ""} ${fiche.prenom || ""}`, fontSize: 10, alignment: "left" },
                                            { text: `Fonction : ${fiche.poste || ""}             Classif: ${fiche.classe || ""}`, fontSize: 10, alignment: "left"},
                                            { text: `N°CNaPS : ${fiche.cnaps_num || ""}                Nb enfant: ${fiche.nb_enf || "0"}`, fontSize: 10, alignment: "left"},
                                            { text: `Sal de base : ${formatNumber(salaireBase)} Ar`, fontSize: 10, alignment: "left"},
                                            { text: `Nb heures: ${fiche.heures || ""} Heures`, fontSize: 10, alignment: "left"},
                                        ],
                                        border: [true, true, false, true],
                                        margin: [10, 5, 0, 0],
                                    },
                                    {
                                        stack: [
                                            { text: `PERIODE DU : ${fiche.periode_debut || ""}      AU : ${fiche.periode_fin || ""}`, fontSize: 10, alignment: "left" },
                                            { text: `Nb congé : ${fiche.nb_conge || "0"} Jours`, fontSize: 10, alignment: "left" },
                                        ],
                                        border: [false, true, true, true],
                                        margin: [10, 5, 0, 0],
                                    },
                                ],
                            ],
                        },
                        margin: [0, 0, 0, 10],
                    },
                    // --- Tableau principal ---
                    {
                        table: {
                            headerRows: 1,
                            widths: ["*", "auto", "auto", "auto"],
                            body: [
                                // En-tête du tableau
                                [{ text: "DÉTAILS DES RUBRIQUES", style: "tableHeader" }, { text: "SALAIRES BRUTS (Ar)", style: "tableHeader" }, { text: "RETENUES (Ar)", style: "tableHeader" }, { text: "NET À PAYER (Ar)", style: "tableHeader" }],
                                // Lignes de données
                                [{ text: "SALAIRE DE BASE", style: "totalRow" }, { text: formatNumber(salaireBase), style: "totalRow", alignment: "right" }, "", ""],
                                ["HEURE SUPPLE EXONERE IRSA", { text: formatNumber(hsExoIrsa), alignment: "right" }, "", ""],
                                ["HEURE SUPPLE IMPOSABLE", { text: formatNumber(hsImposable), alignment: "right" }, "", ""],
                                ["ALLOCATION DE CONGE", { text: formatNumber(allocationConge), alignment: "right" }, "", ""],
                                ["PRIME", { text: formatNumber(prime), alignment: "right" }, "", ""],
                                [{ text: "TOTAL SALAIRE BRUT", style: "totalRow" }, { text: formatNumber(totalSalairesBruts), alignment: "right", style: "totalRow" }, "", ""],
                                ["AVANCE SPECIALE", "", { text: formatNumber(avanceSpeciale), alignment: "right" }, ""],
                                ["AVANCE 15", "", { text: formatNumber(avance15), alignment: "right" }, ""],
                                
                                ["RETENUE CNaPS", "", { text: formatNumber(cnaps), alignment: "right" }, ""],
                                ["RETENUE OSTIE", "", { text: formatNumber(ostie), alignment: "right" }, ""],
                                ["IRSA", "", { text: formatNumber(irsa), alignment: "right" }, ""],
                                [{ text: "TOTAL RETENUE", style: "totalRow" }, "", { text: formatNumber(totalRetenues), style: "totalRow", alignment: "right" }, ""],
                                [{ text: "NET À PAYER", style: "totalRow" }, "", "", { text: formatNumber(netAPayer), style: "totalRow", alignment: "right" }],
                            ],
                        },
                        layout: {
                            hLineWidth: function (i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
                            vLineWidth: function (i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
                            hLineColor: function (i, node) { return 'black'; },
                            vLineColor: function (i, node) { return 'black'; },
                            paddingLeft: function(i, node) { return 5; },
                            paddingRight: function(i, node) { return 5; },
                            paddingTop: function(i, node) { return 5; },
                            paddingBottom: function(i, node) { return 5; },
                        },
                        margin: [0, 0, 0, 10],
                    },

                    // --- Arrêt du compte ---
                    {
                        table: {
                            widths: ["*", "auto", "auto", "auto", "auto"],
                            body: [
                                [
                                    { text: "ARRETE LE PRESENT ETAT A LA SOMME DE :", colSpan: 5, bold: true, alignment: "center" },
                                    "", "", "", ""
                                ],
                                [
                                    { text: netEnLettres, colSpan: 5, bold: true, alignment: "center" },
                                    "", "", "", ""
                                ],
                                [
                                    { text: "Le Salarié", alignment: "center", bold: true },
                                    { text: "p/Employeur", alignment: "center", bold: true },
                                    { text: "REGLEMENT :", alignment: "center", bold: true },
                                    { text: `LE : ${fiche.date_paiement || ""}`, alignment: "center", bold: true },
                                    { text: `NET A PAYER (Ar):\n${formatNumber(netAPayer)}`, alignment: "center", bold: true },
                                ],
                            ],
                        },
                        layout: {
                            hLineWidth: function (i, node) { return (i === 0 || i === node.table.body.length) ? 2 : 1; },
                            vLineWidth: function (i, node) { return (i === 0 || i === node.table.widths.length) ? 2 : 1; },
                            hLineColor: function (i, node) { return 'black'; },
                            vLineColor: function (i, node) { return 'black'; },
                            paddingLeft: function(i, node) { return 5; },
                            paddingRight: function(i, node) { return 5; },
                            paddingTop: function(i, node) { return 5; },
                            paddingBottom: function(i, node) { return 5; },
                        },
                    },
                ],

                styles: {
                    tableHeader: {
                        bold: true,
                        fillColor: "#eeeeee",
                        alignment: "center",
                    },
                    totalRow: {
                        bold: true,
                        fillColor: "#f5f5f5",
                    },
                },
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=fiche_paie_${fiche.matricule}_${fiche.mois}.pdf`
            );
            pdfDoc.pipe(res);
            pdfDoc.end();
        } catch (error) {
            console.error("Erreur PDF :", error);
            res.status(500).json({ error: "Erreur lors de la génération du PDF" });
        }
    });

    return router;
};

export default setupPdfRoute;