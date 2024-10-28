import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './statics/css/style.scss';
import './index.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import Master from './pages/Master';
import Home from './pages/Home';
import InactiveClients from './pages/InactiveClients';
import ClientsFilters from './pages/ClientsFilters';
import RankingClientes from './pages/RankingClientes';
import ClientProfile from './pages/ClientProfile';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Master />}>
            <Route path="/" element={<Home />} />
            <Route path="inactive_clients" element={<InactiveClients />} />
            <Route path="clients_filters" element={<ClientsFilters />} />
            <Route path="ranking_clientes" element={<RankingClientes />} />
            <Route path="clientes/:clientId" element={<ClientProfile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
