# 🚖 Mahalaxmi Tours and Travels

A responsive, high-performance web application for **Mahalaxmi Tours and Travels** (Gwalior, MP). Features an interactive car fleet catalog with category filtering, customer reviews submission and display, Google Maps office location integration, and a booking enquiry system powered by Nodemailer (Gmail SMTP) and Meta WhatsApp Cloud API (with direct WhatsApp fallback).

Prepared for **GitHub version control** and seamless **Netlify deployment** (Static CDN + Netlify Serverless Functions).

---

## 🌟 Key Features

- **🚗 Interactive Car Fleet**: Browse Hatchbacks, Sedans, and SUVs with transparent per-KM pricing, seating capacity, and features.
- **💬 WhatsApp & Email Enquiries**: Visitors submit booking enquiries with instant customer & admin notifications via Gmail SMTP and Meta WhatsApp Cloud API.
- **⭐ Customer Reviews**: Browse customer feedback and submit new reviews directly from the site.
- **📍 Office Location**: Direct Google Maps directions to AM-18, DD Nagar, Gwalior.
- **⚡ Dual-Mode Deployment**:
  - **Local / Server Mode**: Standard Node.js & Express server (`node server.js`).
  - **Netlify Serverless Mode**: Static frontend hosted on Netlify CDN + serverless API via `netlify/functions/api.js`.

---

## 📁 Project Structure

```text
Mahalaxmi/
├── data/
│   └── tours.json                # Fleet data, brand information, and reviews
├── netlify/
│   └── functions/
│       └── api.js                # Serverless function handling /api/* on Netlify
├── public/                       # Frontend static files (Netlify publish directory)
│   ├── app.js                    # Dynamic UI logic, fetch calls, category filtering
│   ├── index.html                # Main landing page
│   └── styles.css                # Custom responsive CSS
├── queue/
│   └── notificationQueue.js      # Nodemailer SMTP and Meta WhatsApp dispatch logic
├── .env.example                  # Template for environment variables
├── .gitignore                    # Excludes secrets (.env), credentials, and node_modules
├── netlify.toml                  # Netlify build, redirects, functions, and headers config
├── package.json                  # Node.js dependencies and scripts
├── README.md                     # Documentation and deployment guide
└── server.js                     # Local Express / HTTP server & API logic
```

---

## 🚀 Quickstart: Local Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Git

### 2. Installation
```bash
# Install dependencies
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and fill in your details:
```ini
PORT=3000

# Gmail SMTP for Email Notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM="Mahalaxmi Tours & Travels <your_email@gmail.com>"
ADMIN_EMAIL=your_email@gmail.com

# Meta WhatsApp Cloud API (Optional - direct wa.me link works without this)
WHATSAPP_CLOUD_ACCESS_TOKEN=
WHATSAPP_CLOUD_PHONE_NUMBER_ID=
ADMIN_WHATSAPP=91XXXXXXXXXX
```

> **Note on Gmail SMTP**: Use a **Google App Password** (not your regular Gmail password). Generate one at [Google Account Security -> 2-Step Verification -> App Passwords](https://myaccount.google.com/apppasswords).

### 4. Start Local Server
```bash
npm start
```
Visit `http://localhost:3000` in your browser.

---

## 🐙 Step-by-Step GitHub Setup

### 1. Initialize Git Repository
In the root of the project directory:
```bash
git init
```

### 2. Verify `.gitignore` is Active
Run `git status` to ensure `.env`, `whatsapp-auth/`, and `node_modules/` are **NOT** tracked:
```bash
git status
```
> ⚠️ **CRITICAL**: Confirm that `.env` and `whatsapp-auth` do **not** appear under "Untracked files". Only `.gitignore`, `.env.example`, `netlify.toml`, `package.json`, `server.js`, `public/`, `data/`, `queue/`, `netlify/`, and `README.md` should be listed.

### 3. Stage and Commit
```bash
git add .
git commit -m "feat: prepare project for GitHub and Netlify deployment"
```

### 4. Push to GitHub
1. Create a new repository on [GitHub](https://github.com/new) (e.g. `mahalaxmi-tours-and-travels`). Keep it empty (do not add README, .gitignore, or license).
2. Link your local repo and push:
```bash
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git push -u origin main
```

---

## 🌐 Step-by-Step Netlify Deployment

This project includes a pre-configured `netlify.toml` and serverless function (`netlify/functions/api.js`).

### Method 1: Git Integration (Recommended)

1. Log in to your [Netlify Dashboard](https://app.netlify.com/).
2. Click **"Add new site"** ➔ **"Import an existing project"**.
3. Select **GitHub** and authorize access to your repository.
4. Select the repository: `mahalaxmi-tours-and-travels`.
5. Netlify will auto-detect configurations from `netlify.toml`:
   - **Base directory**: *(leave blank / root)*
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
6. **Set Environment Variables**:
   - Before deploying, click **"Add environment variables"** (or navigate to **Site configuration > Environment variables** after creation).
   - Add the following keys (from your `.env`):
     - `SMTP_HOST`: `your_smtp_host` (e.g. your SMTP host)
     - `SMTP_PORT`: `587`
     - `SMTP_USER`: `your_email@gmail.com`
     - `SMTP_PASS`: `your_gmail_app_password`
     - `ADMIN_EMAIL`: `your_email@gmail.com`
     - `ADMIN_WHATSAPP`: `91XXXXXXXXXX` (your WhatsApp number)
     - `WHATSAPP_CLOUD_ACCESS_TOKEN`: *(optional)*
     - `WHATSAPP_CLOUD_PHONE_NUMBER_ID`: *(optional)*
7. Click **"Deploy site"**.
8. Your site is live! Netlify provides a free subdomain (e.g., `https://your-site.netlify.app`), where you can also add a custom domain.

### Method 2: Netlify CLI

If you prefer deploying directly from the terminal:
```bash
# 1. Login to Netlify CLI
npx netlify login

# 2. Initialize and link site
npx netlify init

# 3. Deploy to production
npx netlify deploy --prod
```

---

## ⚙️ How Netlify Architecture Works

```text
Browser Request
      │
      ├───> /styles.css, /app.js, /index.html ───> Netlify CDN (Static Cache)
      │
      └───> /api/data, /api/enquiry, /api/reviews
                  │
                  ▼ (netlify.toml redirect: /api/* -> /.netlify/functions/api/:splat)
            Netlify Serverless Function (netlify/functions/api.js)
                  │
                  ├──> Gmail SMTP (Nodemailer) -> Customer & Admin Email
                  └──> Meta WhatsApp Cloud API / Direct WhatsApp Link
```

1. **Static Files**: Netlify CDN directly hosts `public/index.html`, `public/styles.css`, and `public/app.js` with optimal browser caching headers.
2. **Serverless APIs**: In `netlify.toml`, any call to `/api/*` is automatically rewritten to `/.netlify/functions/api`.
3. **No Downtime**: Serverless functions scale automatically from 0 to thousands of requests with no server maintenance required.

---

## 🔒 Security Best Practices

- **Never commit `.env`**: `.gitignore` strictly protects `.env` from accidental commits.
- **Gmail App Passwords**: Never use your personal Google account password; generate an isolated App Password for SMTP.
- **WhatsApp Credentials**: Any session authentication tokens (`whatsapp-auth/`) are excluded from version control to prevent credential leakage.

---

## 📞 Support & Contact

- **Business**: Mahalaxmi Tours and Travels
- **Office**: AM-18, DD Nagar, In front of Bhadouriya Ground, Near Mangal Bhawan, Gwalior, MP
- **WhatsApp**: [+91 8871724435](https://wa.me/918871724435)
