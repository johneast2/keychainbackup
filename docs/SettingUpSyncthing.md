# Setting up Syncthing to run on Keychain Backup

Syncthing is a free and open source program to allow you to synchronize your files between 2 or more computers. Find out about it by checking out its website: [https://syncthing.net/](https://syncthing.net/)

## Setup using the manage app:

1. When setting up the keychain backup device, click advanced, then make sure Install Syncthing checkbox is checked.
2. After the setup is finished, you can access syncthing's webpage by going to <Omega2+'s ip address>:8384. NOTE: By default there will be no username or password setup to protect syncthing's config webpage. Please set that up!

## Manual setup:

1. Download Synthing from our github repo: [Sything v1.20.1](../syncthing)
    
    NOTE: This is the syncthing mipsle binary downloaded from [Syncthing's Download page](https://github.com/syncthing/syncthing/releases/download/v1.20.1/syncthing-linux-mipsle-v1.20.1.tar.gz), then shrunk using ```upx```. You can use the one from syncthing yourself, you'll just have to use ```upx``` to shrink it because its too big for the omega2+'s storage space.

2. Use your favorite scp program to copy it to the /root/ folder on the omega2+.

3. Reboot the keychain backup device. It will automatically find the sycnthing binary and start it after mounting the encrypted USB drive.

4. You can access syncthing's webpage by going to <Omega2+'s ip address>:8384. NOTE: By default there will be no username or password setup to protect syncthing's config webpage. Please set that up!
