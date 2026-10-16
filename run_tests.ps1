$ErrorActionPreference = 'Stop'
$jdkUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.4%2B7/OpenJDK21U-jre_x64_windows_hotspot_21.0.4_7.zip"
$zipFile = "jre21.zip"
$extractDir = "..\jre21"

if (-not (Test-Path $extractDir)) {
    Write-Host "Downloading Java JRE 21..."
    curl.exe -L -o $zipFile $jdkUrl
    Write-Host "Extracting Java JRE 21..."
    Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force
}

$env:JAVA_HOME = "C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\jre21\jdk-21.0.4+7-jre"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "Java Version:"
java -version

Write-Host "Running Firebase Emulator Tests..."
pnpm dlx firebase-tools emulators:exec "pnpm --filter @calm-wms/functions run test" --project calm-wms
