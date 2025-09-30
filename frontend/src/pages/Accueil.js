import { useState } from "react";
import { FaUsers, FaFileInvoiceDollar, FaChartPie, FaSignOutAlt } from "react-icons/fa";
import logoThermocool from "../assets/logo_thermocool.png";
import personnelsImage from "../assets/personnels.png";
import paieImage from "../assets/paie.jpg";
import Personnel from "./Personnel";
import Fiches from "./Fiches"; 


function Dashboard() {
  const [activePage, setActivePage] = useState("accueil"); // ✅ page active

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-700 text-white flex flex-col">
        <div className="flex items-center justify-center py-6 border-b border-blue-700">
          <img
            src={logoThermocool}
            alt="Logo"
            className="w-28 h-20 rounded-full border-2 border-white"
          />
        </div>
        <div className="p-6 text-2xl font-bold border-b border-blue-500">
          Gestion de Paie
        </div>
        <nav className="flex-1 p-4 space-y-4">
          <button
            onClick={() => setActivePage("accueil")}
            className={`flex items-center space-x-2 p-2 rounded w-full text-left ${
              activePage === "accueil" ? "bg-blue-600" : "hover:bg-blue-600"
            }`}
          >
            <FaChartPie /> <span>Accueil</span>
          </button>
          <button
            onClick={() => setActivePage("personnel")}
            className={`flex items-center space-x-2 p-2 rounded w-full text-left ${
              activePage === "personnel" ? "bg-blue-600" : "hover:bg-blue-600"
            }`}
          >
            <FaUsers /> <span>Personnels</span>
          </button>
          <button
            onClick={() => setActivePage("fiches")}
            className={`flex items-center space-x-2 p-2 rounded w-full text-left ${
              activePage === "fiches" ? "bg-blue-600" : "hover:bg-blue-600"
            }`}
          >
            <FaFileInvoiceDollar /> <span>Fiches de paie</span>
          </button>
        </nav>
        <div className="p-4 border-t border-blue-500">
          <button
            onClick={() => setActivePage("logout")}
            className="flex items-center space-x-2 hover:bg-blue-600 p-2 rounded w-full"
          >
            <FaSignOutAlt /> <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-6 overflow-y-auto">
        <header>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Bonjour Madame Ravaka! 🎉
          </h1>
          
        </header>

        {/* ✅ Contenu dynamique */}
        {activePage === "accueil" && (

          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
           
            <div
              onClick={() => setActivePage("personnel")}
              className="bg-white rounded-lg shadow hover:shadow-xl cursor-pointer flex flex-col items-center p-6 transition-transform transform hover:scale-105"
            >
              <img src={personnelsImage} alt="Personnel" className="w-full h-64 object-contain" />
              <h3 className="mt-4 text-lg font-semibold">Personnels</h3>
            </div>

            <div
              onClick={() => setActivePage("fiches")}
              className="bg-white rounded-lg shadow hover:shadow-xl cursor-pointer flex flex-col items-center p-6 transition-transform transform hover:scale-105"
            >
              <img src={paieImage} alt="Fiche de paie" className="w-full h-64 object-contain" />
              <h3 className="mt-4 text-lg font-semibold">Fiches de paie</h3>
            </div>
          </section>
        )}

     {activePage === "personnel" && <Personnel />}
      {activePage === "fiches" && <Fiches />}

        {activePage === "logout" && (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="text-xl font-bold mb-4">Déconnexion</h3>
            <p>Vous avez été déconnecté.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
