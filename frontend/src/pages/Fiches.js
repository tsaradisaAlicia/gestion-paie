// src/pages/Fiches.js
import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaDownload, FaSearch } from "react-icons/fa";
import axios from "axios";

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

  // Calcul du Salaire brut total
  const salaire_brut_total =
    salaire_base + prime + majoration + allocation_conge + hs_imposable + autre;

  // Taux de cotisation
  const taux_cnaps = 0.01;
  const taux_ostie = 0.01;

  // Calcul des retenues
  const cnaps = salaire_brut_total * taux_cnaps;
  const ostie = salaire_brut_total * taux_ostie;

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
  });

 const handleChange = (e) => {
  const { name, value } = e.target;
  
  setNewFiche((prevFiche) => {
    // 1. Mettre à jour l'état avec la nouvelle valeur
    const updatedFiche = { ...prevFiche, [name]: value };

    // 2. Déclencher le calcul si un champ pertinent est modifié
    const champsAcalculer = [
      "salaire_base", "prime", "majoration", "allocation_conge", 
      "hs_imposable", "autre", "nb_enf", "hs_exo_irsa","avance15", "avance_speciale", "cantine"
    ];
    
    if (champsAcalculer.includes(name)) {
      // Appeler la fonction de calcul avec les données à jour
      return calculerFiche(updatedFiche);
    }

    // Sinon, juste retourner la fiche mise à jour
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
        await axios.put(`http://localhost:5000/fiches/${ficheEnCours.id}`, newFiche);
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
        alert("Fiche modifiée avec succès !");
        setFicheEnCours(null);
      } else {
        const res = await axios.post("http://localhost:5000/fiches", newFiche);
        setFiches((prev) => {
          const index = prev.findIndex((f) => f.matricule === newFiche.matricule);
          if (index !== -1) {
            const updated = [...prev];
            updated[index].moisData[newFiche.mois] = { ...newFiche, id: res.data.id };
            return updated;
          }
          return [...prev, { ...newFiche, id: res.data.id, moisData: { [newFiche.mois]: newFiche } }];
        });
        alert("Fiche ajoutée avec succès !");
      }

      setNewFiche({
        matricule: "",
        classe: "",
        nom: "",
        prenom: "",
        mois: "",
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
      });
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de la fiche");
    }
  };

  useEffect(() => {
    axios
      .get("http://localhost:5000/fiches")
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
    if (window.confirm("Voulez-vous vraiment supprimer cette fiche ?")) {
      axios
        .delete(`http://localhost:5000/fiches/${fiche.id}`)
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
    setNewFiche(fiche);
    setShowForm(true);
  };

// Function to generate PDF of a fiche
const exporterPDF = async (fiche) => {
  try {
    const response = await axios.get(`http://localhost:5000/api/export-pdf/${fiche.id}`, {
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
    alert("Une erreur est survenue lors de l'exportation du PDF.");
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
              <input id="mois" type="month" name="mois" value={newFiche.mois} onChange={handleChange} className="mt-1 block w-full border border-gray-300 p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" required />
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
                          <option key={m} value={m}>{m}</option>
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
