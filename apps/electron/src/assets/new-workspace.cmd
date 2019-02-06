@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\new-workspace" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\new-workspace" %*
)
