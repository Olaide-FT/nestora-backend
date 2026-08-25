const nodemailer = require("nodemailer");
const dotenv = require("dotenv")

dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",    
    port: 587,                 
    secure: false,             
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
    },
});



async function sendMail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_NAME || 'Reedah'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send failed:", error);
    return { success: false, error: error.message };
  }
}


module.exports = sendMail