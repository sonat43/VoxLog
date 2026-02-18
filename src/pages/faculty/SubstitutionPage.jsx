import React from 'react';
import { useNavigate } from 'react-router-dom';
import SubstitutionManagement from './SubstitutionManagement';

const SubstitutionPage = () => {
    const navigate = useNavigate();

    const handleClose = () => {
        // Navigate back or to dashboard
        navigate(-1);
    };

    return (
        <div style={{ padding: '2rem' }}>
            {/* We render the modal. Since it has a backdrop and fixed position, 
                it will overlay the page content. 
                Ideally, we should refactor SubstitutionManagement to be inline, 
                but for now, forcing it open works. 
            */}
            <SubstitutionManagement isOpen={true} onClose={handleClose} />

            <div style={{ textAlign: 'center', marginTop: '50px', color: '#94a3b8' }}>
                <p>Opening Substitution Management...</p>
            </div>
        </div>
    );
};

export default SubstitutionPage;
