import PDFDocument from 'pdfkit';
import { Response } from 'express';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface RKTInvoiceData {
  companyName: string;
  companyAddress: string;
  companyPan: string;
  invoiceNo: string;
  date: Date;
  customerName: string;
  customerAddress?: string;
  customerPan?: string;
  paymentMethod?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

/**
 * Convert number to words in English (for Nepali invoice "In Words" field)
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paisa = Math.round((num - rupees) * 100);

  let result = convert(rupees) + ' Rupees';
  if (paisa > 0) result += ' and ' + convert(paisa) + ' Paisa';
  result += ' Only';
  return result;
}

/**
 * Generate Tax Invoice PDF in Nepali format for RKT Tradings.
 * Matches the physical invoice book format with:
 * - Seller info + PAN at top
 * - Buyer name, address, PAN
 * - Item table with S.N., Description, Qty, Rate, Total
 * - Amount in words
 * - Subtotal, Discount, Taxable Amount, 13% VAT, Grand Total
 * - Payment method
 * - Signature line
 */
export function generateRKTInvoicePDF(data: RKTInvoiceData, res: Response): void {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=tax-invoice-${data.invoiceNo}.pdf`);
  doc.pipe(res);

  const pageWidth = doc.page.width - 80; // 40 margin each side
  const leftX = 40;
  const rightX = doc.page.width - 40;

  // ─── Header: Company Info ──────────────────────────────────────────────────
  doc
    .fillColor('#1a1a1a')
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(data.companyName, leftX, 40, { align: 'center', width: pageWidth });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#444444')
    .text(data.companyAddress, leftX, 62, { align: 'center', width: pageWidth });

  // TAX INVOICE title
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('TAX INVOICE', leftX, 82, { align: 'center', width: pageWidth });

  // Horizontal line
  doc.moveTo(leftX, 100).lineTo(rightX, 100).strokeColor('#000000').lineWidth(1).stroke();

  // ─── Invoice Meta (left + right columns) ───────────────────────────────────
  let y = 110;

  // Left column
  doc.fontSize(9).font('Helvetica').fillColor('#000000');
  doc.text(`Invoice No: ${data.invoiceNo}`, leftX, y);
  doc.font('Helvetica-Bold').text(`Seller's PAN: ${data.companyPan}`, leftX, y + 14);

  // Right column
  doc.font('Helvetica');
  doc.text(`Date: ${new Date(data.date).toLocaleDateString('en-GB')}`, 380, y);

  // Payment method
  const methodLabel =
    data.paymentMethod === 'CASH' ? 'Cash' :
    data.paymentMethod === 'CHEQUE' ? 'Cheque' :
    data.paymentMethod === 'PHONEPAY' ? 'PhonePay' :
    data.paymentMethod === 'ESEWA' ? 'eSewa' : 'Cash';
  doc.text(`Payment: ${methodLabel}`, 380, y + 14);

  // ─── Customer Info ─────────────────────────────────────────────────────────
  y = 145;
  doc.moveTo(leftX, y).lineTo(rightX, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
  y += 8;

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Buyer\'s Name:', leftX, y);
  doc.font('Helvetica').text(data.customerName || 'Walk-in Customer', leftX + 80, y);

  y += 14;
  doc.font('Helvetica-Bold').text('Address:', leftX, y);
  doc.font('Helvetica').text(data.customerAddress || '-', leftX + 80, y);

  y += 14;
  doc.font('Helvetica-Bold').text('Buyer\'s PAN:', leftX, y);
  doc.font('Helvetica').text(data.customerPan || '-', leftX + 80, y);

  // ─── Items Table ───────────────────────────────────────────────────────────
  y += 22;
  doc.moveTo(leftX, y).lineTo(rightX, y).strokeColor('#000000').lineWidth(1).stroke();

  // Table header
  y += 4;
  const colSN = leftX + 5;
  const colDesc = leftX + 40;
  const colQty = 320;
  const colUnit = 360;
  const colRate = 410;
  const colTotal = 480;

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
  doc.text('S.N.', colSN, y);
  doc.text('Description', colDesc, y);
  doc.text('Qty', colQty, y);
  doc.text('Unit', colUnit, y);
  doc.text('Rate', colRate, y);
  doc.text('Total', colTotal, y);

  y += 14;
  doc.moveTo(leftX, y).lineTo(rightX, y).strokeColor('#000000').lineWidth(0.5).stroke();

  // Table rows
  doc.font('Helvetica').fontSize(9);
  data.items.forEach((item, index) => {
    y += 6;
    doc.text(String(index + 1), colSN, y);
    doc.text(item.name, colDesc, y, { width: 170 });
    doc.text(String(item.quantity), colQty, y);
    doc.text(item.unit || 'pcs', colUnit, y);
    doc.text(item.unitPrice.toFixed(2), colRate, y);
    doc.text(item.total.toFixed(2), colTotal, y);
    y += 16;
  });

  // Bottom line of table
  y += 4;
  doc.moveTo(leftX, y).lineTo(rightX, y).strokeColor('#000000').lineWidth(1).stroke();

  // ─── Amount in Words ───────────────────────────────────────────────────────
  y += 10;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('In Words:', leftX, y);
  doc.font('Helvetica').fontSize(8);
  doc.text(numberToWords(data.total), leftX + 60, y, { width: 280 });

  // ─── Totals (right side) ───────────────────────────────────────────────────
  const totalsX = 370;
  const totalsValX = 480;
  let ty = y - 4;

  doc.font('Helvetica').fontSize(9).fillColor('#000000');

  doc.text('Subtotal:', totalsX, ty);
  doc.text(`Rs. ${data.subtotal.toFixed(2)}`, totalsValX, ty);

  ty += 14;
  doc.text('Discount:', totalsX, ty);
  doc.text(`Rs. ${data.discount.toFixed(2)}`, totalsValX, ty);

  ty += 14;
  doc.text('Taxable Amount:', totalsX, ty);
  doc.text(`Rs. ${data.taxableAmount.toFixed(2)}`, totalsValX, ty);

  ty += 14;
  doc.text(`${data.taxRate}% VAT:`, totalsX, ty);
  doc.text(`Rs. ${data.taxAmount.toFixed(2)}`, totalsValX, ty);

  ty += 16;
  doc.moveTo(totalsX, ty).lineTo(rightX, ty).strokeColor('#000000').lineWidth(1).stroke();
  ty += 4;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('TOTAL:', totalsX, ty);
  doc.text(`Rs. ${data.total.toFixed(2)}`, totalsValX, ty);

  // ─── Footer ────────────────────────────────────────────────────────────────
  const footerY = Math.max(ty + 50, 680);

  doc.moveTo(leftX, footerY).lineTo(rightX, footerY).strokeColor('#cccccc').lineWidth(0.5).stroke();

  doc.font('Helvetica').fontSize(8).fillColor('#666666');
  doc.text('Note: Goods once sold will not be taken back.', leftX, footerY + 8);

  // Signature lines
  doc.moveTo(leftX, footerY + 40).lineTo(leftX + 150, footerY + 40).strokeColor('#000000').lineWidth(0.5).stroke();
  doc.moveTo(rightX - 150, footerY + 40).lineTo(rightX, footerY + 40).strokeColor('#000000').lineWidth(0.5).stroke();

  doc.fontSize(8).fillColor('#000000');
  doc.text('Buyer\'s Signature', leftX, footerY + 44);
  doc.text(`For: ${data.companyName}`, rightX - 150, footerY + 44);

  doc.end();
}
