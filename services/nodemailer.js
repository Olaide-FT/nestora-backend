const dotenv = require("dotenv");

dotenv.config();

async function sendMail({ to, subject, text, html }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.EMAIL_FROM,
          ...(process.env.EMAIL_NAME && { name: process.env.EMAIL_NAME }),
        },
        to: (Array.isArray(to) ? to : [to]).map((email) => ({ email })),
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Brevo error:", result);
      throw new Error(result.message || "Brevo email request failed.");
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Email send failed:", error);
    throw error;
  }
}


module.exports = sendMail;