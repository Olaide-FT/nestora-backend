const sendMail = require("../services/nodemailer");

const sendInquiryEmail = async (property, buyer, message) => {

    try {
        await sendMail({
            to: property.owner.email,
            subject:
                "New Property Inquiry - PropertyHub",
            html: `
                    <h2>New Property Inquiry</h2>

                    <p>Hello ${property.owner.firstName
                },</p>

                    <p>
                        Someone is interested in your property:
                    </p>

                    <h3>
                        ${property.title}
                    </h3>

                    <p>
                        <strong>Message:</strong>
                    </p>

                    <p>
                        ${message}
                    </p>

                    <p>
                        <strong>Buyer:</strong>
                        ${buyer.firstName}
                        ${buyer.lastName}
                    </p>

                    <p>
                        <strong>Email:</strong>
                        ${buyer.email}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${buyer.phone}
                    </p>
                `,
        });
    } catch (emailError) {
        console.error(
            "Inquiry email failed:",
            emailError)
    }
}

module.exports = sendInquiryEmail  