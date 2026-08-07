const mercadopago = require('mercadopago');

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (accessToken) {
  mercadopago.configure({
    access_token: accessToken
  });
  console.log('MercadoPago configurado');
} else {
  console.log('MercadoPago no configurado (sin access_token)');
}

const createPaymentPreference = async (title, description, amount, quantity = 1) => {
  try {
    if (!accessToken) {
      console.log('MercadoPago: Sin credenciales, simulando preferencia');
      return {
        success: true,
        preferenceId: 'demo-preference-123',
        initPoint: 'https://www.mercadopago.com/demo'
      };
    }

    const preference = {
      items: [{
        title: title,
        description: description,
        quantity: quantity,
        unit_price: parseFloat(amount)
      }]
    };

    const response = await mercadopago.preferences.create(preference);
    
    return {
      success: true,
      preferenceId: response.body.id,
      initPoint: response.body.init_point
    };
  } catch (error) {
    console.error('Error MercadoPago:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const getPaymentInfo = async (paymentId) => {
  try {
    if (!accessToken) {
      return {
        success: true,
        status: 'approved'
      };
    }

    const response = await mercadopago.payment.get(paymentId);
    return {
      success: true,
      status: response.body.status
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
  getPaymentInfo
};
