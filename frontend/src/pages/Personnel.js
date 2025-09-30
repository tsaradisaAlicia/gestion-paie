// src/pages/Personnel.js
import { useEffect, useState } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";

function Personnel() {
  const [employes, setEmployes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formData, setFormData] = useState({
    matricule: "",
    nom: "",
    prenom: "",
    poste: "",
  });
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState("");

  // Charger les employés depuis le backend et trier par matricule
  const fetchEmployes = () => {
    axios
      .get("http://localhost:5000/personnels")
      .then((res) => {
        const sorted = res.data.sort(
          (a, b) => Number(a.matricule) - Number(b.matricule)
        );
        setEmployes(sorted);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchEmployes();
  }, []);

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

  // Ajouter ou modifier un employé avec confirmation
  const handleSubmit = (e) => {
    e.preventDefault();

    const action = editingEmp ? "modifier" : "ajouter";
    if (!window.confirm(`Voulez-vous vraiment ${action} cet employé ?`)) {
      return; // annuler si l'utilisateur clique sur Non
    }

    if (editingEmp) {
      // Modifier
      axios
        .put(`http://localhost:5000/personnels/${editingEmp.id}`, formData)
        .then(() => {
          fetchEmployes();
          setNotification("✏️ Employé modifié avec succès !");
          setTimeout(() => setNotification(""), 3000);
          closeModal();
        })
        .catch((err) => console.error(err));
    } else {
      // Ajouter
      axios
        .post("http://localhost:5000/personnels", formData)
        .then(() => {
          fetchEmployes();
          setNotification("✅ Employé ajouté avec succès !");
          setTimeout(() => setNotification(""), 3000);
          closeModal();
        })
        .catch((err) => console.error(err));
    }
  };

  // Supprimer employé avec confirmation
  const handleDelete = (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cet employé ?")) {
      axios
        .delete(`http://localhost:5000/personnels/${id}`)
        .then(() => {
          fetchEmployes();
          setNotification("🗑️ Employé supprimé avec succès !");
          setTimeout(() => setNotification(""), 3000);
        })
        .catch((err) => console.error(err));
    }
  };

  // Filtrer les employés par recherche
  const filteredEmployes = employes.filter((emp) =>
    [emp.matricule, emp.nom, emp.prenom, emp.poste]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 space-y-3 md:space-y-0">
        <h3 className="text-2xl font-bold text-blue-700">
          Gestion des personnels
        </h3>

        {/* Zone de recherche */}
        <div className="flex items-center border rounded px-2 w-full md:w-1/3">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Rechercher (matricule, nom, prénom, poste)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 outline-none"
          />
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <FaPlus className="mr-2" /> Ajouter un employé
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
          {notification}
        </div>
      )}

      {/* Tableau */}
      <div className="max-h-[80vh] overflow-y-auto rounded shadow border">
      <table className="w-full border-collapse border border-gray-200">
        <thead className="bg-gray-100 text-left sticky top-0 z-10">
          <tr className="bg-gray-100 text-left">
            <th className="border p-2">Matricule</th>
            <th className="border p-2">Nom</th>
            <th className="border p-2">Prénom</th>
            <th className="border p-2">Poste</th>
            <th className="border p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployes.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50">
              <td className="border p-2">{emp.matricule}</td>
              <td className="border p-2">{emp.nom}</td>
              <td className="border p-2">{emp.prenom}</td>
              <td className="border p-2">{emp.poste}</td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => openModal(emp)}
                  className="text-yellow-500 hover:text-yellow-700 mr-2"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(emp.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}

          {filteredEmployes.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center p-4 text-gray-500">
                Aucun employé trouvé
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Modal ajout / édition */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">
              {editingEmp ? "Modifier Employé" : "Ajouter Employé"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                name="matricule"
                placeholder="Matricule"
                value={formData.matricule}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                name="nom"
                placeholder="Nom"
                value={formData.nom}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                name="prenom"
                placeholder="Prénom"
                value={formData.prenom}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                name="poste"
                placeholder="Poste"
                value={formData.poste}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                required
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingEmp ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Personnel;
