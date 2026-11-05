import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Business } from '../types/index.ts';
import { numberToIndianWords, formatDate } from './currency.ts';

export function generateInvoicePDF(invoice: Invoice, business: Business): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Colors
  const primaryNavy: [number, number, number] = [15, 23, 42]; // #0f172a
  const accentBlue: [number, number, number] = [37, 99, 235]; // #2563eb
  const textDark: [number, number, number] = [30, 41, 59]; // #1e293b
  const textMuted: [number, number, number] = [100, 116, 139]; // #64748b
  const borderColor: [number, number, number] = [226, 232, 240]; // #e2e8f0

  // 1. Header Banner & Title
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(margin, margin, pageWidth - margin * 2, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TAX INVOICE', pageWidth / 2, margin + 5.5, { align: 'center' });

  // 2. Business Details (Left) and Invoice Meta (Right)
  let y = margin + 14;

  // Business Name
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(business.name, margin, y);

  // Invoice Number (Right aligned)
  doc.setFontSize(13);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.text(invoice.invoiceNumber, pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  // Business address & GSTIN
  doc.text(business.address, margin, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, pageWidth - margin, y, { align: 'right' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${business.city}, ${business.state} - ${business.pinCode}`, margin, y);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, pageWidth - margin, y, { align: 'right' });

  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${business.gstin}`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`State & Code: ${business.state} (${business.stateCode || '29'})`, pageWidth - margin, y, { align: 'right' });

  y += 4.5;
  doc.text(`Phone: ${business.phone}  |  Email: ${business.email}`, margin, y);
  doc.text(`Place of Supply: ${invoice.customerState}`, pageWidth - margin, y, { align: 'right' });

  // Divider
  y += 6;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // 3. Bill To / Customer Details Box
  y += 5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'F');
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('BILLED TO (RECEIVER DETAILS):', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(invoice.customerBusinessName || invoice.customerName, margin + 4, y + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Attn: ${invoice.customerName}  |  Phone: ${invoice.customerPhone || '-'}`, margin + 4, y + 15);
  doc.text(`${invoice.customerAddress}, ${invoice.customerCity}, ${invoice.customerState} - ${invoice.customerPinCode}`, margin + 4, y + 19.5);

  // Customer GSTIN on Right inside box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`GSTIN: ${invoice.customerGstin || 'URP (Unregistered Person)'}`, pageWidth - margin - 4, y + 10.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer State: ${invoice.customerState}`, pageWidth - margin - 4, y + 15, { align: 'right' });
  doc.text(`Nature of Supply: ${invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}`, pageWidth - margin - 4, y + 19.5, { align: 'right' });

  y += 28;

  // 4. Items Table
  const isInter = invoice.isInterState;

  // Table headers based on tax type
  const tableHeaders = isInter
    ? ['#', 'Item & Description', 'HSN', 'Qty', 'Rate', 'Disc', 'Taxable', 'IGST', 'Total']
    : ['#', 'Item & Description', 'HSN', 'Qty', 'Rate', 'Disc', 'Taxable', 'CGST', 'SGST', 'Total'];

  const tableRows = invoice.items.map((item, idx) => {
    if (isInter) {
      return [
        idx + 1,
        item.productName,
        item.hsnCode || '-',
        `${item.quantity} ${item.unit}`,
        item.unitPrice.toFixed(2),
        item.discountAmount > 0 ? item.discountAmount.toFixed(2) : '-',
        item.taxableAmount.toFixed(2),
        `${item.igstAmount.toFixed(2)} (${item.igstRate}%)`,
        item.totalAmount.toFixed(2)
      ];
    } else {
      return [
        idx + 1,
        item.productName,
        item.hsnCode || '-',
        `${item.quantity} ${item.unit}`,
        item.unitPrice.toFixed(2),
        item.discountAmount > 0 ? item.discountAmount.toFixed(2) : '-',
        item.taxableAmount.toFixed(2),
        `${item.cgstAmount.toFixed(2)} (${item.cgstRate}%)`,
        `${item.sgstAmount.toFixed(2)} (${item.sgstRate}%)`,
        item.totalAmount.toFixed(2)
      ];
    }
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textDark,
      cellPadding: 2.5
    },
    columnStyles: isInter
      ? {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 55 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 16, halign: 'right' },
          4: { cellWidth: 18, halign: 'right' },
          5: { cellWidth: 14, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 20, halign: 'right' },
          8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
        }
      : {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 48 },
          2: { cellWidth: 13, halign: 'center' },
          3: { cellWidth: 15, halign: 'right' },
          4: { cellWidth: 16, halign: 'right' },
          5: { cellWidth: 13, halign: 'right' },
          6: { cellWidth: 18, halign: 'right' },
          7: { cellWidth: 18, halign: 'right' },
          8: { cellWidth: 18, halign: 'right' },
          9: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }
        }
  });

  // Calculate table end Y
  const finalY = (doc as any).lastAutoTable.finalY || y + 60;
  let summaryY = finalY + 4;

  // 5. Amount in Words & Bank Details (Left Column)
  const leftColWidth = 105;
  const rightColX = pageWidth - margin - 70;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('TOTAL AMOUNT IN WORDS:', margin, summaryY);

  summaryY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  
  const words = numberToIndianWords(invoice.grandTotal);
  const splitWords = doc.splitTextToSize(words, leftColWidth);
  doc.text(splitWords, margin, summaryY);

  summaryY += splitWords.length * 4.5 + 4;

  // Bank & Settlement Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, summaryY, leftColWidth, 26, 1.5, 1.5, 'F');
  doc.roundedRect(margin, summaryY, leftColWidth, 26, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('BANK DETAILS FOR NEFT / RTGS / IMPS:', margin + 3, summaryY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Bank Name: ${business.bankDetails.bankName}`, margin + 3, summaryY + 10);
  doc.text(`Account No: ${business.bankDetails.accountNumber}`, margin + 3, summaryY + 14);
  doc.text(`IFSC Code: ${business.bankDetails.ifscCode}  |  Branch: ${business.bankDetails.branchName}`, margin + 3, summaryY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`UPI ID: ${business.upiId}`, margin + 3, summaryY + 22.5);

  // 6. Tax Summary (Right Column)
  let rightY = finalY + 4;
  const rightWidth = 70;

  const summaryRows = [
    { label: 'Subtotal:', value: `INR ${invoice.subtotal.toFixed(2)}` },
    { label: 'Total Discount:', value: `(-) INR ${invoice.discountTotal.toFixed(2)}` },
    { label: 'Taxable Amount:', value: `INR ${invoice.taxableAmount.toFixed(2)}` }
  ];

  if (isInter) {
    summaryRows.push({ label: 'Integrated GST (IGST):', value: `INR ${invoice.igstTotal.toFixed(2)}` });
  } else {
    summaryRows.push({ label: 'Central GST (CGST):', value: `INR ${invoice.cgstTotal.toFixed(2)}` });
    summaryRows.push({ label: 'State GST (SGST):', value: `INR ${invoice.sgstTotal.toFixed(2)}` });
  }

  if (invoice.roundOff !== 0) {
    summaryRows.push({ label: 'Round Off:', value: `INR ${invoice.roundOff.toFixed(2)}` });
  }

  doc.setFontSize(8);
  summaryRows.forEach(row => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(row.label, rightColX, rightY);
    doc.text(row.value, pageWidth - margin, rightY, { align: 'right' });
    rightY += 4.5;
  });

  // Grand Total Line
  doc.setDrawColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setLineWidth(0.5);
  doc.line(rightColX, rightY, pageWidth - margin, rightY);
  rightY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Grand Total:', rightColX, rightY);
  doc.text(`INR ${invoice.grandTotal.toFixed(2)}`, pageWidth - margin, rightY, { align: 'right' });

  // Paid & Balance row
  rightY += 5;
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Paid: INR ${invoice.paidAmount.toFixed(2)}`, rightColX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(invoice.balanceAmount > 0 ? 220 : 22, invoice.balanceAmount > 0 ? 38 : 163, invoice.balanceAmount > 0 ? 38 : 74);
  doc.text(`Balance Due: INR ${invoice.balanceAmount.toFixed(2)}`, pageWidth - margin, rightY, { align: 'right' });

  // 7. Footer: Terms & Authorized Signatory
  const footerY = Math.max(summaryY + 30, rightY + 16);

  // Terms & Conditions (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('TERMS & CONDITIONS:', margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const terms = invoice.termsAndConditions || business.defaultPaymentTerms;
  const splitTerms = doc.splitTextToSize(terms, leftColWidth);
  doc.text(splitTerms, margin, footerY + 4);

  // Authorized Signatory (Right)
  const signX = pageWidth - margin - 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(`For ${business.name}`, signX, footerY + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Authorized Signatory', signX, footerY + 20, { align: 'center' });

  // Page numbering
  doc.setFontSize(7);
  doc.text('This is a computer-generated tax invoice and requires no physical seal.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc;
}

export function downloadInvoicePDF(invoice: Invoice, business: Business) {
  const doc = generateInvoicePDF(invoice, business);
  const cleanNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanNumber}.pdf`);
}
