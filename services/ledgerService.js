const mongoose = require('mongoose');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

async function transfer({
  fromUserId,
  toUserId,
  amount,
  type = 'transfer',
  description = '',
  orderId = null,
  idempotencyKey
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Importe inválido');
  }

  if (fromUserId.toString() === toUserId.toString()) {
    throw new Error('No se permite transferir a la misma billetera');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (idempotencyKey) {
      const existing = await Transaction.findOne({
        idempotencyKey
      }).session(session);

      if (existing) {
        await session.commitTransaction();
        return existing;
      }
    }

    const sender = await Wallet.findOneAndUpdate(
      {
        user: fromUserId,
        balance: { $gte: amount }
      },
      {
        $inc: { balance: -amount }
      },
      {
        new: true,
        session
      }
    );

    if (!sender) {
      throw new Error('Saldo insuficiente');
    }

    const receiver = await Wallet.findOneAndUpdate(
      { user: toUserId },
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
          fromUser: fromUserId,
          toUser: toUserId,
          fromWallet: sender._id,
          toWallet: receiver._id,
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

    sender.transactions.push(transaction[0]._id);
    receiver.transactions.push(transaction[0]._id);

    await sender.save({ session });
    await receiver.save({ session });

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
  transfer
};
