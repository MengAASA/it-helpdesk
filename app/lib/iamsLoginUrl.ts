export function iamsLoginUrl(returnPath: string = "/admin"): string {
  const loginUrl = process.env.IAMS_LOGIN_URL;
  const appUrl = process.env.APP_URL;
  if (!loginUrl) return "#";
  if (!appUrl) return loginUrl;
  const redirect = `${appUrl}${returnPath}`;
  return `${loginUrl}?redirect=${encodeURIComponent(redirect)}`;
}
