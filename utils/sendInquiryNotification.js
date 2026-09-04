const sendMail = require("../services/nodemailer");

const sendInquiryEmail = async (property, buyer, message) => {

    try {
        await sendMail({
            to: property.owner.email,
            subject:
                "New Property Inquiry - Nestora",
            text: `Hello ${property.owner.firstName}, ${buyer.firstName} ${buyer.lastName} is interested in ${property.title}. Message: ${message}`,
            html: `
                    <div style="margin:0;padding:32px 16px;background:#f7f5f0;font-family:Arial,sans-serif;color:#17352b;">
                      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e1d8;">
                        <div style="padding:24px 32px;background:#17352b;color:#ffffff;font-size:24px;font-weight:700;">Nestora</div>
                        <div style="padding:32px;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c9a45c;">New inquiry</div>
                          <h1 style="margin:12px 0 16px;font-size:28px;color:#17352b;">Someone is interested</h1>
                          <p style="font-size:15px;line-height:1.6;color:#63736c;">Hello ${property.owner.firstName}, a buyer has contacted you about your property.</p>
                          <div style="margin:24px 0;padding:18px;background:#f7f5f0;border-left:4px solid #c9a45c;border-radius:6px;">
                            <div style="font-size:18px;font-weight:700;color:#17352b;">${property.title}</div>
                          </div>
                          <p style="margin:18px 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8a9790;">Message</p>
                          <p style="margin:0;padding:16px;background:#fafaf8;border-radius:6px;font-size:15px;line-height:1.6;color:#17352b;">${message}</p>
                          <p style="margin:24px 0 6px;font-size:13px;color:#63736c;"><strong>Buyer:</strong> ${buyer.firstName} ${buyer.lastName}</p>
                          <p style="margin:6px 0;font-size:13px;color:#63736c;"><strong>Email:</strong> ${buyer.email}</p>
                          <p style="margin:6px 0;font-size:13px;color:#63736c;"><strong>Phone:</strong> ${buyer.phone}</p>
                        </div>
                        <div style="padding:18px 32px;border-top:1px solid #e5e1d8;font-size:12px;color:#8a9790;">© ${new Date().getFullYear()} Nestora</div>
                      </div>
                    </div>
                `,
        });
    } catch (emailError) {
        console.error(
            "Inquiry email failed:",
            emailError)
    }
}

module.exports = sendInquiryEmail  