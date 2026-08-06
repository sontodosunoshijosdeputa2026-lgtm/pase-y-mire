const sgMail = require('@sendgrid/mail');

// Configurar SendGrid con la API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email de Bienvenida
const sendWelcomeEmail = async (userEmail, userName) => {
  const msg = {
    to: userEmail,
    from: 'noreply@paseymire.com', // Cambiar cuando tengas dominio propio
    subject: '¡Bienvenido a PyM - Pase y Mire! ',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">PyM</h1>
          <p style="color: white; font-style: italic;">El Espacio más Libre</p>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937;">¡Hola ${userName}! 👋</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Gracias por unirte a <strong>Pase y Mire</strong>, la plataforma de intercambio comercial más libre y segura.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Ya podés empezar a explorar el marketplace, publicar tus productos o contratar servicios logísticos verificados.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pase-y-mire.vercel.app" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
              Ir al Marketplace
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Si tenés alguna duda, respondé este email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2026 PyM - Pase y Mire. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email de bienvenida enviado a ${userEmail}`);
    return true;
  } catch (error) {
    console.error(' Error enviando email:', error.response ? error.response.body : error);
    return false;
  }
};

module.exports = { sendWelcomeEmail };
