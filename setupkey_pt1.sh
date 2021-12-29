#!/bin/bash

opkg install --force-depends /root/tempsetupfiles/AdditionalFiles/*.ipk

sleep 5

opkg install --force-depends /root/tempsetupfiles/AdditionalFiles/*.ipk

opkg update

opkg install python3

umount /dev/sda1

fdisk /dev/sda < /root/tempsetupfiles/fdisk.cmds

reboot

