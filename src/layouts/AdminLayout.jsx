import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import TopBar from '../components/admin/TopBar';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#0a0f1e', color: 'white' }}>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <TopBar isOpen={isSidebarOpen} />

            <main style={{
                padding: '2rem',
                marginTop: '64px',
                marginLeft: isSidebarOpen ? '260px' : '70px',
                transition: 'margin-left 0.3s ease',
                minHeight: 'calc(100vh - 64px)'
            }}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
