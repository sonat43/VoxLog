import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, Users, FileCheck } from 'lucide-react';
import './TrustFlow.css';

const steps = [
    {
        icon: Camera,
        title: "Visual Census",
        desc: "Classroom Image Capture & Headcount"
    },
    {
        icon: Mic,
        title: "Voice Roll Call",
        desc: "Sequential Audio & Text Conversion"
    },
    {
        icon: Users,
        title: "Cross-Validation",
        desc: "Match Voice Logs with Headcount"
    },
    {
        icon: FileCheck,
        title: "Final Verification",
        desc: "Discrepancy Checks & Report Generation"
    }
];

const TrustFlow = () => {
    return (
        <div className="trust-flow-container">
            {/* Visual Connecting Line */}
            <div className="trust-flow-line" />

            {steps.map((step, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2, duration: 0.5 }}
                    className="trust-flow-step"
                >
                    {/* Icon Container */}
                    <div className="step-icon-box">
                        <step.icon className="step-icon" />
                    </div>

                    {/* Text Content */}
                    <div className="step-content">
                        <h3 className="step-title">
                            {step.title}
                        </h3>
                        <p className="step-desc">
                            {step.desc}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default TrustFlow;
