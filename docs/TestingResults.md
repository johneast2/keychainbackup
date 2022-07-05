# Testing Interrupted Backups

Since there's no way to "Safely Remove USB" option on keychain backup, it's extremely important that 
removing the USB drive doesn't break the filesystem on the USB drive. It is designed to use the ext4 filesystem, so it should be very resisilent.
But its always good to test assumptions :).

To test that the USB drive's filesystem won't be affected by being removed repeatedly, 
I made a test system using a nodeMCU and an a relay. The nodeMCU controls the relay and connected to the wifi network.
I hacked up a USB extension cable and put the relay between the + voltage line. That way I can control the power to the USB drive 
and mimic an unexpected removal. 

I wrote a simple program that checks if the keychain backup device is on, then powers on the USB 
drive and makes sure the encrypted volume mounts successfully. It then starts an rsync backup to the device and waits a few minutes.
Finally it sends a command over the network to the nodeMCU to power off the USB drive. Then repeat over and over, until the 
USB drive is corrupted.

# Results

I tested against the omega2+ and the Raspberry pi versions of keychaing backup. Both ran for more than 500+ interrupted backups without failing the test.
I never saw any filesystem corruption on the USB drive filesystem.

With those kinds of results, I am extremely confident that removing the USB drive without "Safely Removing USB" will not have an adverse effect on the USB drive.
