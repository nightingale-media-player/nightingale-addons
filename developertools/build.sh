#!/bin/sh
rm -rf build
rm -f songbird-developer-tools.xpi
svn export ./ build
mkdir -p build/chrome/dependencies/xul-explorer
svn export ./chrome/dependencies/xul-explorer/chrome build/chrome/dependencies/xul-explorer/chrome
# nuke the extensions dir since it causes long path extraction failures on Windows.  they're unneeded
# when running it as an extension (only used when invoked as a XR app)
rm -rf build/chrome/dependencies/xul-explorer/extensions
cd build
zip -r ../songbird-developer-tools.xpi ./

