# 🚀 Complete Deployment Guide: Hostinger VPS (Ubuntu 22.04 / 24.04)

This step-by-step guide walks you through deploying **PC Doctor** on a **Hostinger VPS** using **Node.js, Nginx, PM2, and SSL (Certbot)**.

---

## 📋 Prerequisites
- A **Hostinger VPS** running **Ubuntu 22.04 LTS** or **Ubuntu 24.04 LTS**.
- Your VPS **IP address** and **root password** (found in Hostinger hPanel).
- (Optional but recommended) A **Domain name** pointed to your VPS IP via an `A` record (e.g., `yourdomain.com` -> `123.45.67.89`).
- A **MongoDB Atlas** cluster connection string (or install local MongoDB on the VPS).

---

## Step 1: Connect to Your VPS via SSH
Open PowerShell or Terminal on your computer and connect to your VPS:
```bash
ssh root@YOUR_VPS_IP
```
Enter your VPS root password when prompted.

---

## Step 2: Update Server & Install Required Software
Run the following commands on your VPS:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install essential tools
sudo apt install -y curl git nginx ufw build-essential

# 3. Install Node.js 20.x (LTS) & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node -v   # Should show v20.x.x
npm -v    # Should show 10.x.x

# 4. Install PM2 globally (Process Manager)
sudo npm install -g pm2
```

---

## Step 3: Configure UFW Firewall
Secure your VPS by allowing only SSH, HTTP, and HTTPS traffic:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

---

## Step 4: Clone the PC Doctor Project
We recommend putting web applications in `/var/www/`:

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
git clone <YOUR_GIT_REPOSITORY_URL> pc-doctor

# Enter project directory
cd pc-doctor

# Install all dependencies (root, server, and client)
npm run install:all
```

---

## Step 5: Configure Environment Variables (.env)
Create the production environment file for the backend:

```bash
nano server/.env
```

Paste your production variables into `server/.env`:
```env
PORT=5000
NODE_ENV=production

# MongoDB Atlas connection string (or mongodb://127.0.0.1:27017/pc_doctor if installed locally)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/pc_doctor?retryWrites=true&w=majority

# Your domain or VPS IP
CLIENT_URL=https://yourdomain.com

# Optional Cloudinary keys (leave empty if using local server/uploads/)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
Press `CTRL + O`, then `Enter` to save, and `CTRL + X` to exit `nano`.

---

## Step 6: Build the Frontend
Compile the React application for production:
```bash
npm run build
```
This generates the optimized production bundle inside `client/dist/`.

---

## Step 7: Start the Server with PM2
Launch the backend using the pre-configured `ecosystem.config.js`:

```bash
# Start the app in production mode
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# Save current PM2 processes to auto-start on reboot
pm2 save

# Generate and register the system startup script
pm2 startup
```
*(Copy and paste the command `pm2 startup` outputs if prompted).*

---

## Step 8: Configure Nginx Web Server
Copy the provided Nginx configuration template into Nginx sites:

```bash
sudo cp /var/www/pc-doctor/nginx.conf.example /etc/nginx/sites-available/pc-doctor
```

Edit the file to replace `yourdomain.com` with your actual domain name or VPS IP:
```bash
sudo nano /etc/nginx/sites-available/pc-doctor
```
Change line 12:
```nginx
server_name yourdomain.com www.yourdomain.com;
```
*(If you do not have a domain yet, replace with your VPS public IP: `server_name YOUR_VPS_IP;`).*

Enable the site and restart Nginx:
```bash
# Enable site configuration
sudo ln -s /etc/nginx/sites-available/pc-doctor /etc/nginx/sites-enabled/

# Remove default Nginx welcome page
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 9: Install Free SSL Certificate (HTTPS)
If you have a domain pointed to your VPS IP, secure it with a free Let's Encrypt SSL certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Follow the on-screen prompts (enter your email and agree to terms). Certbot will automatically configure HTTPS in Nginx and set up auto-renewal!

---

## 🔄 How to Deploy Updates in the Future
Whenever you push new code to GitHub, update your VPS with these 4 commands:

```bash
cd /var/www/pc-doctor
git pull origin main
npm run build
pm2 reload pc-doctor
```

---

## 🛠️ Helpful Troubleshooting Commands
| Task | Command |
| :--- | :--- |
| View live backend logs | `pm2 logs pc-doctor` |
| Restart backend server | `pm2 restart pc-doctor` |
| View CPU / RAM usage | `pm2 monit` |
| Test Nginx config | `sudo nginx -t` |
| View Nginx error logs | `sudo tail -f /var/log/nginx/error.log` |
| Check API health | `curl http://localhost:5000/api/health` |
