const sendMail = require("../services/nodemailer");

const sendRejectEmail = async (property, rejectionReason) => {

    try {
        await sendMail({
            to: property.owner.email,

            subject:
                "Property Listing Rejected",
            text: `Hello ${property.owner.firstName}, your property "${property.title}" was not approved. Reason: ${rejectionReason}`,

            html: `
                    <div style="margin:0;padding:32px 16px;background:#f7f5f0;font-family:Arial,sans-serif;color:#17352b;">
                      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e1d8;">
                        <div style="padding:24px 32px;background:#17352b;color:#ffffff;font-size:24px;font-weight:700;">Nestora</div>
                        <div style="padding:32px;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c9a45c;">Listing review</div>
                          <h1 style="margin:12px 0 16px;font-size:28px;color:#17352b;">Property listing rejected</h1>
                          <p style="font-size:15px;line-height:1.6;color:#63736c;">Hello ${property.owner.firstName}, your property was not approved.</p>
                          <div style="margin:24px 0;padding:18px;background:#f7f5f0;border-left:4px solid #c9a45c;border-radius:6px;font-size:18px;font-weight:700;">${property.title}</div>
                          <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a9790;">Reason</p>
                          <p style="margin:0;padding:16px;background:#fafaf8;border-radius:6px;font-size:15px;line-height:1.6;">${rejectionReason}</p>
                          <p style="margin-top:24px;font-size:14px;line-height:1.6;color:#63736c;">Please update your property and submit it again for review.</p>
                        </div>
                        <div style="padding:18px 32px;border-top:1px solid #e5e1d8;font-size:12px;color:#8a9790;">© ${new Date().getFullYear()} Nestora</div>
                      </div>
                    </div>
                `,
        });
    } catch (emailError) {
        console.error("Rejection email failed:", emailError);
    }
}

module.exports = sendRejectEmail;