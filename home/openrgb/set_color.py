#!/usr/bin/env python3

import sys
from openrgb import OpenRGBClient
from openrgb.utils import DeviceType, RGBColor

color = RGBColor.fromHEX(sys.argv[1])

cli = OpenRGBClient()
gpu = cli.get_devices_by_type(DeviceType.GPU)[0]
case = cli.get_devices_by_type(DeviceType.LEDSTRIP)[0]

case.set_color(color)
gpu.set_mode("Direct")
gpu.set_color(color)
