const { io } = require("socket.io-client");
const socket = io("http://localhost:3001");
socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("patient:add", {
    eventId: "test-" + Date.now(),
    name: "Test Patient",
    age: 30,
    consultationType: "general",
    priority: "normal"
  }, (res) => {
    console.log("ACK:", JSON.stringify(res));
    socket.disconnect();
    process.exit(0);
  });
});
socket.on("connect_error", (e) => { console.error("Error:", e.message); process.exit(1); });
setTimeout(() => { console.log("Timeout"); process.exit(1); }, 5000);
