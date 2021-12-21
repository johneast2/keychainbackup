import os
from enum import Enum
import time
import subprocess
from subprocess import Popen, PIPE

class DriveState(Enum):
    NO_USB_DRIVE = 1
    USB_DRIVE_MOUNTED = 2
    NO_CONTAINER = 3
    COUNTAINER_MOUNTED = 4
    CONTAINER_ERROR = 5
    NO_CONTAINER_PASSWORD = 6

def main():

    passwordFile = "/root/containerPassword.txt"
    containerFile = "/mnt/sda1/container.bin"
    currentDriveState = DriveState.NO_USB_DRIVE

    while True:
        if not os.path.isfile(containerFile):
            currentDriveState = DriveState.NO_CONTAINER
        if not os.path.isfile(passwordFile):
            currentDriveState = DriveState.NO_CONTAINER_PASSWORD
        if currentDriveState == DriveState.NO_USB_DRIVE and os.path.isdir("/mnt/sda1"):
            currentDriveState = DriveState.USB_DRIVE_MOUNTED
        if currentDriveState == DriveState.USB_DRIVE_MOUNTED and not os.path.isfile(containerFile):
            currentDriveState = DriveState.NO_CONTAINER
        if currentDriveState == DriveState.USB_DRIVE_MOUNTED and os.path.isfile(containerFile):
            #get the password
            containerPassword = ""
            with open(passwordFile) as passwordFileHandle:
                containerPassword = passwordFileHandle.readline().rstrip()

            #attempt to mount the container
            process = subprocess.run("mkdir /tmp/container", shell=True)

            process = Popen(["cryptsetup", "luksOpen", containerFile, "container"], stdin=PIPE)
            process.communicate((containerPassword + "\n").encode("ascii"))
            process.wait()

            process = subprocess.run("mount /dev/mapper/container /tmp/container/", shell=True)

            currentDriveState = DriveState.COUNTAINER_MOUNTED

        if currentDriveState != DriveState.NO_USB_DRIVE and not os.path.isdir("/mnt/sda1"):
            currentDriveState = DriveState.NO_USB_DRIVE

        driveStatePath = '/tmp/driveState.txt'
        driveStateFile = open(driveStatePath, 'w')

        driveStateFile.write(currentDriveState.name)

        time.sleep(1)


if __name__ == "__main__":
    main()
