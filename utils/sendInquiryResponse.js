const sendMail = require("../services/nodemailer");

const sendInquiryResponseEmail = async (inquiry, response) => {

    try {
        await sendMail({
            to: inquiry.buyer.email,

            subject:
                "Property Owner Responded - Nestora",

            html: `
                    <h2>Property Owner Responded</h2>

                    <p>
                        The owner has responded to your inquiry.
                    </p>

                    <p>
                        <strong>Property:</strong>
                        ${inquiry.property.title}
                    </p>

                    <p>
                        <strong>Response:</strong>
                    </p>

                    <p>
                        ${response}
                    </p>
                `,
        });
    } catch (emailError) {
        console.error(
            "Response email failed:",
            emailError
        );
    }
};

module.exports = sendInquiryResponseEmail;
