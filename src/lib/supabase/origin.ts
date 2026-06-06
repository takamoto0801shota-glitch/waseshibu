/** Railway / リバースプロキシ環境で正しい公開 URL を取得 */
export function getRequestOrigin(request: Request): string {
  const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return siteUrl.replace(/\/$/, "");

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain) {
    return `https://${railwayDomain}`;
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.split(",")[0].trim()}`;
  }

  const host = request.headers.get("host");
  if (host && !host.includes("localhost")) {
    return `https://${host}`;
  }

  return new URL(request.url).origin;
}
