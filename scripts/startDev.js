const { execSync } = require("child_process");
const { spawn } = require("child_process");

// Function to start MongoDB
function startMongoDB() {
  try {
    console.log("Starting MongoDB...");
    execSync("brew services start mongodb-community", { stdio: "inherit" });
    console.log("MongoDB started successfully");
  } catch (error) {
    console.error("Error starting MongoDB:", error.message);
    process.exit(1);
  }
}

// Function to stop MongoDB
function stopMongoDB() {
  try {
    console.log("Stopping MongoDB...");
    execSync("brew services stop mongodb-community", { stdio: "inherit" });
    console.log("MongoDB stopped successfully");
  } catch (error) {
    console.error("Error stopping MongoDB:", error.message);
  }
}

// Start MongoDB
startMongoDB();

// Start your application
const app = spawn("env-cmd", ["-f", "./dev.env", "nodemon", "src/index.js"], {
  stdio: "inherit",
  shell: true,
});

// Handle application exit
process.on("SIGINT", () => {
  console.log("\nStopping application...");
  app.kill();
  stopMongoDB();
  process.exit();
});

process.on("SIGTERM", () => {
  console.log("\nStopping application...");
  app.kill();
  stopMongoDB();
  process.exit();
});

// Handle application errors
app.on("error", (error) => {
  console.error("Application error:", error);
  stopMongoDB();
  process.exit(1);
});
