@echo off
REM use: 7zip.bat path\to\7z.exe working\directory -mx0|-mx9 output\file.zip file1 file2 file3 file4
set EXE=%1
shift
set DIR=%1
cd /d %DIR%
shift
set ARGS=a -tzip -r %1
shift
set OUTZIP=%1
shift

set FILES=
:process
if "%1" == "" goto done
set FILES=%FILES% %1\*
shift
goto process
:done
%EXE% %ARGS% %OUTZIP% %FILES%  -xr!.svn\ -xr!CVS\ -xr!*~
