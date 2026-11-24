# 🏰 Racibórz: Miasto, którego już nie ma (WebAR 4D)

Interaktywna, mobilna aplikacja **WebAR 4D** prezentująca cyfrową rekonstrukcję **Zamku Piastowskiego w Raciborzu** na przestrzeni wieków. Projekt stanowi prototyp narzędzia wystawienniczego i edukacyjnego dla muzeów, działającego bezpośrednio w przeglądarce smartfona (bez konieczności instalowania aplikacji ze sklepu).

🔗 **Uruchom aplikację na żywo (Live Demo):** [https://vercel.app](https://vercel.app)

---

## 🎯 Główne funkcje projektu

* **Ewolucja Architektoniczna 4D (4 odsłony wieków):** Płynna podróż w czasie od drewniano-ziemnego grodu piastowskiego (XIII w.), przez gotycki zamek ceglany z kaplicą zamkową (XV w.) i barokową przebudowę z dramatycznym efektem Wielkiego Pożaru (XVIII/XIX w.), aż po współczesność z interaktywnym suwakiem cyfrowej rekonstrukcji.
* **Tryb Konserwatorski „Warstwy Wieków (RTG)”:** Chronologiczne podświetlenie murów według stuleci ich powstania, prezentujące wartość badawczą i dokumentacyjną modelu 3D.
* **Pokazowy Detal Fotorealistyczny (PBR):** Możliwość przełączenia frontowej ściany wieży bramnej w tryb wysokiej szczegółowości (wątek ceglany z mapowaniem wypukłości oraz herb Piastów Śląskich), demonstrujący docelowy potencjał wizualny wystawy.
* **Interaktywny Świat i Dźwięk (Web Audio API):** Generowane w locie efekty dźwiękowe (szum rzeki Odry, dzwony zamkowe, dźwięk podnoszonej brony, alarm pożarowy), interaktywny strażnik pod bramą oraz ukryty baśniowy akcent (śpiący smok na dziedzińcu grodu).
* **Własny znacznik WebAR (`marker-aw.patt`) i PWA:** Osadzenie makiety na płaskim stole przy użyciu autorskiego znacznika AR z blokadą pozycji, obracaniem modelu palcami oraz możliwością instalacji na ekranie głównym telefonu (pełny ekran bez paska adresu).

## 🛠️ Technologie

* **Frontend & Grafika 3D:** React, TypeScript, Vite, Three.js (PBR Materials, Procedural Textures)
* **Rozszerzona Rzeczywistość & Audio:** WebAR (własny wzorzec `.patt`), Web Audio API, PWA (Web App Manifest)
* **Wdrożenie:** GitHub + Vercel

---

## 🇬🇧 English Summary

**Racibórz: The City That No Longer Exists (WebAR 4D)** is an interactive browser-based 3D & WebAR architectural reconstruction prototype depicting the historical evolution of the **Piast Castle in Racibórz** across four eras (13th-century wooden stronghold, 15th-century Gothic brick castle, 18th-century Baroque transformation & Great Fire, and modern digital reconstruction).

Designed as a proof-of-concept for museum exhibitions, it features a custom AR marker (`marker-aw.patt`), an X-Ray chronological layer mode, high-detail PBR brick & coat-of-arms toggle, procedural Web Audio soundscapes, and full-screen PWA support.

---

## 👤 Autor / Author

**Artur Wierzbicki**  
*Koncepcja, projekt i realizacja / Concept, Design & Development*  
🔗 LinkedIn: [://linkedin.com](https://linkedin.com)

📄 Licencja / License: **MIT**
