# ✨ UNUGHA Event Platform
<p align="center">
  <img src="images/gambar.jpg" alt="UNUGHA Event Platform" style="border-radius: 20px; box-shadow: 0px 4px 20px rgba(0,0,0,0.1); width: 800px;" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?size=28&duration=3500&color=22D3EE&center=true&vCenter=true&width=800&lines=UNUGHA+EVENT+PLATFORM;Platform+Manajemen+Event+Kampus+Modern;Comprehensive+Software+Testing+%26+Analysis;Built+with+React+%2B+Supabase" alt="Typing SVG" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.0-38b2ac?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vitest-Unit_Tests-6e9f18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/SonarQube-Quality_Gate-ff6b6b?style=flat-square&logo=sonarqube&logoColor=white" alt="SonarQube" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?style=flat-square&logo=github-actions&logoColor=white" alt="GitHub Actions" />
</p>

---

## 📚 Overview
**UNUGHA Event Platform** adalah platform manajemen acara kampus modern yang dirancang untuk menyederhanakan kolaborasi antar mahasiswa dan organisasi di lingkungan Universitas Nahdlatul Ulama Al Ghazali. Proyek ini dikembangkan sebagai tugas akhir mata kuliah **Analisis & Pengujian Sistem (IF7A)**, dengan fokus utama pada kualitas kode, keandalan fungsional, dan pengujian sistem yang komprehensif.

---

## 👥 Tim Pengembang
| Role | Nama | NIM |
|-------|------|-----|
| **Project Leader** | **Ma’ruf Muchlisin** | 22EO10013 |
| **QA Engineer** | Akmal Ubaidillah | 22EO10013 |
| **Fullstack Dev** | Eko Patrio | 22EO10013 |

---

## 🚀 Fitur Utama
- **🔐 Secure Authentication**: Sistem login & registrasi terintegrasi dengan Supabase Auth.
- **📅 Interactive Calendar**: Visualisasi jadwal event kampus yang dinamis.
- **🛠 Event Management**: Full CRUD (Create, Read, Update, Delete) untuk pengelolaan event.
- **👤 Profile Personalization**: Pengaturan profil pengguna, bio, dan unggah foto avatar.
- **⚙️ Simulation**: Generator data dummy untuk pengujian skala besar.
- **📱 Responsive Design**: Antarmuka premium yang dioptimalkan untuk perangkat mobile dan desktop.

---

## 🧪 Quality Assurance & Testing
Proyek ini mengimplementasikan strategi pengujian berlapis untuk memastikan stabilitas sistem:

### 1. Unit Testing
- Menggunakan **Vitest** dan **React Testing Library**.
- Mencakup pengujian komponen UI, hooks, dan utilitas logic.
- **Total Tests**: `> 160 Passed`.

### 2. Integration Testing

- Pengujian alur kerja antar komponen (misal: Alur Login hingga masuk Dashboard).
- Pengujian integrasi layanan pihak ketiga (Supabase Mocking).

#### 🧪 Unit & Integration Test Result:

<p align="center">
  <img src="images/unit-test-report.png" alt="Unit Test Analysis Result" style="border-radius: 10px; border: 1px solid #e2e8f0; width: 100%;" />
</p>


### 3. Static Code Analysis

- **SonarQube**: Digunakan untuk navigasi technical debt, mendeteksi code smells, dan kerentanan keamanan.
- **ESLint**: Penegakan standar penulisan kode TypeScript yang ketat.

#### 🔍 Lint Analysis Result (ESLint):

<p align="center">
  <img src="images/lint-report.png" alt="Lint Analysis Result" style="border-radius: 10px; border: 1px solid #e2e8f0; width: 100%;" />
</p>

#### 📊 SonarQube Analysis Result:

<p align="center">
  <img src="images/sonarqube-report.png" alt="SonarQube Analysis Result" style="border-radius: 10px; border: 1px solid #e2e8f0; width: 100%;" />
</p>

### 4. CI/CD Pipeline
- **GitHub Actions**: Setiap push ke branch `main` akan memicu pipeline otomatis yang melakukan instalasi deps, linting, dan menjalankan seluruh suite pengujian.

---

## 🛠 Tech Stack
- **Frontend**: React 19 (Vite), Tailwind CSS, Lucide Icons.
- **Backend & Database**: Supabase (PostgreSQL), Supabase Storage.
- **Testing**: Vitest, React Testing Library.
- **Analysis**: SonarQube, ESLint.

---

## 🏁 Cara Menjalankan
1. Clone repositori ini.
2. Install dependensi: `npm install`.
3. Jalankan development server: `npm run dev`.
4. Jalankan pengujian: `npm test`.
5. Lihat laporan cakupan kode: `npm run coverage`.

---

<p align="center">
  <b>Dibuat dengan ❤️ oleh Tim Ma'ruf Muchlisin</b><br>
  <i>"Quality is not an act, it is a habit."</i>
</p>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?size=22&duration=3000&color=F97316&center=true&vCenter=true&width=600&lines=Analyze.+Test.+Improve.+Deploy." alt="Footer Typing SVG" />
</p>
