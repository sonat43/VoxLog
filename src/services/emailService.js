import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

// --- CONFIGURATION ---
// Replace these with your actual EmailJS keys
const EMAILJS_SERVICE_ID = 'service_9ndotay';
const EMAILJS_TEMPLATE_ID = 'template_pxgrvt9'; // Please provide this (e.g., template_xxxxx)
const EMAILJS_PUBLIC_KEY = 'MUar2bHp5w1Y9ZlTQ';   // Please provide this (e.g., user_xxxxx or public key)

/**
 * Sends an email notification.
 * Uses EmailJS for real delivery if configured, otherwise falls back to simulation.
 * 
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - Email body (HTML supported)
 */
export const sendEmailNotification = async (toEmail, subject, htmlBody) => {
    try {
        console.log(`[📧 EMAIL] Attempting to send to: ${toEmail}`);

        // 1. Add to Firestore Audit Log (Always keep a record)
        await addDoc(collection(db, "mail_queue"), {
            to: toEmail,
            message: {
                subject: subject,
                html: htmlBody,
            },
            status: 'sent_via_emailjs',
            createdAt: serverTimestamp()
        });

        // 2. Send via EmailJS (if configured)
        if (EMAILJS_SERVICE_ID !== 'YOUR_SERVICE_ID') {
            const templateParams = {
                to_email: toEmail,
                subject: subject,
                // We send both keys to be safe, so it works with either {{message}} or {{message_html}}
                message: htmlBody,
                message_html: htmlBody
            };

            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
            console.log("✅ Email sent successfully via EmailJS!");
        } else {
            console.warn("⚠️ EmailJS not configured. Using simulation mode. Check console for details.");
        }

        return { success: true };
    } catch (error) {
        console.error("❌ Error sending email:", error);
        return { success: false, error: error.message };
    }
};
