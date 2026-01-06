import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
    return (
        <div className="loading-container">
            <div className="loader-3d">
                <div className="face face1">
                    <div className="circle"></div>
                </div>
                <div className="face face2">
                    <div className="circle"></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
