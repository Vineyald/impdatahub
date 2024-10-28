import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../statics/css/pagecontent.scss';

const MainLayout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Função para lidar com o toggle da sidebar
  const handleToggleSidebar = (isExpanded) => {
    setIsSidebarExpanded(isExpanded);
  };

  return (
    <div className="wrapper">
      <Sidebar onToggle={handleToggleSidebar} />
      <div className={`pagecontent ${isSidebarExpanded ? 'expanded' : ''} p-5`}>
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
