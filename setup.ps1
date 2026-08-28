Write-Output "=== Installation KOKANSEY SARLU ==="

# 1. Nettoyage
Write-Output "Nettoyage des anciennes installations..."
Remove-Item -Recurse -Force backend/node_modules, frontend/node_modules, desktop/node_modules, backend/package-lock.json, frontend/package-lock.json, desktop/package-lock.json -ErrorAction SilentlyContinue

# 2. Backend
Write-Output "Installation Backend..."
Set-Location backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
Set-Location ..

# 3. Frontend
Write-Output "Installation Frontend..."
Set-Location frontend
npm install
Set-Location ..

# 4. Desktop
Write-Output "Installation Desktop..."
Set-Location desktop
npm install
Set-Location ..

Write-Output "=== Installation terminée ! ==="
Write-Output "Pour lancer le backend : Set-Location backend; npm run dev"
Write-Output "Pour lancer le frontend : Set-Location frontend; npm run dev"
Write-Output "Pour lancer l'application de bureau : Set-Location desktop; npm start"
Write-Output "Pour packager l'application de bureau : Set-Location desktop; npm run dist:win"
Write-Output "Pour l'application Android : ouvrir le dossier android-webview-app dans Android Studio"
