const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await Wallet.create({
      user: userId,
      balance: 0,
      transactions: []
    });
  }

  return wallet;
}

async function getBalance(userId) {
  const wallet = await getOrCreateWallet(userId);

  return {
    walletId: wallet._id,
    balance: wallet.balance,
    currency: 'ARS'
  };
}

async function creditWallet({
  userId,
  amount,
  type = 'sale',
  description = '',
  orderId = null,
  idempotencyKey
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Importe inválido');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey }).session(session);

      if (existing) {
        await session.commitTransaction();
        return existing;
      }
    }

    const wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $inc: { balance: amount }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session
      }
    );

    const transaction = await Transaction.create(
      [
        {
          toUser: userId,
          toWallet: wallet._id,
          type,
          amount,
          commission: 0,
          currency: 'ARS',
          status: 'completed',
          provider: 'internal',
          order: orderId,
          idempotencyKey,
          description
        }
      ],
      { session }
    );

    wallet.transactions.push(transaction[0]._id);
    await wallet.save({ session });

    await session.commitTransaction();

    return transaction[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = {
  getOrCreateWallet,
  getBalance,
  creditWallet
};
