const mercadopago = require('mercadopago');

// Configurar MercadoPago
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// Crear preferencia de pago
const createPaymentPreference = async (title, description, price, quantity = 1) => {
  try {
    const preference = {
      items: [
        {
          title: title,
          description: description,
          unit_price: parseFloat(price),
          quantity: parseInt(quantity),
          currency_id: 'USD'
        }
      ],
      back_urls: {
        success: `${process.env.BASE_URL || 'https://pase-y-mire.vercel.app'}/payment/success`,
        failure: `${process.env.BASE_URL || 'https://pase-y-mire.vercel.app'}/payment/failure`,
        pending: `${process.env.BASE_URL || 'https://pase-y-mire.vercel.app'}/payment/pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.BASE_URL || 'https://pase-y-mire.vercel.app'}/api/webhooks/mercadopago`,
      metadata: {
        source: 'pym_logistics_provider'
      }
    };

    const response = await mercadopago.preferences.create(preference);
    
    return {
      success: true,
      preferenceId: response.body.id,
      initPoint: response.body.init_point,
      sandboxInitPoint: response.body.sandbox_init_point
    };
  } catch (error) {
    console.error('Error creando preferencia:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Consultar estado de pago
const getPaymentInfo = async (paymentId) => {
  try {
    const payment = await mercadopago.payment.findById(paymentId);
    return {
      success: true,
      status: payment.body.status,
      statusDetail: payment.body.status_detail,
      paymentType: payment.body.payment_type_id,
      dateApproved: payment.body.date_approved
    };
  } catch (error) {
    console.error('Error consultando pago:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  createPaymentPreference,
  getPaymentInfo,
  mercadopago
};
