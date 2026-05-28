import { Request, Response, NextFunction } from 'express';
import { db } from '../utils/request';
import { createError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const getPaymentBySale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const payment = await prisma.payment.findUnique({
      where: { saleId: req.params.saleId },
    });
    if (!payment) return next(createError('Payment not found', 404));
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
};

export const updatePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const { method, amountPaid, referenceNo, bankName, accountName, notes, status } = req.body;

    const payment = await prisma.payment.findUnique({ where: { saleId: req.params.saleId } });
    if (!payment) return next(createError('Payment not found', 404));

    const sale = await prisma.sale.findUnique({ where: { id: req.params.saleId } });
    if (!sale) return next(createError('Sale not found', 404));

    const paid = Number(amountPaid ?? payment.amountPaid);
    const change = Math.max(0, paid - Number(sale.total));

    const updated = await prisma.payment.update({
      where: { saleId: req.params.saleId },
      data: {
        ...(method && { method }),
        ...(status && { status }),
        amountPaid: paid,
        changeAmount: change,
        ...(referenceNo !== undefined && { referenceNo }),
        ...(bankName !== undefined && { bankName }),
        ...(accountName !== undefined && { accountName }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const getPaymentSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const prisma = db(req);
    const [cashTotal, chequeTotal, phonepayTotal, esewaTotal, breakdown] = await Promise.all([
      prisma.payment.aggregate({
        where: { method: 'CASH', status: 'PAID' },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { method: 'CHEQUE', status: 'PAID' },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { method: 'PHONEPAY', status: 'PAID' },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { method: 'ESEWA', status: 'PAID' },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['method'],
        _count: true,
        _sum: { amountPaid: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        cash:     { total: Number(cashTotal._sum.amountPaid || 0),     count: cashTotal._count },
        cheque:   { total: Number(chequeTotal._sum.amountPaid || 0),   count: chequeTotal._count },
        phonepay: { total: Number(phonepayTotal._sum.amountPaid || 0), count: phonepayTotal._count },
        esewa:    { total: Number(esewaTotal._sum.amountPaid || 0),    count: esewaTotal._count },
        breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
};
