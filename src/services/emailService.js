import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

// --- CONFIGURATION ---
// Replace these with your actual EmailJS keys
const EMAILJS_SERVICE_ID = 'service_mln4bbo';
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

/**
 * Formats and sends a daily attendance report to a parent.
 * 
 * @param {string} parentEmail - The parent's email address
 * @param {object} studentInfo - Basic student info { name, regNo }
 * @param {Array} attendanceRecords - Array of attendance records for the day { subjectName, status, slotTime }
 * @param {string} dateString - The date of the report
 */
export const sendDailyParentReport = async (parentEmail, studentInfo, attendanceRecords, dateString) => {
    if (!parentEmail) {
        console.warn(`[📧 EMAIL] No parent email for ${studentInfo.name}`);
        return { success: false, error: "No parent email" };
    }

    const subject = `Daily Attendance Report: ${studentInfo.name} - ${dateString}`;

    const totalClasses = attendanceRecords.length;
    const classesAttended = attendanceRecords.filter(r => r.status === 'Present').length;
    const attendancePercentage = totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;

    let percentageColor = '#10b981'; // Green
    let statusText = 'Excellent';
    if (attendancePercentage < 75) { percentageColor = '#f59e0b'; statusText = 'Attention Needed'; }
    if (attendancePercentage < 50) { percentageColor = '#ef4444'; statusText = 'Critical'; }

    // Build the HTML table rows
    let tableRows = attendanceRecords.map(record => {
        const isPresent = record.status === 'Present';
        const iconBg = isPresent ? '#ecfdf5' : '#fef2f2';
        const iconColor = isPresent ? '#10b981' : '#ef4444';
        const iconSvg = isPresent
            ? `<div style="background: ${iconBg}; color: ${iconColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">✓</div>`
            : `<div style="background: ${iconBg}; color: ${iconColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">✕</div>`;

        return `
            <tr>
                <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px;">
                    ${iconSvg}
                    <div>
                        <div style="color: #1e293b; font-weight: 600; font-size: 15px;">${record.subjectName}</div>
                        <div style="color: #64748b; font-size: 13px; margin-top: 4px;">${record.slotTime || 'Scheduled Slot'}</div>
                    </div>
                </td>
                <td style="padding: 16px; border-bottom: 1px solid #f1f5f9; text-align: right;">
                    <span style="background: ${iconBg}; color: ${iconColor}; padding: 6px 12px; border-radius: 99px; font-size: 13px; font-weight: 700; display: inline-block;">
                        ${record.status.toUpperCase()}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 40px 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
                
                <!-- Premium Header -->
                <div style="background: #0f172a; padding: 40px 32px; text-align: center; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%); pointer-events: none;"></div>
                    <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.1); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">📅</span>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Daily Attendance Update</h1>
                    <p style="margin: 8px 0 0; color: #94a3b8; font-size: 15px;">Report for ${dateString}</p>
                </div>

                <div style="padding: 40px 32px;">
                    <p style="margin: 0 0 24px; font-size: 16px; color: #475569; line-height: 1.6;">
                        Dear Parent/Guardian,<br><br>
                        Here is the attendance summary for your ward, <strong style="color: #0f172a;">${studentInfo.name}</strong> (ID: ${studentInfo.regNo}).
                    </p>

                    <!-- Beautiful Stats Row -->
                    <div style="display: flex; gap: 16px; margin-bottom: 32px;">
                        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
                            <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Overall Status</div>
                            <div style="color: ${percentageColor}; font-size: 20px; font-weight: 700; margin-top: 8px;">${statusText}</div>
                        </div>
                        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;">
                            <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Classes Attended</div>
                            <div style="color: #0f172a; font-size: 24px; font-weight: 800; margin-top: 4px;">${classesAttended}<span style="color:#94a3b8; font-size:16px;">/${totalClasses}</span></div>
                        </div>
                    </div>

                    <!-- Clean Table Layout -->
                    <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a; font-weight: 600;">Today's Classes</h2>
                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e2e8f0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td>
                                    <div style="font-weight: 600; color: #0f172a; font-size: 15px;">VoxLog Administration</div>
                                    <div style="color: #64748b; font-size: 14px; margin-top: 4px;">Automated Tracking System</div>
                                </td>
                            </tr>
                        </table>
                    </div>

                </div>
            </div>
            
            <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px;">
                This is an automated system notification. Please do not reply directly to this email.<br>
                For any queries, contact the academic department.
            </div>

        </body>
        </html>
    `;

    return await sendEmailNotification(parentEmail, subject, htmlBody);
};

