const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");
const { Client } = require('ssh2');
const { readFileSync } = require('fs');

// Season enums can be grouped as static members of a class
class SetupState {
  // Create new instances of the same class as static attributes
  static ChangePassword = new SetupState("changepassword")
  static Connecting = new SetupState("connecting")
  static Connected = new SetupState("connected")
  static UploadingZip = new SetupState("uploadingzip")
  static UploadedZip = new SetupState("uploadedzip")
  static ExtractedZip = new SetupState("extractedzip")
  static WaitingForReboot = new SetupState("watitingforreboot")
  static RunPart2 = new SetupState("runpart2")
  static CheckDriveMounted = new SetupState("checkdrivemounted")
  static HideSSID = new SetupState("hidessid")
  static Finished = new SetupState("finished")
  static FailedToMount = new SetupState("failedtomount")
  static ConnectionError = new SetupState("connectionerror")

  constructor(name) {
    this.name = name
  }
}

var mainWindow;

var currentSetupState;

var clientConnection;

var clientIpAddress;
var encPassword;
var sshPassword = "";
var currentSshPassword = 'onioneer';
var hideSsid = true;

const loadMainWindow = () => {
    mainWindow = new BrowserWindow({
        width : 800,
        height: 600,
        webPreferences: {
		nodeIntegration: true,
		contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.on("ready", loadMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on('quit-app', (event, args) => {
  app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

ipcMain.on('setupDevice', (event, args) => {
	console.log("clicked on setupDevice");


	// validate ip address
        var validIpAddress = false;
	var validEncPassword = false;

        var ipAddressString = args["octetA"] + '.' + args["octetB"] + '.' + args["octetC"] + '.' + args["octetD"];

        console.log("checking ip address... " + ipAddressString);

	if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipAddressString))
	{
		validIpAddress = true;
		console.log("ip address looks valid")
	}
	else {
		console.log("ip address is NOT valid")
	}

	// check for empty encrypted volume password
	if (args["encPassword"].length != 0)
	{
		validEncPassword = true;
		console.log("enc password is valid")
	}
	else
	{
		console.log("enc password is NOT valid")
	}

	var result = {};

	result["validIpAddress"] = validIpAddress;
	result["validEncPassword"] = validEncPassword;

	event.returnValue = result;


	if (!validIpAddress || !validEncPassword) {
		return;
	}

	if (args["sshPassword"].length != 0) {
		currentSetupState = SetupState.ChangePassword;
		sshPassword = args["sshPassword"];
	}
	else {
		currentSetupState = SetupState.Connecting;
	}

	clientIpAddress = ipAddressString;
	encPassword = args["encPassword"];

	if (args["currentPassword"].length !== 0) {
		currentSshPassword = args["currentPassword"];
	}

	if (args["hideSsid"] === false) {
		console.log("NOT hiding omega2 ap ssid!");
		hideSsid = false;
	}

	setTimeout(handleClientSetup, 100);
});


function handleClientSetup() {

	if (currentSetupState === SetupState.ChangePassword) {
		mainWindow.webContents.send('async-status','Setting new password...');

		clientConnection = new Client();

		clientConnection.on('ready', () => {
		  console.log('ssh Client is ready to change password');

			clientConnection.exec('yes ' + sshPassword + ' | passwd root', (err, stream) => {
			    if (err) {
				console.log('SSH - Connection Error: ' + err);
			  	currentSetupState = SetupState.ConnectionError;
				mainWindow.webContents.send('async-error','SSH connection error!');
			    }
			    stream.on('close', (code, signal) => {
			      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
				
			    }).on('data', (data) => {
			      console.log('STDOUT: ' + data);
			    }).stderr.on('data', (data) => {
			      console.log('STDERR: ' + data);
				if (data.includes('password for root changed by root'))
				{
					mainWindow.webContents.send('async-status','Updated Password');
					mainWindow.webContents.send('async-progress', 10);
					clientConnection.end();
					currentSetupState = SetupState.Connecting;
					setTimeout(handleClientSetup, 1000);
				}
			    });
			  });

		});

		clientConnection.on('error', function(err) {
		  console.log('SSH - Connection Error: ' + err);
		  currentSetupState = SetupState.ConnectionError;
		  mainWindow.webContents.send('async-error','SSH connection error! Please verify that the ssh password is correct!');
		  setTimeout(handleClientSetup, 100);
		});

		clientConnection.connect({
		  host: clientIpAddress,
		  port: 22,
		  username: 'root',
		  password: currentSshPassword
		});

	}

	if (currentSetupState === SetupState.Connecting) {

		if (sshPassword.length === 0) {
			sshPassword = currentSshPassword;
		}		
	
		mainWindow.webContents.send('async-status','Connecting...');

		clientConnection = new Client();

		clientConnection.on('ready', () => {
		  console.log('ssh Client is ready');
			currentSetupState = SetupState.Connected;

			mainWindow.webContents.send('async-status','Connected to Omega, checking for usb drive...');
			mainWindow.webContents.send('async-progress', 20);

			clientConnection.exec('dmesg | grep "sda] Atta"', (err, stream) => {
			    if (err) {
				console.log('SSH - Connection Error: ' + err);
			  	currentSetupState = SetupState.ConnectionError;
				mainWindow.webContents.send('async-error','SSH connection error!');
			    }
			    stream.on('close', (code, signal) => {
			      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
				
			    }).on('data', (data) => {
			      console.log('STDOUT: ' + data);
			      if (data.includes('[sda] Attached SCSI removable disk'))
				{
					currentSetupState = SetupState.Connected;
					mainWindow.webContents.send('async-status','usb drive found, uploading setup files...');
					mainWindow.webContents.send('async-progress', 20);
					setTimeout(handleClientSetup, 100);
				}
			       else 
				{
					console.log("usb drive not found trying again");
					mainWindow.webContents.send('async-status','usb drive NOT found, please make sure USB drive is inserted.');
					setTimeout(handleClientSetup, 5000);
				}
			    }).stderr.on('data', (data) => {
			      console.log('STDERR: ' + data);
			    });
			  });

		});

		clientConnection.on('error', function(err) {
		  console.log('SSH - Connection Error: ' + err);
		  currentSetupState = SetupState.ConnectionError;
		  mainWindow.webContents.send('async-error','SSH connection error! Please verify that the ssh password is correct!');
		  setTimeout(handleClientSetup, 100);
		});

		clientConnection.connect({
		  host: clientIpAddress,
		  port: 22,
		  username: 'root',
		  password: sshPassword
		});
	}
	if (currentSetupState === SetupState.Connected) {

			clientConnection.sftp((err, sftp) => {
			    if (err) throw err;
				sftp.fastPut('setupFiles.tar.xz', '/tmp/setupFiles.tar.xz', function(err) {
				if (err)
				{
			   		console.log('sftp - Upload error: ' + err);
					currentSetupState = SetupState.ConnectionError;
					mainWindow.webContents.send('async-error','SSH connection error!');
				}
				else
				{
					currentSetupState = SetupState.UploadedZip
					mainWindow.webContents.send('async-status','Setup files uploaded, Extracting...');
					mainWindow.webContents.send('async-progress', 40);
				}

				setTimeout(handleClientSetup, 100);
			  });
			});
	}
	else if (currentSetupState === SetupState.UploadedZip)
	{
		clientConnection.exec('rm -rf /root/tempsetupfiles && mkdir /root/tempsetupfiles && mv /tmp/setupFiles.tar.xz /root/tempsetupfiles && cd /root/tempsetupfiles && tar -xvf /root/tempsetupfiles/setupFiles.tar.xz', (err, stream) => {
		    if (err) {
			console.log('SSH - Connection Error: ' + err);
		  	currentSetupState = SetupState.ConnectionError;
			mainWindow.webContents.send('async-error','SSH connection error!');
		    }
		    stream.on('close', (code, signal) => {
		      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
			currentSetupState = SetupState.ExtractedZip;
			mainWindow.webContents.send('async-status','Setup files extracted, executing first setup script...');
			setTimeout(handleClientSetup, 100);
			mainWindow.webContents.send('async-progress', 50);
		    }).on('data', (data) => {
		      console.log('STDOUT: ' + data);
		    }).stderr.on('data', (data) => {
		      console.log('STDERR: ' + data);
		    });
		  });
	}
	else if (currentSetupState === SetupState.ExtractedZip)
	{
		// run first shell script
		clientConnection.exec('cd /root/tempsetupfiles && sh setupkey_pt1.sh', (err, stream) => {
		    if (err) {
			console.log('SSH - Connection Error: ' + err);
		  	currentSetupState = SetupState.ConnectionError;
			mainWindow.webContents.send('async-error','SSH connection error!');
		    }
		    stream.on('close', (code, signal) => {
		      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
			currentSetupState = SetupState.WaitingForReboot;
			mainWindow.webContents.send('async-status','First setup script finished, rebooting omega...');
			clientConnection.end();
			mainWindow.webContents.send('async-progress', 60);
			setTimeout(handleClientSetup, 10000);
		    }).on('data', (data) => {
		      console.log('STDOUT: ' + data);
		    }).stderr.on('data', (data) => {
		      console.log('STDERR: ' + data);
		    });
		  });
	}
	else if (currentSetupState === SetupState.WaitingForReboot)
	{
		clientConnection = new Client();

		clientConnection.on('ready', () => {
		  	console.log('ssh Client is ready after reboot');
			mainWindow.webContents.send('async-status','Connected after omega reboot, running second setup script...');
			mainWindow.webContents.send('async-progress', 70);
			// run second shell script
			clientConnection.exec('touch /root/containerPassword.txt && printf ' + encPassword + ' > /root/containerPassword.txt && python3 /root/tempsetupfiles/setupkey_pt2.py', (err, stream) => {
			    if (err) {
				console.log('SSH - Connection Error: ' + err);
		  		currentSetupState = SetupState.ConnectionError;
				mainWindow.webContents.send('async-error','SSH connection error!');
			    }
			    stream.on('close', (code, signal) => {
			      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
				currentSetupState = SetupState.CheckDriveMounted;
				mainWindow.webContents.send('async-status','Second setup script finished, checking that drive mounted successfully...');
				setTimeout(handleClientSetup, 100);
				mainWindow.webContents.send('async-progress', 90);
			    }).on('data', (data) => {
			      console.log('STDOUT: ' + data);
			    }).stderr.on('data', (data) => {
			      console.log('STDERR: ' + data);
			    });
			  });
		  });

		clientConnection.on('error', function(err) {
		  console.log('SSH - Waiting for reboot: ' + err);
		  // don't go to error state here, expect errors while waiting for omega to reboot
		  setTimeout(handleClientSetup, 1000);
		});

		clientConnection.connect({
		  host: clientIpAddress,
		  port: 22,
		  username: 'root',
		  password: sshPassword
		});
	}
	else if (currentSetupState === SetupState.CheckDriveMounted)
	{
		clientConnection.exec('mount | grep container', (err, stream) => {
			    if (err) {
				console.log('SSH - Connection Error: ' + err);
			  	currentSetupState = SetupState.ConnectionError;
				mainWindow.webContents.send('async-error','SSH Connection Error!');
			    }
			    stream.on('close', (code, signal) => {
			      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
			    }).on('data', (data) => {
			      console.log('STDOUT: ' + data);
				if (data.includes('/dev/mapper/container on /tmp/container type ext4'))
				{
					console.log("found mounted container!!, checking to hide ssid");
					currentSetupState = SetupState.HideSSID;
					setTimeout(handleClientSetup, 100);
					mainWindow.webContents.send('async-progress', 95);
				}
				else
				{
					console.log("failed to mount container!!");
					currentSetupState = SetupState.FailedToMount;
					mainWindow.webContents.send('async-status','Drive Failed to mount successfully... :(');
				}
			    }).stderr.on('data', (data) => {
			      console.log('STDERR: ' + data);
			    });
			  });
	}

	else if (currentSetupState === SetupState.HideSSID)
	{
		if (hideSsid === true)
		{
			clientConnection.exec('uci set wireless.radio0.hidden=1 && uci set wireless.ap.hidden=1 && uci commit && uci show | grep hidden | wc -l', (err, stream) => {
			    if (err) {
				console.log('SSH - Connection Error: ' + err);
			  	currentSetupState = SetupState.ConnectionError;
				mainWindow.webContents.send('async-error','SSH Connection Error!');
			    }
			    stream.on('close', (code, signal) => {
			      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
			    }).on('data', (data) => {
			      console.log('STDOUT: ' + data);
				if (data.includes('2'))
				{
					console.log("ssid is hidden");
					currentSetupState = SetupState.Finished;
					mainWindow.webContents.send('async-finished','Drive mounted successfully, setup is finished!');
					mainWindow.webContents.send('async-progress', 100);
				}
			    }).stderr.on('data', (data) => {
			      console.log('STDERR: ' + data);
			    });
			  });
		}
		else
		{
			currentSetupState = SetupState.Finished;
			mainWindow.webContents.send('async-finished','Drive mounted successfully, setup is finished!');
			mainWindow.webContents.send('async-progress', 100);
		}
	}
}

