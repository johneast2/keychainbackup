import os
from enum import Enum
import time
import subprocess
from subprocess import Popen, PIPE

passwordFile = "/root/containerPassword.txt"
containerFile = "/mnt/sda1/container.bin"

class DriveState(Enum):
    NO_USB_DRIVE = 1
    USB_DRIVE_MOUNTED = 2
    NO_CONTAINER = 3
    CONTAINER_MOUNTED = 4
    CONTAINER_ERROR = 5
    NO_CONTAINER_PASSWORD = 6

def checkDriveState(driveStateParam):

    if not os.path.isfile(passwordFile):
        return DriveState.NO_CONTAINER_PASSWORD

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

    if driveStateParam == DriveState.USB_DRIVE_MOUNTED and os.path.isfile(containerFile):
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
        mountCheckResult = ''

        mountCheckResult = subprocess.run(['mount'], stdout=subprocess.PIPE, universal_newlines=True)
        print(mountCheckResult)

        if "container" in mountCheckResult.stdout:
            driveStateParam = DriveState.CONTAINER_MOUNTED
            process = subprocess.run("dropbear -P /var/run/dropbear2.pid -p 2222 -K 300 -T 3", shell=True)

        else:
            driveStateParam = DriveState.CONTAINER_ERROR

    return driveStateParam


def main():
    currentDriveState = DriveState.NO_USB_DRIVE

    while True:

        currentDriveState = checkDriveState(currentDriveState)

        driveStatePath = '/tmp/driveState.txt'
        driveStateFile = open(driveStatePath, 'w')

        driveStateFile.write(currentDriveState.name)

        time.sleep(1)


if __name__ == "__main__":
    main()
