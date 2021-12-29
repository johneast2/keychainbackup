const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");
const { Client } = require('ssh2');
const { readFileSync } = require('fs');

// Season enums can be grouped as static members of a class
class SetupState {
  // Create new instances of the same class as static attributes
  static Connecting = new SetupState("connecting")
  static Connected = new SetupState("connected")
  static UploadingZip = new SetupState("uploadingzip")
  static UploadedZip = new SetupState("uploadedzip")
  static ExtractedZip = new SetupState("extractedzip")
  static WaitingForReboot = new SetupState("watitingforreboot")
  static RunPart2 = new SetupState("runpart2")
  static CheckDriveMounted = new SetupState("checkdrivemounted")
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

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

ipcMain.on('setupDevice', (event, args) => {
	console.log("clicked on setupDevice");
        console.log(args);


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

	currentSetupState = SetupState.Connecting;
	clientIpAddress = ipAddressString;
	encPassword = args["encPassword"];

	setTimeout(handleClientSetup, 100);
});


function handleClientSetup() {

	if (currentSetupState === SetupState.Connecting) {
		mainWindow.webContents.send('async-status','Connecting...');

		clientConnection = new Client();

		clientConnection.on('ready', () => {
		  console.log('ssh Client is ready');
			currentSetupState = SetupState.Connected;

			mainWindow.webContents.send('async-status','Connected to Omega, uploading setup files...');

			clientConnection.sftp((err, sftp) => {
			    if (err) throw err;
				sftp.fastPut('setupFiles.tar.xz', '/tmp/setupFiles.tar.xz', function(err) {
				if (err)
				{
			   		console.log('sftp - Upload error: ' + err);
					currentSetupState = SetupState.ConnectionError;
					mainWindow.webContents.send('async-status','SSH connection error!');
				}
				else
				{
					currentSetupState = SetupState.UploadedZip
					mainWindow.webContents.send('async-status','Setup files uploaded, Extracting...');
				}

				setTimeout(handleClientSetup, 100);
			  });


			});
		  });

		clientConnection.on('error', function(err) {
		  console.log('SSH - Connection Error: ' + err);
		  currentSetupState = SetupState.ConnectionError;
		  mainWindow.webContents.send('async-status','SSH connection error!');
		  setTimeout(handleClientSetup, 100);
		});

		clientConnection.connect({
		  host: clientIpAddress,
		  port: 22,
		  username: 'root',
		  password: 'onioneer'
		});
	}
	else if (currentSetupState === SetupState.UploadedZip)
	{
		clientConnection.exec('rm -rf /root/tempsetupfiles && mkdir /root/tempsetupfiles && mv /tmp/setupFiles.tar.xz /root/tempsetupfiles && cd /root/tempsetupfiles && tar -xvf /root/tempsetupfiles/setupFiles.tar.xz', (err, stream) => {
		    if (err) {
			console.log('SSH - Connection Error: ' + err);
		  	currentSetupState = SetupState.ConnectionError;
			mainWindow.webContents.send('async-status','SSH connection error!');
		    }
		    stream.on('close', (code, signal) => {
		      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
			currentSetupState = SetupState.ExtractedZip;
			mainWindow.webContents.send('async-status','Setup files extracted, executing first setup script...');
			setTimeout(handleClientSetup, 100);
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
			mainWindow.webContents.send('async-status','SSH connection error!');
		    }
		    stream.on('close', (code, signal) => {
		      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
			currentSetupState = SetupState.WaitingForReboot;
			mainWindow.webContents.send('async-status','First setup script finished, rebooting omega...');
			clientConnection.end();
			setTimeout(handleClientSetup, 100);
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
			// run second shell script
			clientConnection.exec('touch /root/containerPassword.txt && printf ' + encPassword + ' > /root/containerPassword.txt && python3 /root/tempsetupfiles/setupkey_pt2.py', (err, stream) => {
			    if (err) {
				console.log('SSH - Waiting for reboot: ' + err);
			  	currentSetupState = SetupState.ConnectionError;
			    }
			    stream.on('close', (code, signal) => {
			      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
				currentSetupState = SetupState.CheckDriveMounted;
				mainWindow.webContents.send('async-status','Second setup script finished, checking that drive mounted successfully...');
				setTimeout(handleClientSetup, 100);
			    }).on('data', (data) => {
			      console.log('STDOUT: ' + data);
			    }).stderr.on('data', (data) => {
			      console.log('STDERR: ' + data);
			    });
			  });
		  });

		clientConnection.on('error', function(err) {
		  console.log('SSH - Connection Error: ' + err);
		  mainWindow.webContents.send('async-status','SSH Connection Error!');
		  setTimeout(handleClientSetup, 1000);
		});

		clientConnection.connect({
		  host: clientIpAddress,
		  port: 22,
		  username: 'root',
		  password: 'onioneer'
		});
	}
	else if (currentSetupState === SetupState.CheckDriveMounted)
	{
		clientConnection.exec('mount | grep container', (err, stream) => {
			    if (err) {
				console.log('SSH - Connection Error: ' + err);
			  	currentSetupState = SetupState.ConnectionError;
				mainWindow.webContents.send('async-status','SSH Connection Error!');
			    }
			    stream.on('close', (code, signal) => {
			      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
			    }).on('data', (data) => {
			      console.log('AAAAAAaSTDOUT: ' + data);
				if (data.includes('/dev/mapper/container on /tmp/container type ext4'))
				{
					console.log("found mounted container!!");
					currentSetupState = SetupState.Finished;
					mainWindow.webContents.send('async-status','Drive mounted successfully, setup is finished!');
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
}

