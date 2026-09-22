const nodemailer = require("nodemailer");

/**
 * Configure Nodemailer transporter based on environment variables
 */
const getTransporter = () => {
    const user = String(process.env.EMAIL_USER || "").trim();
    const pass = String(process.env.EMAIL_PASS || "").replace(/\s+/g, "");

    if (!user || !pass) {
        return null;
    }

    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.EMAIL_PORT) || 587;

    return nodemailer.createTransport({
        service: host.toLowerCase().includes("gmail") ? "gmail" : undefined,
        host: !host.toLowerCase().includes("gmail") ? host : undefined,
        port: port,
        secure: port === 465,
        auth: { user, pass }
    });
};

/**
 * Send 6-digit OTP code to the student's email
 * @param {string} email - Destination email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} studentName - Name of student
 */
const sendOtpEmail = async (email, otp, studentName = "Student") => {
    const transporter = getTransporter();

    // If SMTP is not configured, fallback to console log & return mock response
    if (!transporter) {
        console.log("==================================================================");
        console.log(`[CAMPUSCARE OTP DISPATCH]`);
        console.log(`Target Email: ${email}`);
        console.log(`Student Name: ${studentName}`);
        console.log(`Verification OTP: >>> ${otp} <<<`);
        console.log(`Status: Valid for 10 minutes`);
        console.log(`Note: Configure EMAIL_USER and EMAIL_PASS in .env for real email delivery.`);
        console.log("==================================================================");

        return {
            success: true,
            mode: "mock",
            devOtp: process.env.NODE_ENV !== "production" ? otp : undefined
        };
    }

    const senderEmail = process.env.EMAIL_USER;
    const appName = "CampusCare";

    const mailOptions = {
        from: `"${appName} Security" <${senderEmail}>`,
        to: email,
        subject: `${otp} is your ${appName} Verification Code`,
        text: `Hello ${studentName},\n\nYour ${appName} password reset verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`,
        html: `
            <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${appName}</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Campus Management & Complaint Portal</p>
                </div>
                
                <div style="padding: 30px 24px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">Password Reset Verification</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                        Hello <strong>${studentName}</strong>,<br>
                        We received a request to reset your password. Use the single-use verification code below to complete the reset process:
                    </p>

                    <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; font-family: monospace;">${otp}</span>
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500;">Valid for 10 minutes</p>
                    </div>

                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                        If you did not request a password reset, you can safely disregard this email. Your password will remain unchanged.
                    </p>

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

                    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                        CampusCare Automated Notification System &bull; Please do not reply to this email
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            mode: "smtp",
            messageId: info.messageId
        };
    } catch (error) {
        console.error("Nodemailer SMTP Error:", error.message);
        // Fallback to console log on SMTP failure
        console.log(`[FALLBACK OTP] Target: ${email}, OTP: ${otp}`);
        return {
            success: true,
            mode: "fallback",
            devOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
            error: error.message
        };
    }
};

module.exports = {
    sendOtpEmail
};
