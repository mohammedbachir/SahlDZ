$env:JAVA_HOME = "F:\jdk21\jdk-21.0.12.1+1"
if (-not (Test-Path $env:JAVA_HOME)) {
  $env:JAVA_HOME = (Get-ChildItem "F:\jdk21" -Directory | Where-Object Name -like "jdk-21*" | Select-Object -First 1).FullName
}
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Set-Location "F:\sahlDz"
npx firebase emulators:start --only auth,firestore --project test-project 2>&1 |
  ForEach-Object { "$_" } | Out-File "F:\sahlDz\.emulator-log.txt" -Encoding utf8
