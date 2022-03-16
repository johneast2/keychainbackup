
# keychainbackup

## Hardware setup

### Items needed: Phillips screwdriver, 1/4" drill bit, drill, anti static wrist strap.
 1. place the circuit board on the case and screw in the 4 m3 screws.
 ![PCB in case](pictures/pcb_placed_in_case.jpg)

 ![PCB screwed in](pictures/pcb_screwed_in.jpg)
 2. Screw in the hooks into the diamond holes on the bottom of the case.
 ![install hooks](pictures/install_hooks.jpg)

 ![hooks installed](pictures/hooks_installed.jpg)
 3. Insert the Omega2+ into the headers on the circuit board.
 
 4. To mount the device on the wall, drill two 1/4" holes, using the case as a guide. Insert the blue drywall hangars into the holes.
 ![drywall hangars](pictures/drywall_mounting.jpg)
 
 5. Insert the USB drive into the USB port. <b>NOTE: The initial setup will erase all files on the USB drive!</b>
 
 6. Plug in the micro usb connector on the circuit board, then insert the other end into the power brick and plug it in to power on the device.
 ![plug in microusb](pictures/plug_in_power.jpg)


## Software Setup

 1. Go through Omega setup, [https://docs.onion.io/omega2-docs/first-time-setup.html](https://docs.onion.io/omega2-docs/first-time-setup.html)
 2. Start the Setup app.
 3. Enter the Omega2+'s Ip address.
 ![Omega2p IP address spot](pictures/omega2p_ipaddress.png)
 4. Set a new SSH password the Omega2+.
 ![Omega2p ssh password](pictures/omega2p_ssh_password.png)
 6. Set the password that will be used for the encrypted storage container.
 ![Omega IP address spot](pictures/omega2p_encryptedpassword.png)
 8. Click setup device.
 9. You will need to click the warning button about all files being deleted from the USB drive.
 10. Once setup finishes, the encrypted storage container will be mounted at /tmp/container on the Omega2+.

With the keychain backup device setup, next is setting up a backup program to backup to it. Any backup program that can send data to an SSH host should be able to work with keychain backup. [Here's an example using a free, open source program](docs/SettingUpBackups.md)

## Limitations

While this is a cool backup device, there are some limitations to be aware of. It's mostly designed to be used as a cold storage type device, where data is backed up to it that isn't changing often.

1. Backup speed is not fast. The fastest I've been able to backup data to it is about 1GB in 15 minutes. Assuming 1GB every 15 minutes, if the device is plugged in over night for 8 hours, it could backup 32GB.
2. Its backing up on a solid state USB device. Backing up constantly changing data will probably shorten the lifetime of the USB device.



## File Recovery.

For information on recovering files from the USB drive, [see this document.](docs/RecoveringFiles.md)

## Building the manager app

You will need nodjes and npm isntalled.

Install electron-packager: ```npm install --save-dev electron-packager```

Then to build it for windows: ```npx electron-packager manageApp/ keybackupmanager --platform=win32 --arch=x64```
