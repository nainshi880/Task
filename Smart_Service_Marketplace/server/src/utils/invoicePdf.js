import PDFDocument from "pdfkit";

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toFixed(2)}`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Builds a tax invoice PDF buffer from an Invoice document (plain object).
 */
export function buildInvoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Invoice ${invoice.invoiceNumber}`,
        Author: invoice.seller?.name || "Smart Service Marketplace",
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const seller = invoice.seller || {};
    const billTo = invoice.billTo || {};
    const service = invoice.serviceDetails || {};

    // Header
    doc
      .fontSize(20)
      .fillColor("#111827")
      .text(seller.name || "Smart Service Marketplace", { align: "left" });

    doc
      .fontSize(10)
      .fillColor("#4B5563")
      .text("TAX INVOICE", { align: "right" });

    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#6B7280");

    if (seller.gstin) doc.text(`GSTIN: ${seller.gstin}`);
    if (seller.address) doc.text(seller.address);
    const sellerCityLine = [seller.city, seller.state, seller.postalCode]
      .filter(Boolean)
      .join(", ");
    if (sellerCityLine) doc.text(sellerCityLine);
    if (seller.email) doc.text(`Email: ${seller.email}`);
    if (seller.phone) doc.text(`Phone: ${seller.phone}`);

    doc.moveDown();
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#E5E7EB")
      .stroke();
    doc.moveDown();

    // Invoice meta
    doc.fontSize(11).fillColor("#111827").text("Invoice Details");
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#374151");
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
    doc.text(`Invoice Date: ${formatDate(invoice.issuedAt)}`);
    doc.text(`Status: ${invoice.status}`);
    if (invoice.paymentStatus) {
      doc.text(`Payment Status: ${invoice.paymentStatus}`);
    }
    if (invoice.paymentMethod) {
      doc.text(`Payment Method: ${invoice.paymentMethod}`);
    }

    doc.moveDown();

    // Bill To
    doc.fontSize(11).fillColor("#111827").text("Bill To");
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#374151");
    doc.text(billTo.name || "Customer");
    if (billTo.email) doc.text(billTo.email);
    if (billTo.phone) doc.text(billTo.phone);
    if (billTo.address) doc.text(billTo.address);
    const customerCityLine = [billTo.city, billTo.state, billTo.postalCode]
      .filter(Boolean)
      .join(", ");
    if (customerCityLine) doc.text(customerCityLine);

    doc.moveDown();

    // Service line
    doc.fontSize(11).fillColor("#111827").text("Service");
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#374151");
    doc.text(`Service: ${service.serviceName || "-"}`);
    if (service.serviceCategory) {
      doc.text(`Category: ${service.serviceCategory}`);
    }
    if (service.bookingDate) {
      doc.text(
        `Booking Date: ${formatDate(service.bookingDate)}${
          service.bookingTime ? ` at ${service.bookingTime}` : ""
        }`
      );
    }
    if (service.description) {
      doc.text(`Description: ${service.description}`);
    }

    doc.moveDown();

    // Amounts table header
    const tableTop = doc.y;
    doc.fontSize(10).fillColor("#111827");
    doc.text("Description", 50, tableTop);
    doc.text("Amount", 420, tableTop, { width: 125, align: "right" });

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(545, tableTop + 15)
      .strokeColor("#E5E7EB")
      .stroke();

    let y = tableTop + 25;
    doc.fontSize(9).fillColor("#374151");

    const rows = [
      {
        label: "Taxable Value",
        amount: invoice.taxableAmount,
      },
      ...(invoice.taxBreakdown || []).map((line) => ({
        label: `${line.label} (${line.rate}%)`,
        amount: line.amount,
      })),
    ];

    for (const row of rows) {
      doc.text(row.label, 50, y);
      doc.text(formatCurrency(row.amount), 420, y, {
        width: 125,
        align: "right",
      });
      y += 18;
    }

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#E5E7EB")
      .stroke();
    y += 12;

    doc.fontSize(11).fillColor("#111827").font("Helvetica-Bold");
    doc.text("Total Amount", 50, y);
    doc.text(formatCurrency(invoice.totalAmount), 420, y, {
      width: 125,
      align: "right",
    });
    doc.font("Helvetica");

    y += 30;
    doc.fontSize(8).fillColor("#6B7280").text(
      `GST Type: ${
        invoice.gstType === "inter_state"
          ? "Inter-state (IGST)"
          : "Intra-state (CGST + SGST)"
      } | GST Rate: ${invoice.gstRate}%`,
      50,
      y
    );

    if (invoice.notes) {
      y += 20;
      doc.fontSize(9).fillColor("#374151").text(`Notes: ${invoice.notes}`, 50, y);
    }

    doc.fontSize(8).fillColor("#9CA3AF").text(
      "This is a computer-generated invoice and does not require a signature.",
      50,
      760,
      { align: "center" }
    );

    doc.end();
  });
}

export default buildInvoicePdfBuffer;
