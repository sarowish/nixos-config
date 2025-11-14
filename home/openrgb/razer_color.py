#!/usr/bin/env python3

from openrazer.client import DeviceManager
import sys
import os

color = sys.argv[1]

(red, green, blue) = [int(color[2 * i : 2 * (i + 1)], 16) for i in range(3)]


def change_color(device, red, green, blue):
    device.fx.static(red, green, blue)


try:
    change_color(DeviceManager().devices[1], red, green, blue)
except:
    print("starting openrazer-daemon")
    os.system("openrazer-daemon")
    change_color(DeviceManager().devices[1], red, green, blue)
    print("killing openrazer-daemon")
    os.system("killall openrazer-daemon")
