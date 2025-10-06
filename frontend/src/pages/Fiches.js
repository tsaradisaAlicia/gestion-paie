// src/pages/Fiches.js
import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaDownload, FaSearch } from "react-icons/fa";
import axios from "axios";

// --- Constante du plafond salarial (CNAPS/OSTIE) ---
// Plafond du Salaire de Base pour le calcul des cotisations sociales (Madagascar)
const PLAFOND_SOCIAL_AR = 2101440; // 2 101 440 Ar 
const MONTANT_COTISATION_PLAFONNEE = 21014.40; // 1% de 2 101 440 Ar
const TAUX_COTISATION = 0.01; // Taux CNaPS et OSTIE (1%)

// 💡 NOUVELLE URL DE L'API DE RENDER
// VEUILLEZ REMPLACER CETTE ADRESSE SI VOTRE DOMAINE RENDER CHANGE !
const RENDER_API_BASE_URL = "https://gestion-paie-b7w6.onrender.com";

// Fonction pour formater un nombre avec un espace comme séparateur de milliers et une virgule pour les décimales
const formatNumber = (number) => {
  // Gérer les cas où le nombre est null, undefined ou une chaîne vide
  if (number === null || number === undefined || number === "") {
    return "0,00"; 
  }
  // Tenter de convertir la valeur en nombre si ce n'est pas déjà le cas
  const num = typeof number === 'string' ? parseFloat(number.replace(',', '.')) : number;
  if (isNaN(num)) {
    return "0,00";
  }
  // Utiliser Intl.NumberFormat pour un formatage international correct
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Fonction de calcul de la fiche de paie
const calculerFiche = (data) => {
  // Convertir les chaînes de caractères en nombres
  const salaire_base = Number(data.salaire_base) || 0;
  const prime = Number(data.prime) || 0;
  const majoration = Number(data.majoration) || 0;
  const allocation_conge = Number(data.allocation_conge) || 0;
  const hs_imposable = Number(data.hs_imposable) || 0;
  const hs_exo_irsa = Number(data.hs_exo_irsa) || 0; 
  const autre = Number(data.autre) || 0;
  const avance15 = Number(data.avance15) || 0;
  const avance_speciale = Number(data.avance_speciale) || 0;
  const cantine = Number(data.cantine) || 0;
  const nb_enf = Number(data.nb_enf) || 0; 
  // ⬅️ AJOUTEZ CETTE LIGNE
  const nb_conge = Number(data.nb_conge) || 0; 

  // Calcul du Salaire brut total
  const salaire_brut_total =
    salaire_base + prime + majoration + allocation_conge + hs_imposable + autre;

 // ----------------------------------------------------
  // 2. LOGIQUE CNAPS et OSTIE (avec plafond sur la cotisation)
  // ----------------------------------------------------
  let cnaps;
  let ostie;

  if (salaire_base >= PLAFOND_SOCIAL_AR) {
    // Si le salaire de base dépasse le plafond (2 101 440 Ar),
    // la cotisation est plafonnée à 21 014,40 Ar (1% du plafond).
    cnaps = MONTANT_COTISATION_PLAFONNEE; 
    ostie = MONTANT_COTISATION_PLAFONNEE; 
  } else {
    // Si le salaire de base est inférieur au plafond,
    // la cotisation est 1% du salaire de base réel.
    cnaps = salaire_base * TAUX_COTISATION;
    ostie = salaire_base * TAUX_COTISATION;
  }

  // Déterminer la base de calcul de l'IRSA
  const base_imposable = salaire_brut_total - cnaps - ostie - hs_exo_irsa;

  // Arrondir à la centaine d'Ariary inférieure
  const base_irsa_arrondie = Math.floor(base_imposable / 100) * 100;

  // Calcul de l'impôt par tranche selon votre barème
 let irsa_calcule = 0;
if (base_irsa_arrondie > 600000) {
  // On calcule l'impôt sur la portion au-dessus de 600 000 Ar,
  // puis on ajoute le total des impôts des tranches précédentes, soit 27 500 Ar.
  irsa_calcule = (base_irsa_arrondie - 600000) * 0.20 + 27500;
} else if (base_irsa_arrondie > 500000) {
  // Impôt sur la portion au-dessus de 500 000 Ar,
  // plus le total des impôts des tranches précédentes (10 000 + 2 500)
  irsa_calcule = (base_irsa_arrondie - 500000) * 0.15 + 12500;
} else if (base_irsa_arrondie > 400000) {
  // Impôt sur la portion au-dessus de 400 000 Ar,
  // plus l'impôt de la tranche précédente (2 500)
  irsa_calcule = (base_irsa_arrondie - 400000) * 0.10 + 2500;
} else if (base_irsa_arrondie > 350000) {
  // Impôt sur la portion au-dessus de 350 000 Ar
  irsa_calcule = (base_irsa_arrondie - 350000) * 0.05;
}

  // Réduction pour chaque personne à charge
  const reduction_enfant = nb_enf * 2000;
  let irsa_apres_reduction = Math.max(0, irsa_calcule - reduction_enfant);

  // Application du minimum de l'IRSA
  const irsa_final = Math.max(3000, irsa_apres_reduction);

  // Total des retenues
  const total_retenues = cnaps + ostie + irsa_final + avance15 + avance_speciale + cantine;

  // Calcul du Salaire net
  const salaire_net = salaire_brut_total - total_retenues;

  return {
    ...data,
    salaire_brut_total: salaire_brut_total.toFixed(2),
    salaire_brut_imposable: base_irsa_arrondie.toFixed(2), 
    cnaps: cnaps.toFixed(2),
    ostie: ostie.toFixed(2),
    irsa: irsa_final.toFixed(2),
    salaire_net: salaire_net.toFixed(2),
  };
};

function Fiches() {
  const [fiches, setFiches] = useState([]);
  const [ficheEnCours, setFicheEnCours] = useState(null);
  const [moisSelectionnes, setMoisSelectionnes] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const [newFiche, setNewFiche] = useState({
    matricule: "",
    classe: "",
    nom: "",
    prenom: "",
    mois: "",
    annee: new Date().getFullYear(), // Par défaut année actuelle
    periode_debut: "",   // 🔹 ajouté
    periode_fin: "",   // 🔹 ajouté
    salaire_base: "",
    taux_horaire: "",
    heures: "",
    nbr_enfant: "",
    allocation_conge: "",
    preavis: "",
    prime: "",
    fm: "",
    hs_exo_irsa: "",
    hs_imposable: "",
    majoration: "",
    salaire_brut_total: "",
    salaire_brut_imposable: "",
    cnaps: "",
    ostie: "",
    nb_enf: "",
    irsa: "",
    avance15: "",
    avance_speciale: "",
    autre: "",
    cantine: "",
    reglement: "",
    salaire_net: "",
    date_paiement: "",
    mode_paiement: "",
     nb_conge: "0",
  });

const handleChange = (e) => {
  const { name, value } = e.target;

  setNewFiche((prevFiche) => {
    let updatedFiche = { ...prevFiche, [name]: value };

     // Remplissage automatique si le champ modifié est "matricule"
    if (name === "matricule") {
      const ficheExistante = fiches.find((f) => f.matricule === value);
      if (ficheExistante) {
        updatedFiche = {
          ...updatedFiche,
          // 1. Informations d'identification (copiées)
          nom: ficheExistante.nom || '',
          prenom: ficheExistante.prenom || '',
          poste: ficheExistante.poste || '',
          cnaps_num: ficheExistante.cnaps_num || '',
          classe: ficheExistante.classe || '', 
          // --- Champs Financiers/Base (à copier) ---
          salaire_base: ficheExistante.salaire_base || 0,
          taux_horaire: ficheExistante.taux_horaire || 0,
          nbr_enfant: ficheExistante.nbr_enfant || 0,
          // 3. Champs mensuels VOLATILS (remis à zéro pour une nouvelle fiche, ne pas copier les montants du mois précédent !)
          heures: 0,
          prime: 0,
          fm: 0,
          majoration: 0,
          avance15: 0,
          avance_speciale: 0,
          cantine: 0,
          autre: 0,
          nb_conge: 0,
        };
      }
    }

    //REMPLISSAGE AUTOMATIQUE DES DATES SI MOIS OU ANNÉE MODIFIÉS
    if (name === "mois" || name === "annee") {
      const mois = name === "mois" ? value : prevFiche.mois;
      const annee = name === "annee" ? value : prevFiche.annee;

      if (mois && annee) {
        // Date de paiement
        updatedFiche.date_paiement = `${annee}-${mois}-28`;

        // Calcul du mois précédent
        let moisNum = parseInt(mois, 10);
        let anneeDebut = parseInt(annee, 10);
        let moisPrecedent = moisNum - 1;

        if (moisPrecedent === 0) {
          moisPrecedent = 12;
          anneeDebut = anneeDebut - 1;
        }

        // Ajout d’un zéro devant si mois < 10
        const moisPrecedentStr = moisPrecedent.toString().padStart(2, "0");

        // Période du = 28 du mois précédent
        updatedFiche.periode_debut = `${anneeDebut}-${moisPrecedentStr}-28`;

        // Période au = même que date paiement
        updatedFiche.periode_fin = updatedFiche.date_paiement;
      }
    }

    // 🔹 Calcul automatique fiche si champs modifiés
    const champsAcalculer = [
      "salaire_base", "prime", "majoration", "allocation_conge", 
      "hs_imposable", "autre", "nb_enf", "hs_exo_irsa","avance15", "avance_speciale", "cantine", "nb_conge"
    ];
    if (champsAcalculer.includes(name)) {
      return calculerFiche(updatedFiche);
    }

    return updatedFiche;
  });
};



  const handleChangeMois = (matricule, mois) => {
    setMoisSelectionnes((prev) => ({
      ...prev,
      [matricule]: mois,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (ficheEnCours) {
        // 🛑 URL MISE À JOUR (PUT)
        await axios.put(`${RENDER_API_BASE_URL}/fiches/${ficheEnCours.id}`, newFiche);
        setFiches((prev) =>
          prev.map((f) => {
            if (f.matricule === newFiche.matricule) {
              return {
                ...f,
                moisData: { ...f.moisData, [newFiche.mois]: newFiche },
              };
            }
            return f;
          })
        );
        alert("Fiche modifiée avec succès !"); // ⚠️ Utiliser un modal personnalisé au lieu d'alert
        setFicheEnCours(null);
      } else {
        // 🛑 URL MISE À JOUR (POST)
        const res = await axios.post(`${RENDER_API_BASE_URL}/fiches`, newFiche);
        // ⬅️ CORRECTION 1: CRÉER UN OBJET DE FICHE COMPLET AVEC L'ID REÇU DU SERVEUR
        const ficheAvecId = { ...newFiche, id: res.data.id }; 
        setFiches((prev) => {
          const index = prev.findIndex((f) => f.matricule === newFiche.matricule);
          if (index !== -1) {
            const updated = [...prev];
            // Utiliser l'objet complet avec l'ID
            updated[index].moisData[newFiche.mois] = ficheAvecId; 
            return updated;
          }
         // Ajouter la nouvelle fiche complète avec l'ID
          return [...prev, { ...newFiche, id: res.data.id, moisData: { [newFiche.mois]: ficheAvecId } }];
        });
        alert("Fiche ajoutée avec succès !"); // ⚠️ Utiliser un modal personnalisé au lieu d'alert
      }

      setNewFiche({
        matricule: "",
        classe: "",
        nom: "",
        prenom: "",
        mois: "",
        annee: new Date().getFullYear(),
        salaire_base: "",
        taux_horaire: "",
        heures: "",
        nbr_enfant: "",
        allocation_conge: "",
        preavis: "",
        prime: "",
        fm: "",
        hs_exo_irsa: "",
        hs_imposable: "",
        majoration: "",
        salaire_brut_total: "",
        salaire_brut_imposable: "",
        cnaps: "",
        ostie: "",
        nb_enf: "",
        irsa: "",
        avance15: "",
        avance_speciale: "",
        autre: "",
        cantine: "",
        reglement: "",
        salaire_net: "",
        date_paiement: "",
        mode_paiement: "",
        nb_conge: "0",
      });
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de la fiche"); // ⚠️ Utiliser un modal personnalisé au lieu d'alert
    }
  };

  useEffect(() => {
    // 🛑 URL MISE À JOUR (GET)
    axios
      .get(`${RENDER_API_BASE_URL}/fiches`)
      .then((res) => {
        const fichesParPersonne = {};
        res.data.forEach((fiche) => {
          const key = fiche.nom + " " + fiche.prenom;
          if (!fichesParPersonne[key]) {
            fichesParPersonne[key] = { ...fiche, moisData: {} };
          }
          fichesParPersonne[key].moisData[fiche.mois] = fiche;
        });
        setFiches(Object.values(fichesParPersonne));
      })
      .catch((err) => console.error(err));

   
  }, []);

  const supprimerFiche = (fiche) => {
    // ⚠️ Attention : window.confirm bloque l'iFrame, à remplacer par un modal
    if (window.confirm("Voulez-vous vraiment supprimer cette fiche ?")) { 
      // 🛑 URL MISE À JOUR (DELETE)
      axios
        .delete(`${RENDER_API_BASE_URL}/fiches/${fiche.id}`)
        .then(() => {
          setFiches((prev) =>
            prev
              .map((f) => {
                if (f.matricule === fiche.matricule) {
                  const updated = { ...f };
                  delete updated.moisData[fiche.mois];
                  return updated;
                }
                return f;
              })
              .filter((f) => Object.keys(f.moisData).length > 0)
          );
        })
        .catch((err) => console.error(err));
    }
  };

  const modifierFiche = (fiche) => {
     setFicheEnCours(fiche);

    // ⬅️ CORRECTION 3: EXTRAIRE L'ANNÉE À PARTIR DE LA DATE DE PAIEMENT
     const anneeDeFiche = fiche.date_paiement 
      ? fiche.date_paiement.substring(0, 4) 
      : new Date().getFullYear().toString();

    // ⬅️ CORRECTION 4: CHARGER TOUS LES CHAMPS DANS NEWFICHE
     setNewFiche({
       ...fiche,
      annee: anneeDeFiche, // Charge l'année pour le champ du formulaire
       nb_conge: fiche.nb_conge || "0", // Assure qu'il y a toujours une valeur par défaut
    });
     setShowForm(true);
};

// Function to generate PDF of a fiche
const exporterPDF = async (fiche) => {
  try {
    // 🛑 URL MISE À JOUR (GET PDF)
    const response = await axios.get(`${RENDER_API_BASE_URL}/api/export-pdf/${fiche.id}`, {
      responseType: 'blob', // Important pour gérer un fichier binaire
    });

    // Crée un lien pour télécharger le fichier
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fiche_paie_${fiche.matricule}_${fiche.mois}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Erreur lors de l'exportation du PDF", error);
    alert("Une erreur est survenue lors de l'exportation du PDF."); // ⚠️ Utiliser un modal personnalisé au lieu d'alert
  }
};

//ZONE DE RECHERCHE
 // Filtrer les fiches selon la recherche
  const fichesFiltrees = fiches.filter((fiche) =>
    [fiche.matricule, fiche.nom, fiche.prenom, fiche.classe]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Fonction pour convertir le numéro du mois en nom de mois en français
const getMonthName = (monthNumber) => {
  const months = {
    "01": "Janvier",
    "02": "Février",
    "03": "Mars",
    "04": "Avril",
    "05": "Mai",
    "06": "Juin",
    "07": "Juillet",
    "08": "Août",
    "09": "Septembre",
    "10": "Octobre",
    "11": "Novembre",
    "12": "Décembre",
  };
  return months[monthNumber] || monthNumber; // Retourne le nom, ou le numéro si non trouvé
};
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold mb-4 text-blue-700">
          Gestion des fiches de paie
        </h3>
        {/* Zone de recherche */}
        <div className="flex items-center border rounded px-2 w-full md:w-1/3">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Rechercher (matricule, nom, prénom, classe)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 outline-none"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <FaPlus className="mr-2" /> Ajouter une nouvelle fiche
        </button>
      </div>

   {/* FORMULAIRE */}
{showForm && (
  <form onSubmit={handleSubmit} className="bg-gray-100 p-6 rounded-lg mb-4">
    <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">
      {ficheEnCours ? "Modifier une fiche" : "Ajouter une fiche"}
    </h2>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Colonne 1 */}
      <div>
        {/* Informations personnelles */}
        <fieldset className="border border-gray-300 p-4 rounded-lg mb-6">
          <legend className="font-semibold text-lg text-gray-700 px-1">Informations personnelles</legend>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="matricule" className="block text-sm font-medium text-gray-700">Matricule</label>
              <input id="matricule" type="text" name="matricule" value={newFiche.matricule} onChange={handleChange} className="mt-1 block w-24 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label htmlFor="classe" className="block text-sm font-medium text-gray-700">Classe</label>
              <input id="classe" type="text" name="classe" value={newFiche.classe} onChange={handleChange} className="mt-1 block w-24 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom</label>
              <input id="nom" type="text" name="nom" value={newFiche.nom} onChange={handleChange} className="mt-1 block w-48 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label htmlFor="prenom" className="block text-sm font-medium text-gray-700">Prénom</label>
              <input id="prenom" type="text" name="prenom" value={newFiche.prenom} onChange={handleChange} className="mt-1 block w-48 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label htmlFor="poste" className="block text-sm font-medium text-gray-700">Fonction</label>
              <input id="poste" type="text" name="poste" value={newFiche.poste} onChange={handleChange} className="mt-1 block w-48 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="cnaps_num" className="block text-sm font-medium text-gray-700">N° CNaPS</label>
              <input id="cnaps_num" type="text" name="cnaps_num" value={newFiche.cnaps_num} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="mois" className="block text-sm font-medium text-gray-700">Mois</label>
              <select
                id="mois"
                name="mois"
                value={newFiche.mois}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm"
                required
              >
                <option value="">-- Sélectionner --</option>
                <option value="01">Janvier</option>
                <option value="02">Février</option>
                <option value="03">Mars</option>
                <option value="04">Avril</option>
                <option value="05">Mai</option>
                <option value="06">Juin</option>
                <option value="07">Juillet</option>
                <option value="08">Août</option>
                <option value="09">Septembre</option>
                <option value="10">Octobre</option>
                <option value="11">Novembre</option>
                <option value="12">Décembre</option>
              </select>
            </div>

            <div>
              <label htmlFor="annee" className="block text-sm font-medium text-gray-700">Année</label>
              <input
                id="annee"
                type="number"
                name="annee"
                value={newFiche.annee}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="date_paiement" className="block text-sm font-medium text-gray-700">Date de paiement</label>
              <input id="date_paiement" type="date" name="date_paiement" value={newFiche.date_paiement} onChange={handleChange} className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="periode_debut" className="block text-sm font-medium text-gray-700">Période du</label>
              <input id="periode_debut" type="date" name="periode_debut" value={newFiche.periode_debut} onChange={handleChange} className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="periode_fin" className="block text-sm font-medium text-gray-700">Période au</label>
              <input id="periode_fin" type="date" name="periode_fin" value={newFiche.periode_fin} onChange={handleChange} className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="mode_paiement" className="block text-sm font-medium text-gray-700">Mode de paiement</label>
              <input id="mode_paiement" type="text" name="mode_paiement" value={newFiche.mode_paiement} onChange={handleChange} className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </fieldset>

        {/* Salaire & heures */}
        <fieldset className="border border-gray-300 p-4 rounded-lg mb-6">
          <legend className="font-semibold text-lg text-gray-700 px-1">Salaire & heures</legend>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="salaire_base" className="block text-sm font-medium text-gray-700">Salaire de base</label>
              <input id="salaire_base" type="number" name="salaire_base" value={newFiche.salaire_base} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="taux_horaire" className="block text-sm font-medium text-gray-700">Taux horaire</label>
              <input id="taux_horaire" type="number" name="taux_horaire" value={newFiche.taux_horaire} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="heures" className="block text-sm font-medium text-gray-700">Heures effectuées</label>
              <input id="heures" type="number" name="heures" value={newFiche.heures} onChange={handleChange} className="mt-1 block w-24 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="prime" className="block text-sm font-medium text-gray-700">Prime</label>
              <input id="prime" type="number" name="prime" value={newFiche.prime} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="majoration" className="block text-sm font-medium text-gray-700">Majoration</label>
              <input id="majoration" type="number" name="majoration" value={newFiche.majoration} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="allocation_conge" className="block text-sm font-medium text-gray-700">Allocation congé</label>
              <input id="allocation_conge" type="number" name="allocation_conge" value={newFiche.allocation_conge} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="preavis" className="block text-sm font-medium text-gray-700">Préavis</label>
              <input id="preavis" type="number" name="preavis" value={newFiche.preavis} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
              {/* ⬅️ AJOUT DU CHAMP NOMBRE DE CONGÉ */}
            <div>
              <label htmlFor="nb_conge" className="block text-sm font-medium text-gray-700">Nb. Congé (jours)</label>
              <input id="nb_conge" type="number" name="nb_conge" value={newFiche.nb_conge} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" min="0"/>
            </div>
          </div>
        </fieldset>
      </div>

      {/* Colonne 2 */}
      <div>
        {/* Famille */}
        <fieldset className="border border-gray-300 p-4 rounded-lg mb-6">
          <legend className="font-semibold text-lg text-gray-700 px-1">Famille & enfants</legend>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nbr_enfant" className="block text-sm font-medium text-gray-700">Nombre d'enfants</label>
              <input id="nbr_enfant" type="number" name="nbr_enfant" value={newFiche.nbr_enfant} onChange={handleChange} className="mt-1 block w-24 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="nb_enf" className="block text-sm font-medium text-gray-700">Nb enf (déduction)</label>
              <input id="nb_enf" type="number" name="nb_enf" value={newFiche.nb_enf} onChange={handleChange} className="mt-1 block w-24 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="fm" className="block text-sm font-medium text-gray-700">Frais de Mission</label>
              <input id="fm" type="number" name="fm" value={newFiche.fm} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </fieldset>

        {/* Heures supplémentaires */}
        <fieldset className="border border-gray-300 p-4 rounded-lg mb-6">
          <legend className="font-semibold text-lg text-gray-700 px-1">Heures supplémentaires</legend>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="hs_exo_irsa" className="block text-sm font-medium text-gray-700">HS exonérées IRSA</label>
              <input id="hs_exo_irsa" type="number" name="hs_exo_irsa" value={newFiche.hs_exo_irsa} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="hs_imposable" className="block text-sm font-medium text-gray-700">HS imposables</label>
              <input id="hs_imposable" type="number" name="hs_imposable" value={newFiche.hs_imposable} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </fieldset>
        
        {/* Charges sociales */}
        <fieldset className="border border-gray-300 p-4 rounded-lg mb-6">
          <legend className="font-semibold text-lg text-gray-700 px-1">Charges sociales & impôts</legend>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="cnaps" className="block text-sm font-medium text-gray-700">CNaPS</label>
              <input id="cnaps" type="number" name="cnaps" value={newFiche.cnaps} readOnly className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm bg-gray-200" />
            </div>
            <div>
              <label htmlFor="ostie" className="block text-sm font-medium text-gray-700">OSTIE</label>
              <input id="ostie" type="number" name="ostie" value={newFiche.ostie} readOnly className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm bg-gray-200" />
            </div>
            <div>
              <label htmlFor="irsa" className="block text-sm font-medium text-gray-700">IRSA</label>
              <input id="irsa" type="number" name="irsa" value={newFiche.irsa} readOnly className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm bg-gray-200" />
            </div>
          </div>
        </fieldset>

        {/* Avances & retenues */}
        <fieldset className="border border-gray-300 p-4 rounded-lg mb-6">
          <legend className="font-semibold text-lg text-gray-700 px-1">Avances & retenues</legend>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="avance15" className="block text-sm font-medium text-gray-700">Avance du 15</label>
              <input id="avance15" type="number" name="avance15" value={newFiche.avance15} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="avance_speciale" className="block text-sm font-medium text-gray-700">Avance spéciale</label>
              <input id="avance_speciale" type="number" name="avance_speciale" value={newFiche.avance_speciale} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="autre" className="block text-sm font-medium text-gray-700">Autres retenues</label>
              <input id="autre" type="number" name="autre" value={newFiche.autre} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="cantine" className="block text-sm font-medium text-gray-700">Cantine</label>
              <input id="cantine" type="number" name="cantine" value={newFiche.cantine} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="reglement" className="block text-sm font-medium text-gray-700">Règlement</label>
              <input id="reglement" type="number" name="reglement" value={newFiche.reglement} onChange={handleChange} className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </fieldset>

        {/* Résultat final */}
        <fieldset className="border border-gray-300 p-4 rounded-lg mb-6">
          <legend className="font-semibold text-lg text-gray-700 px-1">Résultat final</legend>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="salaire_brut_total" className="block text-sm font-medium text-gray-700">Salaire brut total</label>
              <input id="salaire_brut_total" type="number" name="salaire_brut_total" value={newFiche.salaire_brut_total} readOnly className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm bg-gray-200" />
            </div>
            <div>
              <label htmlFor="salaire_brut_imposable" className="block text-sm font-medium text-gray-700">Salaire brut imposable</label>
              <input id="salaire_brut_imposable" type="number" name="salaire_brut_imposable" value={newFiche.salaire_brut_imposable} readOnly className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm bg-gray-200" />
            </div>
            <div>
              <label htmlFor="salaire_net" className="block text-sm font-medium text-gray-700">Salaire net</label>
              <input id="salaire_net" type="number" name="salaire_net" value={newFiche.salaire_net} readOnly className="mt-1 block w-40 border border-gray-300 p-2 rounded-md shadow-sm font-bold text-green-700 bg-gray-200" />
            </div>
          </div>
        </fieldset>
      </div>
    </div>

    <div className="mt-8 flex justify-end space-x-4">
      <button type="submit" className="flex items-center bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
        {ficheEnCours ? "Mettre à jour" : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setShowForm(false)} className="flex items-center bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors">
        Annuler
      </button>
    </div>
  </form>
)}


      {/* TABLEAU */}
      <div className="max-h-[80vh] overflow-y-auto rounded shadow border">
        <table className="w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100 text-left sticky top-0 z-10">
            <tr>
              <th className="border px-2 py-1">N° Mlle</th>
              <th className="border px-2 py-1">Class</th>
              <th className="border px-2 py-1">Nom & Prénom(s)</th>
              <th className="border px-2 py-1">Mois</th>
              <th className="border px-2 py-1">Sal Base</th>
              <th className="border px-2 py-1">Taux Horaire</th>
              <th className="border px-2 py-1">H/Effectué</th>
              <th className="border px-2 py-1">Nbr enfant</th>
              <th className="border px-2 py-1">Allocation congé</th>
              <th className="border px-2 py-1">Préavis</th>
              <th className="border px-2 py-1">Prime</th>
              <th className="border px-2 py-1">FM</th>
              <th className="border px-2 py-1">HS exo IRSA</th>
              <th className="border px-2 py-1">HS Imposable</th>
              <th className="border px-2 py-1">Majoration</th>
              <th className="border px-2 py-1">Sal Brut total</th>
              <th className="border px-2 py-1">Sal Brut imposable</th>
              <th className="border px-2 py-1">CNaPS</th>
              <th className="border px-2 py-1">Ostie</th>
              <th className="border px-2 py-1">Nb Enf</th>
              <th className="border px-2 py-1">IRSA</th>
              <th className="border px-2 py-1">Avance du 15</th>
              <th className="border px-2 py-1">Avance spéciale</th>
              <th className="border px-2 py-1">Autre</th>
              <th className="border px-2 py-1">Cantine</th>
              <th className="border px-2 py-1">Règlement</th>
              <th className="border px-2 py-1 text-green-600">Salaire NET</th>
              <th className="border px-2 py-1">Date paiement</th>
              <th className="border px-2 py-1">Mode paiement</th>
              <th className="border px-2 py-1 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
              {[...fichesFiltrees]
              .sort((a, b) => Number(a.matricule) - Number(b.matricule))
              .map((fiche) => {
                  const moisChoisi = moisSelectionnes[fiche.matricule] || Object.keys(fiche.moisData)[0];
                  const details = fiche.moisData[moisChoisi];
                return (
                  <tr key={fiche.matricule + "-" + moisChoisi} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{fiche.matricule}</td>
                    <td className="border px-2 py-1">{fiche.classe}</td>
                    <td className="border px-2 py-1">{fiche.nom} {fiche.prenom}</td>
                    <td className="border px-2 py-1">
                      <select value={moisChoisi} onChange={(e) => handleChangeMois(fiche.matricule, e.target.value)} className="border p-1 rounded">
                        {Object.keys(fiche.moisData).map((m) => (
                          <option key={m} value={m}>{getMonthName(m)}</option>
                        ))}
                      </select>
                    </td>
                    {details ? (
                      <>
                        <td className="border px-2 py-1">{formatNumber(details.salaire_base)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.taux_horaire)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.heures)}</td>
                        <td className="border px-2 py-1">{details.nbr_enfant}</td>
                        <td className="border px-2 py-1">{formatNumber(details.allocation_conge)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.preavis)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.prime)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.fm)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.hs_exo_irsa)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.hs_imposable)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.majoration)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.salaire_brut_total)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.salaire_brut_imposable)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.cnaps)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.ostie)}</td>
                        <td className="border px-2 py-1">{details.nb_enf}</td>
                        <td className="border px-2 py-1">{formatNumber(details.irsa)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.avance15)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.avance_speciale)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.autre)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.cantine)}</td>
                        <td className="border px-2 py-1">{formatNumber(details.reglement)}</td>
                        <td className="border px-2 py-1 font-bold text-green-700">{formatNumber(details.salaire_net)}</td>
                        <td className="border px-2 py-1">{details.date_paiement}</td>
                        <td className="border px-2 py-1">{details.mode_paiement}</td>
                        <td className="border px-2 py-1 text-center space-x-2">
                          <button onClick={() => exporterPDF(details)} className="text-green-600 hover:text-green-800" title="Exporter en PDF"><FaDownload /></button>
                          <button onClick={() => modifierFiche(details)} className="text-blue-600 hover:text-blue-800" title="Modifier"><FaEdit /></button>
                          <button onClick={() => supprimerFiche(details)} className="text-red-600 hover:text-red-800" title="Supprimer"><FaTrash /></button>
                        </td>
                      </>
                    ) : <td className="border px-2 py-1 text-center" colSpan={28}>Aucune donnée</td>}
                  </tr>
                );
              })}
            </tbody>

        </table>
      </div>
    </div>
  );
}

export default Fiches;
