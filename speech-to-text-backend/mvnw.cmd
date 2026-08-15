@IF "%DEBUG%" == "" @ECHO OFF
SETLOCAL

SET "BASE_DIR=%~dp0"
SET "MAVEN_USER_HOME=%USERPROFILE%\.m2"
SET "MAVEN_WRAPPER_DIR=%MAVEN_USER_HOME%\wrapper\dists\apache-maven-3.9.8-bin"
SET "MAVEN_HOME=%MAVEN_WRAPPER_DIR%\apache-maven-3.9.8"
SET "DIST_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.8/apache-maven-3.9.8-bin.zip"

@REM Automatically locate and use JDK 21 if present
IF EXIST "C:\Program Files\Java\jdk-21" (
    SET "JAVA_HOME=C:\Program Files\Java\jdk-21"
    SET "PATH=C:\Program Files\Java\jdk-21\bin;%PATH%"
)

IF NOT EXIST "%MAVEN_HOME%\bin\mvn.cmd" (
    echo [INFO] Maven not found. Downloading Apache Maven via wrapper...
    IF NOT EXIST "%MAVEN_WRAPPER_DIR%" mkdir "%MAVEN_WRAPPER_DIR%"
    SET "ZIP_PATH=%MAVEN_WRAPPER_DIR%\maven.zip"
    
    curl.exe -fL -o "%MAVEN_WRAPPER_DIR%\maven.zip" "%DIST_URL%"
    if errorlevel 1 (
        echo [ERROR] Failed to download Maven from %DIST_URL%.
        exit /b 1
    )
    
    tar.exe -xf "%MAVEN_WRAPPER_DIR%\maven.zip" -C "%MAVEN_WRAPPER_DIR%"
    del "%MAVEN_WRAPPER_DIR%\maven.zip" 2>nul
    
    IF NOT EXIST "%MAVEN_HOME%\bin\mvn.cmd" (
        echo [ERROR] Failed to unpack Maven into %MAVEN_HOME%.
        exit /b 1
    )
    echo [INFO] Maven successfully installed to %MAVEN_HOME%
)

SET "PATH=%MAVEN_HOME%\bin;%PATH%"

"%MAVEN_HOME%\bin\mvn.cmd" %*
