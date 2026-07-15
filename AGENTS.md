# Orbitrush

Orbitrush, mobil öncelikli ve dikey ekranda oynanan tek tuşlu bir neon uzay oyunudur. Oyuncu basılı tutarak bir gezegenin yörüngesine kilitlenir, bırakarak teğet yönde fırlar ve mümkün olduğunca uzun süre hayatta kalmaya çalışır.

## Teknik yapı

- Next.js, React ve TypeScript kullanır.
- Vercel üzerinde yayınlanır.
- Oyun Canvas üzerinde çalışır; ilerleme ve geliştirici ayarları `localStorage` içinde tutulur.

## Çalışma ilkeleri

- Proof of concept sade, hızlı ve mobil odaklı kalmalı.
- Temel oyun davranışları için [mechanics.md](./mechanics.md) kaynak alınmalı.
- Core mekaniklerde değişiklik yapıldığında `mechanics.md` aynı değişiklik kapsamında güncellenmeli.
- Değişikliklerden sonra `npm run lint` ve `npm test` çalıştırılmalı.
