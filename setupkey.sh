#!/bin/bash

opkg install --force-depends /root/AdditionalFiles/*.ipk

sleep 5

opkg install --force-depends /root/AdditionalFiles/*.ipk

opkg update

opkg install python3

cp rc.local /etc/rc.local


