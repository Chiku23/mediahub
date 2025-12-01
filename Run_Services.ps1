# Auth service
Start-Process powershell -ArgumentList "cd services/auth; npx nodemon index.js" -WindowStyle Normal

# Upload service
Start-Process powershell -ArgumentList "cd services/upload; npx nodemon index.js" -WindowStyle Normal

# Media service
Start-Process powershell -ArgumentList "cd services/media; npx nodemon index.js" -WindowStyle Normal

# Metadata service
Start-Process powershell -ArgumentList "cd services/metadata; npx nodemon index.js" -WindowStyle Normal

# Thumbnail service
Start-Process powershell -ArgumentList "cd services/thumbnail; npx nodemon index.js" -WindowStyle Normal

# Transcoder service
Start-Process powershell -ArgumentList "cd services/transcoder; npx nodemon index.js" -WindowStyle Normal