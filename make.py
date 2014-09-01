#!/usr/bin/env python

import os
import sys
from zipfile import ZipFile
from xml.dom.minidom import parse

if len(sys.argv) == 1:
  print "specify a folder name in order to build the add-on"
else:
  install = parse(os.path.join(sys.argv[1], "install.rdf"))
  element = install.getElementsByTagName("em:version")[0]
  version = element.firstChild.data
  xpiName = sys.argv[1].replace("/", "") + "-" + version + ".xpi"
  xpi = ZipFile(xpiName, "w")
  os.chdir(sys.argv[1])
  for root, dirs, files in os.walk("."):
      for name in files:
          path = os.path.join(root, name)
          xpi.write(path, path, 8)
  xpi.close()
  os.chdir("..")
  if os.path.exists(xpiName):
      print(xpiName + " successfully written.")
  else:
      sys.exit(xpiName + " could not be written.")
