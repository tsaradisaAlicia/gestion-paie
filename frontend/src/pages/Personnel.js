import { useEffect, useState, useCallback } from "react";
import axios from "axios";
// Remplacement des imports externes par des icônes SVG pour la compatibilité
// import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";

// *** CORRECTION DE L'URL DU SERVEUR : Utilisation de l'URL de production fournie ***
const API_BASE_URL = "https://gestion-paie-b7w6.onrender.com"; 
// L'URL de votre serveur backend est maintenant configurée ici.

// Icônes SVG intégrées (FaPlus, FaEdit, FaTrash, FaSearch)
const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/></svg>;
const EditIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M410.3 231l11.3-11.3c9.3-9.3 17-21.7 17-38.1c0-26.6-10.6-51.5-29.7-70.6L378.6 19.3c-19.1-19.1-44-29.7-70.6-29.7c-16.4 0-28.8 7.7-38.1 17L90 278.6c-4.9 4.9-7.7 11.3-7.7 17.7V417c0 17.7 14.3 32 32 32H203.7c6.4 0 12.8-2.8 17.7-7.7L492.7 278.6c4.9-4.9 7.7-11.3 7.7-17.7V231c0-6.4-2.8-12.8-7.7-17.7l-41.7-41.7zM368.1 136.2L282.8 50.9l75.4-75.4c4.1-4.1 10.7-6.2 17.1-6.2c6.4 0 13 2.1 17.1 6.2l39.5 39.5c8.3 8.3 12.8 19.3 12.8 30.6s-4.5 22.3-12.8 30.6L368.1 136.2zM128 416V306.6L337.4 97.2 422.7 182.5 213.3 391.9c-4.9 4.9-11.3 7.7-17.7 7.7H128z"/></svg>;
const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M135.2 17.7L144 32H50.5C22.6 32 0 54.6 0 82.5V112c0 13.3 10.7 24 24 24H424c13.3 0 24-10.7 24-24V82.5c0-27.9-22.6-50.5-50.5-50.5H304L292.8 17.7c-2.3-3.6-6.4-5.7-10.7-5.7H166.4c-4.3 0-8.4 2.1-10.7 5.7zM424 192H24c-13.3 0-24 10.7-24 24V464c0 26.5 21.5 48 48 48H400c26.5 0 48-21.5 48-48V216c0-13.3-10.7-24-24-24zm-64 80c0-6.4 5.1-11.5 11.5-11.5c6.4 0 11.5 5.1 11.5 11.5v176c0 6.4-5.1 11.5-11.5 11.5c-6.4 0-11.5-5.1-11.5-11.5V272zM216 272c0-6.4 5.1-11.5 11.5-11.5c6.4 0 11.5 5.1 11.5 11.5v176c0 6.4-5.1 11.5-11.5 11.5c-6.4 0-11.5-5.1-11.5-11.5V272zM96 272c0-6.4 5.1-11.5 11.5-11.5c6.4 0 11.5 5.1 11.5 11.5v176c0 6.4-5.1 11.5-11.5 11.5c-6.4 0-11.5-5.1-11.5-11.5V272z"/></svg>;
const SearchIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.1-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zm-208 80a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>;


function Personnel() {
  const [employes, setEmployes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false); // Modal d'ajout/édition
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); // Modal de confirmation custom
  const [editingEmp, setEditingEmp] = useState(null);
  const [formData, setFormData] = useState({
    matricule: "",
    nom: "",
    prenom: "",
    poste: "",
  });
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState("");

  // État pour stocker l'action en attente de confirmation (ADD, EDIT, DELETE)
  const [confirmAction, setConfirmAction] = useState({ type: null, payload: null });

  // Utilisation de useCallback pour la fonction de fetch afin qu'elle puisse être utilisée comme dépendance
  const fetchEmployes = useCallback(() => {
    axios
      .get(`${API_BASE_URL}/personnels`) // Utilisation de la constante API_BASE_URL
      .then((res) => {
        // Trier par matricule numérique
        const sorted = res.data.sort(
          (a, b) => Number(a.matricule) - Number(b.matricule)
        );
        setEmployes(sorted);
      })
      .catch((err) => {
        console.error("Erreur lors du chargement des employés:", err);
        setNotification("❌ Erreur lors du chargement des données.");
        setTimeout(() => setNotification(""), 3000);
      });
  }, []);

  useEffect(() => {
    fetchEmployes();
  }, [fetchEmployes]);

  // Ouvrir modal pour ajout ou édition
  const openModal = (emp = null) => {
    if (emp) {
      setEditingEmp(emp);
      setFormData({
        matricule: emp.matricule,
        nom: emp.nom,
        prenom: emp.prenom,
        poste: emp.poste,
      });
    } else {
      setEditingEmp(null);
      setFormData({ matricule: "", nom: "", prenom: "", poste: "" });
    }
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Exécute l'action après la confirmation dans le modal custom
  const executeAction = () => {
    setIsConfirmOpen(false); // Ferme le modal de confirmation

    const { type, payload } = confirmAction;

    if (type === 'ADD' || type === 'EDIT') {
      const { formData, empId } = payload;
      const apiCall = type === 'EDIT'
        ? axios.put(`${API_BASE_URL}/personnels/${empId}`, formData) // Utilisation de API_BASE_URL
        : axios.post(`${API_BASE_URL}/personnels`, formData); // Utilisation de API_BASE_URL

      apiCall
        .then(() => {
          fetchEmployes();
          setNotification(
            type === 'EDIT'
              ? "✏️ Employé modifié avec succès !"
              : "✅ Employé ajouté avec succès !"
          );
          setTimeout(() => setNotification(""), 3000);
          closeModal();
        })
        .catch((err) => {
            console.error(err);
            setNotification("❌ Erreur lors de l'enregistrement !");
            setTimeout(() => setNotification(""), 3000);
        });

    } else if (type === 'DELETE') {
      const { id } = payload;
      axios
        .delete(`${API_BASE_URL}/personnels/${id}`) // Utilisation de API_BASE_URL
        .then(() => {
          fetchEmployes();
          setNotification("🗑️ Employé supprimé avec succès !");
          setTimeout(() => setNotification(""), 3000);
        })
        .catch((err) => {
            console.error(err);
            setNotification("❌ Erreur lors de la suppression !");
            setTimeout(() => setNotification(""), 3000);
        });
    }
    // Réinitialiser l'action en attente
    setConfirmAction({ type: null, payload: null });
  };


  // Ouvre le modal de confirmation pour l'ajout ou la modification
  const handleSubmit = (e) => {
    e.preventDefault();

    const actionType = editingEmp ? "EDIT" : "ADD";
    const empId = editingEmp ? editingEmp.id : null;

    // Définir l'action et ouvrir le modal de confirmation
    setConfirmAction({
        type: actionType,
        payload: { formData, empId }
    });
    setIsConfirmOpen(true);
  };

  // Ouvre le modal de confirmation pour la suppression
  const handleDelete = (id) => {
    // Définir l'action et ouvrir le modal de confirmation
    setConfirmAction({
        type: 'DELETE',
        payload: { id }
    });
    setIsConfirmOpen(true);
  };

  // Filtrer les employés par recherche
  const filteredEmployes = employes.filter((emp) =>
    [emp.matricule, emp.nom, emp.prenom, emp.poste]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <h3 className="text-3xl font-extrabold text-blue-700">
          <span className="inline-block align-middle mr-2">👥</span> Gestion du Personnel
        </h3>

        {/* Zone de recherche */}
        <div className="flex items-center border border-gray-300 rounded-xl px-3 py-1 shadow-inner w-full md:w-1/3">
          <SearchIcon className="text-gray-400 mr-2 h-4 w-4" />
          <input
            type="text"
            placeholder="Rechercher (matricule, nom, prénom, poste)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 outline-none bg-transparent text-gray-700"
          />
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          <PlusIcon className="mr-2 h-4 w-4" /> Ajouter un employé
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`px-4 py-3 rounded-xl mb-4 font-medium ${notification.startsWith('❌') ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'}`}>
          {notification}
        </div>
      )}

      {/* Tableau */}
      <div className="max-h-[70vh] overflow-y-auto rounded-xl shadow-lg border border-gray-200">
        <table className="w-full border-collapse">
          <thead className="bg-blue-50 text-left sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="border-b-2 border-blue-200 p-3 text-sm font-semibold text-blue-800 w-1/12">Matricule</th>
              <th className="border-b-2 border-blue-200 p-3 text-sm font-semibold text-blue-800 w-3/12">Nom</th>
              <th className="border-b-2 border-blue-200 p-3 text-sm font-semibold text-blue-800 w-3/12">Prénom</th>
              <th className="border-b-2 border-blue-200 p-3 text-sm font-semibold text-blue-800 w-4/12">Poste</th>
              <th className="border-b-2 border-blue-200 p-3 text-sm font-semibold text-blue-800 text-center w-1/12">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployes.map((emp) => (
              <tr key={emp.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition">
                <td className="p-3 text-gray-800 font-mono">{emp.matricule}</td>
                <td className="p-3 text-gray-800">{emp.nom}</td>
                <td className="p-3 text-gray-800">{emp.prenom}</td>
                <td className="p-3 text-gray-800">{emp.poste}</td>
                <td className="p-3 text-center space-x-3 flex justify-center items-center">
                  <button
                    onClick={() => openModal(emp)}
                    className="text-yellow-500 hover:text-yellow-700 transition transform hover:scale-110 p-1"
                    title="Modifier"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="text-red-500 hover:text-red-700 transition transform hover:scale-110 p-1"
                    title="Supprimer"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}

            {filteredEmployes.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-6 text-gray-500 italic">
                  Aucun employé trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal ajout / édition */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
            <h3 className="text-2xl font-bold mb-5 text-blue-700">
              {editingEmp ? "✏️ Modifier Employé" : "➕ Ajouter Employé"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {['matricule', 'nom', 'prenom', 'poste'].map(field => (
                <input
                  key={field}
                  type="text"
                  name={field}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={formData[field]}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  required
                />
              ))}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md"
                >
                  {editingEmp ? "Enregistrer les modifications" : "Ajouter l'employé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all">
                <h3 className="text-xl font-semibold mb-4 text-red-600">
                    <span className="inline-block align-middle mr-2">{confirmAction.type === 'DELETE' ? '⚠️' : '❓'}</span>
                    Confirmer l'Action
                </h3>
                <p className="mb-6 text-gray-700">
                    {confirmAction.type === 'ADD' && "Voulez-vous vraiment ajouter ce nouvel employé ?"}
                    {confirmAction.type === 'EDIT' && "Voulez-vous vraiment modifier les informations de cet employé ?"}
                    {confirmAction.type === 'DELETE' && "Voulez-vous vraiment supprimer cet employé ? Cette action est irréversible."}
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => {
                            setIsConfirmOpen(false);
                            setConfirmAction({ type: null, payload: null });
                            // Si c'est un ajout/édition, nous devons rouvrir le modal principal si l'utilisateur annule ici
                            if (confirmAction.type === 'ADD' || confirmAction.type === 'EDIT') {
                                setModalOpen(true);
                            }
                        }}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={executeAction}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition shadow-md"
                    >
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Personnel;
