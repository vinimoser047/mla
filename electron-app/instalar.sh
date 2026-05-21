#!/bin/bash
set -e

echo ""
echo "=== MLA — Instalador ==="
echo ""

# 1. Instalar Node.js se não tiver
if ! command -v node &> /dev/null; then
  echo "→ Instalando Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - > /dev/null 2>&1
  sudo apt install -y nodejs > /dev/null 2>&1
  echo "✓ Node.js instalado"
else
  echo "✓ Node.js já instalado ($(node -v))"
fi

# 2. Instalar dependências do app
echo "→ Instalando dependências do app..."
cd "$(dirname "$0")"
npm install --silent
echo "✓ Dependências instaladas"

# 3. Criar atalho no launcher do Chromebook
DESKTOP_DIR="$HOME/.local/share/applications"
mkdir -p "$DESKTOP_DIR"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

cat > "$DESKTOP_DIR/mla-gestao.desktop" << EOF
[Desktop Entry]
Name=MLA Gestão de Clientes
Exec=bash -c 'cd "$APP_DIR" && npm start'
Type=Application
Categories=Office;Business;
StartupNotify=true
EOF

echo "✓ Atalho criado no launcher"
echo ""
echo "=== Instalação concluída! ==="
echo ""
echo "Para abrir o app agora, rode:"
echo "   cd $APP_DIR && npm start"
echo ""
echo "Ou procure 'MLA' no launcher do Chromebook."
echo ""
