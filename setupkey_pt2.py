import os
import time
import subprocess
from subprocess import Popen, PIPE
import sys, getopt

passwordFile = "/root/containerPassword.txt"

def main(argv):

    try:
        opts, args = getopt.getopt(argv,"s")
    except getopt.GetoptError:
        print ('setupkey_pt2.py optional: -s')
        sys.exit(2)

    for opt, arg in opts:
        if opt == '-s':
            print("installing syncthing...")
            process = subprocess.run("mv /root/tempsetupfiles/syncthing /root/ && chmod +x /root/syncthing", shell=True)

    process = subprocess.run("umount /dev/sda1", shell=True)

    process = subprocess.run("mkfs.ext4 -F /dev/sda1", shell=True)

    process = subprocess.run("mkdir /tmp/usb", shell=True)

    process = subprocess.run("mount /dev/sda1 /tmp/usb", shell=True)

    diskspace = subprocess.getoutput("df | grep sda | awk '{print $4}'")
    print("diskspace: " + diskspace)

    process = subprocess.run("dd if=/dev/zero of=/tmp/usb/container.bin bs=1 count=0 seek=" + diskspace + "k", shell=True)

    with open(passwordFile) as passwordFileHandle:
        containerPassword = passwordFileHandle.readline().rstrip()

    process = subprocess.run("mkdir /tmp/container", shell=True)

    process = Popen(["cryptsetup", "-q", "luksFormat", "/tmp/usb/container.bin", ], stdin=PIPE)
    process.communicate((containerPassword + "\n").encode("ascii"))
    process.wait()

    process = Popen(["cryptsetup", "luksOpen", "/tmp/usb/container.bin", "container"], stdin=PIPE)
    process.communicate((containerPassword + "\n").encode("ascii"))
    process.wait()

    process = subprocess.run("mkfs.ext4 /dev/mapper/container", shell=True)

    process = subprocess.run("mount /dev/mapper/container /tmp/container", shell=True)

    process = subprocess.run("cp /root/tempsetupfiles/driveMonitor.py /root/", shell=True)

    process = subprocess.run("cp /root/tempsetupfiles/onionGpio3.py /root/", shell=True)

    process = subprocess.run("cp /root/tempsetupfiles/rc.local /etc/rc.local", shell=True)

    process = subprocess.run("python3 /root/driveMonitor.py &", shell=True)

    process = subprocess.run("rm -rf /root/tempsetupfiles", shell=True)

if __name__ == "__main__":
    main(sys.argv[1:])
