
# keychainbackup

## Hardware setup
 1. Insert the Omega2+ into the headers on the circuit board.
 2. Insert the USB drive into the USB port. NOTE: The initial setup will erase all files on the USB drive!
 3. Plug in the micro usb connector on the circuit board, then insert the other end into the power brick and plug it in to power on the device.

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
