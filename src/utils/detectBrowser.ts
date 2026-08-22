function detectBrowser() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes("safari") && !userAgent.includes("chrome")) {
    return "safari";
  } else if (userAgent.includes("chrome")) {
    return "chrome";
  } else if (userAgent.includes("firefox")) {
    return "firefox";
  }

  return "unknown";
}

export default detectBrowser;
