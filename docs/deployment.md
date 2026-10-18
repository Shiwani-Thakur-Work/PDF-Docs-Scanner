# Deployment Guide: GitHub Pages & Cloudflare Pages

This guide walks you through deploying **ApexDoc Scanner** to a live, publicly accessible HTTPS URL for free on either **GitHub Pages** or **Cloudflare Pages**.

---

## Option A: GitHub Pages (Recommended for GitHub Repositories)

### Step 1: Create a GitHub Repository
1. Go to [GitHub.com](https://github.com) and click **New Repository**.
2. Name your repository (for example: `pdf-docs-scanner` or `doc-scanner`).
3. Set the repository to **Public** (required for free GitHub Pages).
4. Do **not** initialize with a README (we already have a complete codebase ready).
5. Click **Create repository**.

### Step 2: Initialize Git and Push from your Computer
In your project directory terminal, run:

```bash
# Initialize git if not already done
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "feat: initial commit of ApexDoc Scanner with Apple aesthetic & offline PWA"

# Set branch name to main
git branch -M main

# Link your local repo to GitHub (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push your code to GitHub
git push -u origin main
```

### Step 3: Enable Automated GitHub Actions Deployment
We include a pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`) in this project.
1. In your GitHub repository, click on the **Settings** tab.
2. In the left sidebar, click **Pages** (under "Code and automation").
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Every time you push changes to `main`, GitHub will automatically build and publish your site to:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## Option B: Cloudflare Pages (Instant Zero-Config Global CDN)

Cloudflare Pages provides world-class global CDN speed and zero setup:

### Method 1: Connect your GitHub Repo to Cloudflare
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages**.
2. Click **Create Application** > **Pages** > **Connect to Git**.
3. Select your GitHub repository (`pdf-docs-scanner`).
4. Configure Build Settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**.
6. Your live link will be generated instantly (e.g., `https://pdf-docs-scanner.pages.dev`).

### Method 2: Direct Upload via Cloudflare Wrangler CLI (Optional)
```bash
# Build the production bundle
npm run build

# Deploy the dist folder directly to Cloudflare
npx wrangler pages deploy dist --project-name=pdf-docs-scanner
```

---

## 3. Custom Domain Setup (Optional)
Both GitHub Pages and Cloudflare Pages allow you to attach your own custom domain (e.g., `scan.yourname.com`) for free with automatic SSL certificates:
- In Cloudflare Pages: Go to **Custom domains** > **Set up a domain**.
- In GitHub Pages: Go to **Settings** > **Pages** > **Custom domain**.
