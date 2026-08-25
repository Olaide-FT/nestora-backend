const sendMail = require("../services/nodemailer");

async function sendApprovalEmail(property) {
    try {
        await sendMail({
            to: property.owner.email,
            subject: "Your Property Has Been Approved",
            html: `
                <h2>Property Approved</h2>
                <p>Hello ${property.owner.firstName || "Owner"},</p>
                <p>
                    Your property <strong>${property.title}</strong> has been approved.
                </p>
                <p>Your property is now available for buyers to view.</p>
            `,
        });
    } catch (emailError) {
        console.error("Approval email failed:", emailError);
    }
}

module.exports = sendApprovalEmail;