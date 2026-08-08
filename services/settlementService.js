const Transaction = require('../models/Transaction');

function calculateLogisticsCommission(amount) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Importe inválido');
  }

  return Number((amount * 0.015).toFixed(2));
}

function calculateLogisticsSettlement(amount) {
  const commission = calculateLogisticsCommission(amount);
  const providerAmount = Number((amount - commission).toFixed(2));

  return {
    grossAmount: amount,
    commission,
    commissionRate: 0.015,
    providerAmount
  };
}

async function createLogisticsCommissionTransaction({
  customerId,
  providerId,
  serviceRequestId,
  amount,
  idempotencyKey
}) {
  const settlement = calculateLogisticsSettlement(amount);

  return Transaction.create({
    fromUser: customerId,
    toUser: null,
    type: 'commission',
    amount: settlement.commission,
    commission: settlement.commission,
    currency: 'ARS',
    status: 'pending',
    provider: 'internal',
    serviceRequest: serviceRequestId,
    idempotencyKey,
    description: 'Comisión logística Pase y Mire 1,5%',
    metadata: {
      providerId,
      grossAmount: settlement.grossAmount,
      providerAmount: settlement.providerAmount,
      commissionRate: settlement.commissionRate
    }
  });
}

module.exports = {
  calculateLogisticsCommission,
  calculateLogisticsSettlement,
  createLogisticsCommissionTransaction
};
