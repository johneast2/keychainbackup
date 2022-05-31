import os
from enum import Enum
import time
import subprocess
from subprocess import Popen, PIPE

import onionGpio3



passwordFile = "/root/containerPassword.txt"
containerFile = "/mnt/sda1/container.bin"

syncthingCommand = "/root/syncthing --gui-address=0.0.0.0:8384 > /dev/null 2>&1 &"

containerMountTimeLimitSeconds = 60

class DriveState(Enum):
    NO_USB_DRIVE = 1
    USB_DRIVE_MOUNTED = 2
    NO_CONTAINER = 3
    CONTAINER_MOUNTED = 4
    CONTAINER_ERROR = 5
    NO_CONTAINER_PASSWORD = 6

def driveIsMounted():
    mountCheckResult = ''

    mountCheckResult = subprocess.run(['mount'], stdout=subprocess.PIPE, universal_newlines=True)

    if "container" in mountCheckResult.stdout:
        return True
    
    return False

def afterMountedSetup():
    if not os.path.isdir('/root/encrypted_container'):
        process = subprocess.run("ln -s /tmp/container/ /root/encrypted_container", shell=True)
    process = subprocess.run("dropbear -P /var/run/dropbear2.pid -p 2222 -K 300 -T 3", shell=True)

def checkDriveState(driveStateParam):

    if not os.path.isfile(passwordFile):
        return DriveState.NO_CONTAINER_PASSWORD

    # check if the drive is already mounted:
    if driveStateParam != DriveState.CONTAINER_MOUNTED and driveIsMounted():
        driveStateParam = DriveState.CONTAINER_MOUNTED
        afterMountedSetup()
        return driveStateParam
        

    sdaCheckResult = ''

    sdaCheckResult = subprocess.run(['ls', '/dev'], stdout=subprocess.PIPE, universal_newlines=True)

    if not "sda1" in sdaCheckResult.stdout:
        if driveStateParam != DriveState.NO_USB_DRIVE:
            # got unplugged...
            # just do a reboot for now?
            # needed because dev mapper will allow it to continue to be written too even
            # though the disk is gone
            subprocess.run(['reboot'])
        return DriveState.NO_USB_DRIVE
    elif driveStateParam == DriveState.NO_USB_DRIVE:
        driveStateParam = DriveState.USB_DRIVE_MOUNTED

    if driveStateParam == DriveState.USB_DRIVE_MOUNTED and not os.path.isfile(containerFile):
        return DriveState.NO_CONTAINER

    if driveStateParam == DriveState.USB_DRIVE_MOUNTED or driveStateParam == DriveState.NO_CONTAINER and os.path.isfile(containerFile):
        #get the password
        containerPassword = ""
        with open(passwordFile) as passwordFileHandle:
            containerPassword = passwordFileHandle.readline().rstrip()

        #attempt to mount the container
        process = subprocess.run("mkdir /tmp/container", shell=True)

        process = Popen(["cryptsetup", "luksOpen", containerFile, "container"], stdin=PIPE)
        process.communicate((containerPassword + "\n").encode("ascii"))
        process.wait()

        time.sleep(5)

        process = subprocess.run("mount /dev/mapper/container /tmp/container/ && sleep 5", shell=True)

        #actually check if the conatiner mounted

        if driveIsMounted():
            afterMountedSetup()
            driveStateParam = DriveState.CONTAINER_MOUNTED

        else:
            driveStateParam = DriveState.CONTAINER_ERROR

    return driveStateParam


def main():
    gpio19Green = onionGpio3.OnionGpio(19)
    gpio18Red = onionGpio3.OnionGpio(18)

    # turn on the green gpio, show its on
    gpio19Green.setOutputDirection(1)

    # turn off the red gpio
    gpio18Red.setOutputDirection(0)

    currentDriveState = DriveState.NO_USB_DRIVE

    mountWaitTimerSeconds = -1

    while True:

        currentDriveState = checkDriveState(currentDriveState)

        driveStatePath = '/tmp/driveState.txt'
        driveStateFile = open(driveStatePath, 'w')

        driveStateFile.write(currentDriveState.name)

        if currentDriveState == DriveState.CONTAINER_ERROR or currentDriveState == DriveState.NO_CONTAINER_PASSWORD:
            gpio18Red.setOutputDirection(1)
        else:

            if currentDriveState == DriveState.NO_CONTAINER and mountWaitTimerSeconds == -1:
                mountWaitTimerSeconds = 0
            elif currentDriveState != DriveState.NO_CONTAINER and mountWaitTimerSeconds != -1:
                mountWaitTimerSeconds = -1
            elif currentDriveState == DriveState.NO_CONTAINER and mountWaitTimerSeconds != -1:
                mountWaitTimerSeconds = mountWaitTimerSeconds + 1

            if currentDriveState == DriveState.CONTAINER_MOUNTED:
                if os.path.exists("/root/syncthing"):
                    procs = subprocess.run(['ps'], stdout=subprocess.PIPE, universal_newlines=True)
                    if "syncthing" not in procs.stdout:
                        # syncthing bin is there but not running start it up
                        subprocess.run(syncthingCommand, shell=True)

            if currentDriveState == DriveState.NO_CONTAINER and mountWaitTimerSeconds > containerMountTimeLimitSeconds:
                gpio18Red.setOutputDirection(1)
            else:
                gpio18Red.setOutputDirection(0)

        time.sleep(1)


if __name__ == "__main__":
    main()
