Set WshShell = CreateObject("WScript.Shell")

' Kill existing processes first
WshShell.Run "taskkill /F /IM electron.exe /T", 0, True
WshShell.Run "taskkill /F /IM node.exe /T", 0, True

' Wait a moment
WScript.Sleep 500

' Start the app
WshShell.CurrentDirectory = "c:\Users\aliha\OneDrive\Desktop\REDZYMM\bot\dashboard-v2"
WshShell.Run "cmd /c npm run dev", 0, False
