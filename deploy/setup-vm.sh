#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  RMusic Pro - VM Kurulum Scripti
#  Bu script VM sunucusunda çalıştırılmalıdır
# ═══════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════╗"
echo "║     RMusic Pro - VM Setup Script               ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠ Root olarak çalıştırıyorsunuz. Dikkatli olun.${NC}"
fi

# Step 1: Check Node.js
echo ""
echo "━━━ Step 1: Node.js Kontrolü ━━━"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js bulundu: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js bulunamadı!${NC}"
    echo "Lütfen Node.js v18+ kurun:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

# Step 2: Check npm
echo ""
echo "━━━ Step 2: npm Kontrolü ━━━"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm bulundu: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm bulunamadı!${NC}"
    exit 1
fi

# Step 3: Install dependencies
echo ""
echo "━━━ Step 3: Bağımlılıkları Yükleme ━━━"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Bağımlılıklar yüklendi${NC}"
else
    echo -e "${RED}✗ Bağımlılık yüklemesi başarısız!${NC}"
    exit 1
fi

# Step 4: Install PM2 globally
echo ""
echo "━━━ Step 4: PM2 Kurulumu ━━━"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 zaten kurulu${NC}"
else
    echo "PM2 kuruluyor..."
    npm install -g pm2
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PM2 kuruldu${NC}"
    else
        echo -e "${YELLOW}⚠ PM2 kurulamadı. sudo ile deneyin.${NC}"
    fi
fi

# Step 5: Create ecosystem file for PM2
echo ""
echo "━━━ Step 5: PM2 Yapılandırması ━━━"
cat > ecosystem.config.js << 'EOF'
module.exports = {
    apps: [
        {
            name: 'rmusic-api',
            script: './api-server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                API_PORT: 3001,
                API_KEY: 'rmusic-secret-2024'  // Değiştirin!
            }
        }
    ]
};
EOF
echo -e "${GREEN}✓ ecosystem.config.js oluşturuldu${NC}"

# Step 6: Instructions
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Kurulum tamamlandı!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Sonraki adımlar:"
echo ""
echo "1. API Key'i değiştirin:"
echo "   nano ecosystem.config.js"
echo ""
echo "2. API Sunucusunu başlatın:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "3. Otomatik başlangıç ayarlayın:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. Durumu kontrol edin:"
echo "   pm2 status"
echo "   pm2 logs rmusic-api"
echo ""
echo "5. Firewall'ı açın (eğer gerekirse):"
echo "   sudo ufw allow 3001"
echo ""
echo -e "${YELLOW}⚠ Önemli: data/ayarlar.json dosyasında bot token'ınızın olduğundan emin olun!${NC}"
echo ""
