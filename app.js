// app.js

const express = require('express');
const path = require('path');
const ZKLib = require('node-zklib');
const { Attendance, sequelize } = require('./models/attendance');
const ExcelJS = require('exceljs');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));

// Function to fetch attendance data from the device
async function fetchAttendanceData() {
  // Replace with your device IP and port
  const ip = '10.0.0.112';
  const port = 4370;

  const zkInstance = new ZKLib(ip, port, 10000, 4000);

  try {
    // Create socket to machine
    await zkInstance.createSocket();

    // Get general info like logCapacity, user counts, etc.
    const generalInfo = await zkInstance.getInfo();
    console.log('General Info:', generalInfo);

    // Get users
    const users = await zkInstance.getUsers();

    // Create a mapping of user PIN to name
    const userMap = {};
    users.data.forEach(user => {
      userMap[user.uid] = user.name || 'Unknown';
    });

    // Get attendance logs
    const logs = await zkInstance.getAttendances();

    // Save logs to the database
    for (const log of logs.data) {
      // Check if the record already exists
      const [record, created] = await Attendance.findOrCreate({
        where: {
          userId: log.uid.toString(),
          timestamp: log.timestamp,
        },
        defaults: {
          name: userMap[log.uid.toString()] || 'Unknown',
        },
      });

      if (created) {
        console.log(`Attendance record added for user ${log.uid}`);
      }
    }

    // Disconnect from the device
    await zkInstance.disconnect();

  } catch (error) {
    console.error('Error fetching attendance data:', error);
  }
}

// Schedule the function to run periodically
setInterval(fetchAttendanceData, 10 * 60 * 1000); // Every 10 minutes

// Optionally, fetch attendance data when the server starts
fetchAttendanceData();

// Routes
app.get('/', async (req, res) => {
  const filter = req.query.filter || 'today';
  let startDate, endDate;

  const today = new Date();

  switch (filter) {
    case 'today':
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
      break;
    case 'week':
      const startOfWeek = today.getDate() - today.getDay();
      startDate = new Date(today.setDate(startOfWeek));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.setDate(startOfWeek + 6));
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'all':
    default:
      startDate = new Date(0); // Unix epoch
      endDate = new Date(); // Now
  }

  const records = await Attendance.findAll({
    where: {
      timestamp: {
        [sequelize.Op.between]: [startDate, endDate],
      },
    },
  });

  res.render('index', { records, filter });
});

app.get('/export', async (req, res) => {
  const filter = req.query.filter || 'today';
  let startDate, endDate;

  const today = new Date();

  switch (filter) {
    case 'today':
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
      break;
    case 'week':
      const startOfWeek = today.getDate() - today.getDay();
      startDate = new Date(today.setDate(startOfWeek));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today.setDate(startOfWeek + 6));
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'all':
    default:
      startDate = new Date(0); // Unix epoch
      endDate = new Date(); // Now
  }

  const records = await Attendance.findAll({
    where: {
      timestamp: {
        [sequelize.Op.between]: [startDate, endDate],
      },
    },
  });

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Add columns
  worksheet.columns = [
    { header: 'User ID', key: 'userId' },
    { header: 'Name', key: 'name' },
    { header: 'Timestamp', key: 'timestamp' },
  ];

  // Add rows
  records.forEach(record => {
    worksheet.addRow({
      userId: record.userId,
      name: record.name,
      timestamp: record.timestamp,
    });
  });

  // Write to a buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Set headers and send the file
  res.setHeader('Content-Disposition', `attachment; filename=attendance_${filter}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});