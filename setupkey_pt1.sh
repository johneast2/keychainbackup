#!/bin/bash

opkg install --force-depends /root/tempsetupfiles/AdditionalFiles/*.ipk

sleep 5

opkg install --force-depends /root/tempsetupfiles/AdditionalFiles/*.ipk

opkg update

opkg install python3

umount /dev/sda1

fdisk /dev/sda < /root/tempsetupfiles/fdisk.cmds

echo "finished part 1"

# don't know why this doesn't need nohup
reboot -d 5

exit

