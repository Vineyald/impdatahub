import React, { useState } from 'react';
import '../statics/css/sidebar.scss';

const Sidebar = ({ onToggle }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    onToggle(!isExpanded);  // Atualiza o estado no MainLayout
  };

  return (
    <aside id="sidebar" className={`sidebar ${isExpanded ? 'expand' : ''}`}>
      <div className="d-flex">
        <button className="toggle-btn" onClick={toggleSidebar} type="button">
          <i className="bi bi-list"></i>
        </button>
        <div className="sidebar-logo">
          <a href="/">Imperio Datahub</a>
        </div>
      </div>
      <ul className="sidebar-nav">
        <li className="sidebar-item">
          <a
            href="#clientes"
            className="side-menu sidebar-link collapsed has-dropdown"
            data-bs-toggle="collapse"
          >
            <i className="bi bi-person-circle"></i>
            <span>Clientes</span>
          </a>
          <ul id="clientes" className="sidebar-dropdown list-unstyled collapse">
            <li className="sidebar-item">
              <a href="/inactive_clients" className="sidebar-link side-item">• Clientes inativos</a>
            </li>
            <li className="sidebar-item">
              <a href="/clients_filters" className="sidebar-link side-item">• Filtrar clientes</a>
            </li>
            <li className="sidebar-item">
              <a href="/ranking_clientes" className="sidebar-link side-item">• Ranking top 20</a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Clientes sem compras</a>
            </li>
          </ul>
        </li>

        <li className="sidebar-item">
          <a
            href="#produtos"
            className="side-menu sidebar-link collapsed has-dropdown"
            data-bs-toggle="collapse"
          >
            <i className="bi bi-bag-fill"></i>
            <span>Produtos</span>
          </a>
          <ul id="produtos" className="sidebar-dropdown list-unstyled collapse">
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Produtos mais vendidos</a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Produtos sem vendas</a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Relatórios com filtro</a>
            </li>
          </ul>
        </li>

        <li className="sidebar-item">
          <a
            href="#vendas"
            className="side-menu sidebar-link collapsed has-dropdown"
            data-bs-toggle="collapse"
          >
            <i className="bi bi-bar-chart-fill"></i>
            <span>Vendas</span>
          </a>
          <ul id="vendas" className="sidebar-dropdown list-unstyled collapse">
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Ranking de compras</a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Gráficos por rota</a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Vendas semanais</a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link side-item">• Resumo de vendas</a>
            </li>
          </ul>
        </li>

        <li className="sidebar-item">
          <a href="#" className="sidebar-link">
            <i className="bi bi-clipboard2-data-fill"></i>
            <span>Meus clientes</span>
          </a>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
