import { GST_TYPE, DEFAULT_GST_RATE } from "../constants/invoice.js";

/**
 * Treats `amount` as tax-inclusive total (common for marketplace bookings).
 * Derives taxable value and GST components.
 */
export function calculateGstBreakdown({
  amount,
  gstRate = DEFAULT_GST_RATE,
  customerState = "",
  companyState = "",
}) {
  const totalAmount = Number(Number(amount).toFixed(2));
  const rate = Number(gstRate);

  if (!totalAmount || totalAmount <= 0) {
    return {
      taxableAmount: 0,
      gstRate: rate,
      gstType: GST_TYPE.INTRA_STATE,
      cgstRate: rate / 2,
      sgstRate: rate / 2,
      igstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
      totalAmount: 0,
      taxBreakdown: [],
    };
  }

  const normalizedCustomerState = (customerState || "").trim().toLowerCase();
  const normalizedCompanyState = (companyState || "").trim().toLowerCase();

  const isInterState =
    normalizedCustomerState &&
    normalizedCompanyState &&
    normalizedCustomerState !== normalizedCompanyState;

  const gstType = isInterState
    ? GST_TYPE.INTER_STATE
    : GST_TYPE.INTRA_STATE;

  // amount is GST-inclusive: taxable = amount / (1 + rate/100)
  const taxableAmount = Number(
    (totalAmount / (1 + rate / 100)).toFixed(2)
  );
  const totalTax = Number((totalAmount - taxableAmount).toFixed(2));

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  const taxBreakdown = [];

  if (gstType === GST_TYPE.INTER_STATE) {
    igstRate = rate;
    igstAmount = totalTax;
    taxBreakdown.push({
      label: "IGST",
      rate: igstRate,
      amount: igstAmount,
    });
  } else {
    cgstRate = rate / 2;
    sgstRate = rate / 2;
    cgstAmount = Number((totalTax / 2).toFixed(2));
    sgstAmount = Number((totalTax - cgstAmount).toFixed(2));
    taxBreakdown.push(
      { label: "CGST", rate: cgstRate, amount: cgstAmount },
      { label: "SGST", rate: sgstRate, amount: sgstAmount }
    );
  }

  return {
    taxableAmount,
    gstRate: rate,
    gstType,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalAmount,
    taxBreakdown,
  };
}

export default calculateGstBreakdown;
