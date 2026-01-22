#!/bin/bash
# Lavalink Launcher Script

LAVALINK_DIR="$(dirname "$0")"
LAVALINK_JAR="$LAVALINK_DIR/Lavalink.jar"

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java bulunamadı! Java 17+ kurulumu gerekli."
    echo "Ubuntu/Debian: sudo apt install openjdk-17-jre-headless"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "❌ Java 17+ gerekli. Mevcut sürüm: $JAVA_VERSION"
    exit 1
fi

# Download Lavalink if not exists
if [ ! -f "$LAVALINK_JAR" ]; then
    echo "📥 Lavalink indiriliyor..."
    curl -L -o "$LAVALINK_JAR" "https://github.com/lavalink-devs/Lavalink/releases/download/4.0.10/Lavalink.jar"
fi

echo "🚀 Lavalink başlatılıyor (RAM: 64M-384M, G1GC)..."
cd "$LAVALINK_DIR"
java -Xmx384M -Xms64M -XX:+UseG1GC -jar Lavalink.jar
