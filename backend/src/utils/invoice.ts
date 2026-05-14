import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
}

interface InvoiceData {
  invoiceNo: string;
  date: Date;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  cashierName: string;
  paymentMethod?: string;
  paymentStatus?: string;
  amountPaid?: number;
  changeAmount?: number;
  referenceNo?: string;
  bankName?: string;
  accountName?: string;
}

export function generateInvoicePDF(data: InvoiceData, res: Response): void {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=invoice-${data.invoiceNo}.pdf`
  );

  doc.pipe(res);

  // Header
  doc
    .fillColor('#1e40af')
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('STOCK MANAGER', 50, 50);

  doc
    .fillColor('#6b7280')
    .fontSize(10)
    .font('Helvetica')
    .text('Stock Management System', 50, 85);

  // Invoice title
  doc
    .fillColor('#111827')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('INVOICE', 400, 50, { align: 'right' });

  doc
    .fillColor('#6b7280')
    .fontSize(10)
    .font('Helvetica')
    .text(`Invoice No: ${data.invoiceNo}`, 400, 80, { align: 'right' })
    .text(`Date: ${new Date(data.date).toLocaleDateString()}`, 400, 95, { align: 'right' });

  // Divider
  doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#e5e7eb').stroke();

  // Customer info
  doc
    .fillColor('#374151')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Bill To:', 50, 135);

  doc
    .fillColor('#6b7280')
    .fontSize(10)
    .font('Helvetica')
    .text(data.customerName || 'Walk-in Customer', 50, 152)
    .text(data.customerPhone || '', 50, 167);

  doc
    .fillColor('#374151')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('Cashier:', 350, 135);

  doc
    .fillColor('#6b7280')
    .fontSize(10)
    .font('Helvetica')
    .text(data.cashierName, 350, 152);

  // Table header
  const tableTop = 210;
  doc
    .fillColor('#1e40af')
    .rect(50, tableTop, 495, 25)
    .fill();

  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('#', 60, tableTop + 8)
    .text('Product', 80, tableTop + 8)
    .text('Qty', 300, tableTop + 8)
    .text('Unit Price', 340, tableTop + 8)
    .text('Tax%', 410, tableTop + 8)
    .text('Total', 460, tableTop + 8);

  // Table rows
  let y = tableTop + 35;
  data.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.fillColor('#f9fafb').rect(50, y - 5, 495, 22).fill();
    }

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica')
      .text(String(index + 1), 60, y)
      .text(item.name, 80, y, { width: 210 })
      .text(String(item.quantity), 300, y)
      .text(`$${item.unitPrice.toFixed(2)}`, 340, y)
      .text(`${item.taxRate}%`, 410, y)
      .text(`$${item.total.toFixed(2)}`, 460, y);

    y += 22;
  });

  // Totals
  y += 15;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
  y += 15;

  const totalsX = 380;
  doc
    .fillColor('#374151')
    .fontSize(10)
    .font('Helvetica')
    .text('Subtotal:', totalsX, y)
    .text(`$${data.subtotal.toFixed(2)}`, 480, y, { align: 'right', width: 65 });

  y += 18;
  doc
    .text('Tax:', totalsX, y)
    .text(`$${data.taxAmount.toFixed(2)}`, 480, y, { align: 'right', width: 65 });

  if (data.discount > 0) {
    y += 18;
    doc
      .fillColor('#dc2626')
      .text('Discount:', totalsX, y)
      .text(`-$${data.discount.toFixed(2)}`, 480, y, { align: 'right', width: 65 });
  }

  y += 18;
  doc
    .fillColor('#1e40af')
    .rect(370, y - 5, 175, 28)
    .fill();

  doc
    .fillColor('#ffffff')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TOTAL:', totalsX, y + 3)
    .text(`$${data.total.toFixed(2)}`, 480, y + 3, { align: 'right', width: 65 });

  // Payment info
  if (data.paymentMethod) {
    y += 40;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    y += 12;

    const methodLabel =
      data.paymentMethod === 'PHONEPAY' ? 'PhonePay' :
      data.paymentMethod === 'ESEWA'    ? 'eSewa' :
      data.paymentMethod === 'CHEQUE'   ? 'Cheque' :
      data.paymentMethod === 'CASH'     ? 'Cash' :
      data.paymentMethod || 'Cash';
    const statusLabel = data.paymentStatus
      ? data.paymentStatus.charAt(0) + data.paymentStatus.slice(1).toLowerCase()
      : 'Paid';

    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Payment Details', 50, y);

    y += 14;
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280');
    doc.text(`Method: ${methodLabel}`, 50, y);
    doc.text(`Status: ${statusLabel}`, 200, y);

    if (data.amountPaid !== undefined) {
      doc.text(`Amount Paid: $${data.amountPaid.toFixed(2)}`, 350, y);
    }

    if (data.changeAmount && data.changeAmount > 0) {
      y += 14;
      doc.text(`Change: $${data.changeAmount.toFixed(2)}`, 50, y);
    }

    if (data.referenceNo) {
      y += 14;
      doc.text(`Reference No: ${data.referenceNo}`, 50, y);
    }

    if (data.bankName) {
      y += 14;
      doc.text(`Bank: ${data.bankName}`, 50, y);
    }

    if (data.accountName) {
      y += 14;
      doc.text(`Account Name: ${data.accountName}`, 50, y);
    }
  }

  // Footer
  doc
    .fillColor('#9ca3af')
    .fontSize(9)
    .font('Helvetica')
    .text('Thank you for your business!', 50, 720, { align: 'center', width: 495 })
    .text('Generated by Stock Management System', 50, 735, { align: 'center', width: 495 });

  doc.end();
}
