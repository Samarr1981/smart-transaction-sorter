import { config } from 'dotenv';
import { resolve } from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

// User Schema (inline to avoid import issues)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seedDemoUser() {
  try {
    console.log("🔄 Checking environment variables...");
    
    if (!process.env.MONGODB_URI) {
      console.error("❌ MONGODB_URI not found!");
      console.log("💡 Make sure .env.local exists in project root");
      process.exit(1);
    }

    console.log("✅ MONGODB_URI found");
    console.log("🔄 Connecting to database...");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Check if demo user already exists
    const existingUser = await User.findOne({ email: "demo@finflow.com" });
    
    if (existingUser) {
      console.log("\n⚠️  Demo user already exists!");
      console.log("📧 Email: demo@finflow.com");
      console.log("🔑 Password: demo123");
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log("🔄 Creating demo user...");

    // Hash the password
    const hashedPassword = await bcrypt.hash("demo123", 10);

    // Create demo user
    const demoUser = await User.create({
      name: "Demo User",
      email: "demo@finflow.com",
      password: hashedPassword,
    });

    console.log("\n✅ Demo user created successfully!");
    console.log("📧 Email: demo@finflow.com");
    console.log("🔑 Password: demo123");
    console.log("🆔 User ID:", demoUser._id);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDemoUser();