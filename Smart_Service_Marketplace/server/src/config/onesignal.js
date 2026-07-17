import env from "./env.js";

export function isOneSignalConfigured() {
  return Boolean(env.ONESIGNAL_APP_ID && env.ONESIGNAL_REST_API_KEY);
}

export function getOneSignalConfig() {
  return {
    appId: env.ONESIGNAL_APP_ID || "",
    restApiKey: env.ONESIGNAL_REST_API_KEY || "",
    enabled: isOneSignalConfigured(),
  };
}

export default { isOneSignalConfigured, getOneSignalConfig };
