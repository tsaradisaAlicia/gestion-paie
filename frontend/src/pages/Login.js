import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import
import { FaEye, FaEyeSlash } from "react-icons/fa";
import logoLogin from "../assets/logo_login.png";
import logoThermocool from "../assets/logo_thermocool.png";

function Login() {
  const [matricule, setMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState("");
  const navigate = useNavigate(); // ✅ hook de navigation

  const handleSubmit = (e) => {
    e.preventDefault();

    // 🚀 Simulation de login : matricule = "admin", motDePasse = "1234"
    if (matricule === "136" && motDePasse === "noelisoa51") {
      setErreur("");
      navigate("/accueil"); // ✅ redirection
    } else {
      setErreur("Matricule ou mot de passe incorrect !");
    }
  };

  return (
    <div
      className="flex items-center justify-center h-screen bg-cover bg-center relative"
      style={{ backgroundImage: `url(${logoLogin})` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      <div className="relative w-full max-w-md p-8 bg-white bg-opacity-90 rounded-2xl shadow-md">
        <img
          src={logoThermocool}
          alt="Logo Thermocool"
          className="mx-auto mb-6 h-40 rounded-3xl"
        />
        <h1 className="text-2xl font-bold text-center text-gray-700 mb-6">
          GESTION DE PAIE
        </h1>
        <h2 className="text-xl font-semibold text-center text-gray-700 mb-6">
          Connexion
        </h2>

        {erreur && (
          <p className="text-red-500 text-center mb-4">{erreur}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 mb-1">Matricule</label>
            <input
              type="text"
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Entrez votre matricule"
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
                placeholder="********"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
