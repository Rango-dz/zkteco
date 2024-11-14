// service.js

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'ZKTecoNodeApp',
  description: 'Node.js application for ZKTeco attendance system',
  script: path.join(__dirname, 'app.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096' // Optional: Increase memory limit if necessary
  ],
});

// Listen for the "install" event, which indicates the service is installed
svc.on('install', function() {
  svc.start();
  console.log('Service installed and started');
});

// Install the service
svc.install();