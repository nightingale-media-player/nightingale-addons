#!/bin/sh
rm -rf build
rm -f *.xpi
mkdir build
cp -r chrome ./build
cp -r components ./build
cp -r defaults ./build
cp chrome.manifest ./build
cp install.rdf ./build
cd build

filename="../nightengale-developer-tools_"
filename+=`cat install.rdf | grep "em:version" | sed "s_[^<]*<[^>]*>__" | sed "s_<[^>]*>[^>]*__"`
filename+=".xpi"
echo $filename
zip -rq $filename ./
cd ..
rm -rf build