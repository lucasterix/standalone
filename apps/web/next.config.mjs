/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Statischer Export: alle Seiten sind statisch → reines HTML/JS/CSS in out/,
  // servierbar von jedem Webserver (Hetzner: nginx-Container hinter Caddy).
  output: "export",
  // …/pruefliste/ → index.html-Ordnerstruktur (funktioniert ohne Server-Rewrites)
  trailingSlash: true,
};

export default nextConfig;
