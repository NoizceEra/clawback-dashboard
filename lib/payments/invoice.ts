export function generateInvoiceParams() {
  const memo = String(Math.floor(Math.random() * 900000000000) + 100000);
  const now = Math.floor(Date.now() / 1000);

  const startTime = String(now);
  const endTime = String(now + 24 * 60 * 60); // +24h
  const amount = process.env.PRICE_AMOUNT || "1000000"; // 1 USDC default

  return { amount, memo, startTime, endTime };
}
