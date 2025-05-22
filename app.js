// Khai báo các thư viên
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const socketIo = require('socket.io');
const serviceAccount = require("./serviceAccountKey.json");
const http = require('http');
// Khởi tạo express và socketIo
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
// Kết nối firebasefirebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://iot-clock-6314a-default-rtdb.asia-southeast1.firebasedatabase.app"});
const db = admin.database();
// Thiết lập EJS và file tĩnh
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, 'views'));
app.use(express.static("photo"));
// Lấy thời gian từ sever và lặp lại mỗi 30 giây
let cachedTimeData = null;
async function updateTimeData() {
  try {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const date = `${day}-${month}-${year}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;
    const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const weekday = daysOfWeek[now.getDay()]; 
    cachedTimeData = { date, time, weekday };
    const ref = db.ref("Today");
    await ref.set({
      Weekday: weekday,
      Date: date,
      Time: time,});
    console.log(`Đã cập nhật Firebase: ${weekday}, ${date} - ${time}`);
  } catch (err) {
    console.error("Lỗi time từ server:", err);}}
updateTimeData();
setInterval(updateTimeData, 30000);
// Đường dẫn website 
app.get('/', async (req, res) => {
  res.render('index');
});
app.get('/ok', (req, res) => {
    res.render('ok',{"name": "Bùi Quang Minh"});
});
// Lấy dữ liệu từ Firebase 
db.ref("/Today").on('value', snapshot => {
    const today = snapshot.val();
    const weekday = today.Weekday;
    const date = today.Date;
    const time = today.Time;
    console.log('Data from Firebase:', { weekday, date, time });
    io.emit('today', { weekday,date, time });});

db.ref("/Led").on('value', snapshot => {
    const led = snapshot.val();
    const led_00 = led[0];
    const led_01 = led[1];
    const led_02 = led[2];
    const led_03 = led[3];
    const led_04 = led[4];
    // console.log('Data from Firebase:', { led_00, led_01, led_02, led_03, led_04});
    io.emit('led', { led_00, led_01, led_02, led_03, led_04});
});
db.ref("/DHT22").on('value', snapshot => {
    const temp = snapshot.val();
    // console.log('Data from Firebase:', { temp});
    io.emit('temp', { temp});
});
// io.on('connection', (socket) => {
//   console.log('Client connected:', socket.id);
//   socket.onAny((eventName, ...args) => {
//     const m = eventName.match(/^(On|Off)Led_(\d{2})$/);
//     if (!m) return;   
//     const [ , action, idx ] = m;
//     const dbKey    = `LED_${idx}`;          
//     const newState = (action === 'On') ? on : off; 
//      console.log(`=> ${dbKey} set to ${newState}`);
//     // Cập nhật lên Firebase
//     // ref.update({ [dbKey]: newState })
//     //    .then(() => {
//     //      console.log(`=> ${dbKey} set to ${newState}`);
//     //      io.emit('led', { [dbKey]: newState });
//     //    })
//     //    .catch(err => console.error(err));
//   });
// });
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
// app.get('/temp', async (req, res) => {
//    const snapshot = await db.ref('/DHT22/TEMP').once('value');
//    const temp = snapshot.val();
//     res.json({ temp });
// });
// app.get('/clock', async (req, res) => {
//    db.ref("/Today").once("value", function(snapshot) { 
//     var today = snapshot.val();res.json({ today }); })
// });
// app.get('/led', async (req, res) => {
//    db.ref("/Led").once("value", function(snapshot) { 
//     var led = snapshot.val();res.json({ led }); })
// });
// app.use(express.json());               // parse application/json
// app.use(express.urlencoded({ extended: true })); // nếu bạn dùng form-url-encoded
// app.post('/led', (req, res) => {
//   const btnNumber = req.body.btnNumber;
//   const status = req.body.status;
//   db.ref("Led/").update({ [btnNumber]: status })
//     .then(() => {
//       res.json({ message: `LED ${btnNumber} đã cập nhật thành ${status}` });
//     });
// });

