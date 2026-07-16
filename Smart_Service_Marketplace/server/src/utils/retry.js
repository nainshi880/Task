/**
 * Retry an async operation with exponential backoff.
 */
export async function withRetry(
  fn,
  {
    retries = 3,
    delayMs = 300,
    factor = 2,
    shouldRetry = () => true,
  } = {}
) {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt === retries || !shouldRetry(error, attempt)) {
        break;
      }

      const wait = delayMs * Math.pow(factor, attempt);
      await new Promise((resolve) => setTimeout(resolve, wait));
      attempt += 1;
    }
  }

  throw lastError;
}

export function isTransientError(error) {
  if (!error) return false;

  const message = (error.message || "").toLowerCase();
  const code = error.code || error.codeName;

  return (
    code === 11000 ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable") ||
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("network")
  );
}

export default withRetry;
