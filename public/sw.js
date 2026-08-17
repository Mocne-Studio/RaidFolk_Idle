// Service worker istnieje po to, żeby dało się zainstalować aplikację.
// CELOWO nic nie cachuje — inaczej Twoje zmiany w kodzie nie docierałyby do telefonu
// i debugowałbyś starą wersję, nie wiedząc o tym.

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  // zawsze z sieci; offline pokazuje krótką informację zamiast białej strony
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(
        '<meta charset="utf-8"><body style="background:#100E0C;color:#E9E0D2;font-family:system-ui;padding:40px">' +
        '<h2>Brak połączenia z serwerem</h2>' +
        '<p style="color:#7D7266">Wieża liczy walki po stronie serwera. Sprawdź, czy laptop jest włączony i w tej samej sieci.</p>',
        { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 503 },
      ),
    ),
  );
});
