import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Accueil from "./pages/Accueil"; // ➝ on va créer cette page

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/accueil" element={<Accueil />} />
      </Routes>
    </Router>
  );
}

export default App;
