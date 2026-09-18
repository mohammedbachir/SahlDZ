; SahlDZ Custom Installer
; Branding: Gold (#d4a84a) on Dark (#141210)

!include "MUI2.nsh"
!include "FileFunc.nsh"

Name "SahlDZ"
OutFile "SahlDZ Setup.exe"
InstallDir "$LOCALAPPDATA\SahlDZ"
InstallDirRegKey HKCU "Software\SahlDZ" "InstallDir"
RequestExecutionLevel admin

; ─── Branding Colors ───────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_UNABORTWARNING
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"

; ─── Custom Colors ─────────────────────────────────────────
!define MUI_BGCOLOR "141210"
!define MUI_TEXTCOLOR "F0ECE6"
!define MUI_INNERBGCOLOR "1E1C18"
!define MUI_INSTFILESPAGE_COLORS "D4A84A F0ECE6"

; ─── Pages ─────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "license.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ─── Languages ─────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "English"

; ─── Installer Sections ────────────────────────────────────
Section "SahlDZ" SecMain
  SetOutPath "$INSTDIR"

  ; Files
  File "release\win-unpacked\SahlDZ.exe"
  File "release\win-unpacked\chrome-sandbox.exe"
  File "release\win-unpacked\chrome_elf.dll"
  File "release\win-unpacked\d3dcompiler_47.dll"
  File "release\win-unpacked\ffmpeg.dll"
  File "release\win-unpacked\libEGL.dll"
  File "release\win-unpacked\libGLESv2.dll"
  File "release\win-unpacked\libstagefright.dll"
  File "release\win-unpacked\node.dll"
  File "release\win-unpacked\vk_swiftshader.dll"
  File "release\win-unpacked\vulkan-1.dll"
  File /r "release\win-unpacked\resources\*.*"

  ; Uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Registry
  WriteRegStr HKCU "Software\SahlDZ" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ" "DisplayName" "SahlDZ"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ" "DisplayIcon" '"$INSTDIR\SahlDZ.exe"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ" "NoRepair" 1

  ; Desktop Shortcut
  CreateShortCut "$DESKTOP\SahlDZ.lnk" "$INSTDIR\SahlDZ.exe" "" "$INSTDIR\SahlDZ.exe" 0

  ; Start Menu
  CreateDirectory "$SMPROGRAMS\SahlDZ"
  CreateShortCut "$SMPROGRAMS\SahlDZ\SahlDZ.lnk" "$INSTDIR\SahlDZ.exe" "" "$INSTDIR\SahlDZ.exe" 0
  CreateShortCut "$SMPROGRAMS\SahlDZ\Uninstall.lnk" "$INSTDIR\Uninstall.exe"

  ; Size
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ" "EstimatedSize" "$0"
SectionEnd

; ─── Uninstaller ───────────────────────────────────────────
Section "Uninstall"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\SahlDZ.lnk"
  RMDir /r "$SMPROGRAMS\SahlDZ"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SahlDZ"
  DeleteRegKey HKCU "Software\SahlDZ"
SectionEnd
