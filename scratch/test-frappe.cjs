const axios = require('axios');

const FRAPPE_URL = 'https://admin.dreamtechsolution.com/api/resource';
const FRAPPE_TOKEN = 'token f069923bef04378:a34779c3b22868f';
const headers = {
  'Authorization': FRAPPE_TOKEN,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

async function test() {
  try {
    const response = await axios.post(`${FRAPPE_URL}/ATS Attendance`, {
      employeeid: "Aswin",
      checkintime: new Date().toISOString(),
      gpslocation: "34.0522, -118.2437",
      date: new Date().toISOString().split("T")[0],
      status: "Checked In",
      workinghours: 0
    }, { headers });
    console.log("Success:", response.status, response.data);
  } catch (err) {
    console.log("Error status:", err.response?.status);
    console.log("Error data:", err.response?.data);
    console.log("Error stringified:", JSON.stringify(err.response?.data));
  }
}
test();
