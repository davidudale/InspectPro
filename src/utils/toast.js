const ERROR_CODE_MESSAGES = {
  "auth/email-already-in-use": "This email address is already registered.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-login-credentials": "The email or password is incorrect.",
  "auth/network-request-failed": "Network connection lost. Please try again.",
  "auth/permission-denied": "You do not have permission to perform this action.",
  "auth/requires-recent-login": "Please sign in again and retry this action.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/user-not-found": "No account was found with those details.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/wrong-password": "The email or password is incorrect.",
  "permission-denied": "You do not have permission to perform this action.",
  unavailable: "The service is temporarily unavailable. Please try again.",
};

const ensureSentence = (message) => {
  const trimmed = String(message || "").trim();
  if (!trimmed) return "";

  const normalized = trimmed.replace(/\s+/g, " ");
  const punctuated = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  return punctuated.charAt(0).toUpperCase() + punctuated.slice(1);
};

export const getToastErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  if (error?.code && ERROR_CODE_MESSAGES[error.code]) {
    return ERROR_CODE_MESSAGES[error.code];
  }

  if (error?.message) {
    const cleanedMessage = String(error.message)
      .replace(/^firebase:\s*/i, "")
      .replace(/\(auth\/[^)]+\)/gi, "")
      .replace(/\[[^\]]+\]\s*/g, "")
      .trim();

    const normalizedCode = cleanedMessage.toLowerCase();
    if (ERROR_CODE_MESSAGES[normalizedCode]) {
      return ERROR_CODE_MESSAGES[normalizedCode];
    }

    const sentence = ensureSentence(cleanedMessage);
    if (sentence) return sentence;
  }

  return ensureSentence(fallback);
};
