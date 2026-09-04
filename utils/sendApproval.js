const sendMail = require("../services/nodemailer");

async function sendApprovalEmail(property) {
    try {
        await sendMail({
            to: property.owner.email,
            subject: "Your Property Has Been Approved",
            text: `Hello ${property.owner.firstName || "Owner"}, your property "${property.title}" has been approved and is now available for buyers.`,
            html: `
                <div style="margin:0;padding:32px 16px;background:#f7f5f0;font-family:Arial,sans-serif;color:#17352b;">
                  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e1d8;">
                    <div style="padding:24px 32px;background:#17352b;color:#ffffff;font-size:24px;font-weight:700;">Nestora</div>
                    <div style="padding:32px;">
                      <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c9a45c;">Listing approved</div>
                      <h1 style="margin:12px 0 16px;font-size:28px;color:#17352b;">Property approved</h1>
                      <p style="font-size:15px;line-height:1.6;color:#63736c;">Hello ${property.owner.firstName || "Owner"}, your property has been approved and is now available for buyers to view.</p>
                      <div style="margin-top:24px;padding:18px;background:#f7f5f0;border-left:4px solid #c9a45c;border-radius:6px;font-size:18px;font-weight:700;">${property.title}</div>
                    </div>
                    <div style="padding:18px 32px;border-top:1px solid #e5e1d8;font-size:12px;color:#8a9790;">© ${new Date().getFullYear()} Nestora</div>
                  </div>
                </div>
            `,
        });
    } catch (emailError) {
        console.error("Approval email failed:", emailError);
    }
}

module.exports = sendApprovalEmail;