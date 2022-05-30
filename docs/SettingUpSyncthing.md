# Setting up Syncthing to run on Keychain Backup

Syncthing is a free and open source program to allow you to synchronize your files between 2 or more computers.

## Manual setup:

1. Download Synthing from our github repo: [Sything v1.20.1](../AdditionalFiles/syncthing)

2. Use your favorite scp program to copy it to the /root/ folder on the omega2+.

3. Reboot the keychain backup device. It will automatically find the sycnthing binary and start it after mounting the encrypted USB drive.

4. You can access syncthing's webpage by going to <Omega2+'s ip address>:8384. Please note by default there will be no username or password setup to protect syncthing's config webpage. Please set that up!
