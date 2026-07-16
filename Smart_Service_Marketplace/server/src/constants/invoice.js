const INVOICE_STATUS = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  CANCELLED: "Cancelled",
};

const GST_TYPE = {
  INTRA_STATE: "intra_state", // CGST + SGST
  INTER_STATE: "inter_state", // IGST
};

const DEFAULT_GST_RATE = 18;

export { INVOICE_STATUS, GST_TYPE, DEFAULT_GST_RATE };
