; Inno Setup 6 script. Build with ..\build-installer.ps1
#define AppName "Makifind"
#define AppVersion "1.2.0"
#define RepoUrl "https://github.com/Moliiknis/Makifind"
; Overridable for tests: ISCC /DPriv=lowest /DPanelRoot=C:\some\dir
#ifndef Priv
  #define Priv "lowest"
#endif
#ifndef PanelRoot
  #define PanelRoot "{userappdata}\Adobe\CEP\extensions"
#endif

[Setup]
AppId={{9006EB4D-3B00-4B96-893B-AEA4EE8D9CF8}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Makimchi
AppPublisherURL={#RepoUrl}
AppSupportURL={#RepoUrl}/issues
AppUpdatesURL={#RepoUrl}/releases
UninstallDisplayName={#AppName} for After Effects
LicenseFile=..\LICENSE.md
OutputDir=..\release
OutputBaseFilename={#AppName}-{#AppVersion}-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired={#Priv}
DisableProgramGroupPage=yes
UsedUserAreasWarning=no
CloseApplications=yes
ShowLanguageDialog=no
DefaultDirName={#PanelRoot}\{#AppName}
DisableDirPage=yes
UninstallFilesDir={app}\.uninstall

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[Messages]
FinishedLabelNoIcons=[name] is installed. Restart After Effects and open Window > Extensions > Makifind.

[Files]
Source: "..\CSXS\*"; DestDir: "{app}\CSXS"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\css\*"; DestDir: "{app}\css"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\js\*"; DestDir: "{app}\js"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\jsx\*"; DestDir: "{app}\jsx"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\index.html"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; CEP loads unsigned panels only with PlayerDebugMode=1
Root: HKCU; Subkey: "Software\Adobe\CSXS.9"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"
Root: HKCU; Subkey: "Software\Adobe\CSXS.13"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"

[Code]
function IsJunction(const Path: String): Boolean;
var
  FR: TFindRec;
begin
  Result := False;
  if FindFirst(Path, FR) then
  begin
    Result := (FR.Attributes and $400) <> 0;  { FILE_ATTRIBUTE_REPARSE_POINT }
    FindClose(FR);
  end;
end;

{ A developer link (junction) in place of the panel folder is removed, never its target. }
procedure DropPanelLink(const Path: String);
begin
  if IsJunction(Path) then
    RemoveDir(Path);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    DropPanelLink(ExpandConstant('{app}'));
end;
