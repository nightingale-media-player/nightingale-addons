#!/bin/sh
rm -rf build
rm -f nightingale-developer-tools.xpi
mkdir build
cp -r chrome ./build
cp -r components ./build
cp -r defaults ./build
cp chrome.manifest ./build
cp install.rdf ./build
cd build
zip -r ../nightingale-developer-tools.xpi ./
cd ..
rm -rf build