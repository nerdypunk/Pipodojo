// Cloudflare Web Analytics: counts visits, pages, countries and devices, with no cookies and
// nothing that identifies a person. Only on the live site, never while developing locally.
// The token is public by design (it sits in every page that uses Web Analytics).
const TOKEN = "031eb4c9f5364dfeb5644bcad5c585f7";
const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function startAnalytics() {
  if (!import.meta.env.PROD || LOCAL.has(window.location.hostname)) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.dataset["cfBeacon"] = JSON.stringify({ token: TOKEN });
  document.head.appendChild(script);
}
