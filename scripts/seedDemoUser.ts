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

// Transaction Schema (inline, mirrors src/models/Transaction.ts)
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: String, required: true },
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// ~3 months (2026-05-01 to 2026-07-30) across all 12 categories.
// Food & Drink carries 11 ordinary charges + 1 outlier (164.75) so the
// dashboard's p90-per-category anomaly check has enough data points in one
// category to actually flag something (it needs 11+ expenses in a category
// before the flagged item can rank above the 90th-percentile index).
// Netflix and Rent repeat monthly on a consistent day/amount so
// lib/recurring.ts (25-35 day average gap, same description + rounded
// amount) detects them as recurring.
// Note: the paycheck deposits are intentionally NOT picked up by the
// recurring detector - findRecurringTransactions() only ever looks at
// negative (expense) amounts, so biweekly income never qualifies. That's
// existing behavior in lib/recurring.ts, left untouched here.
const DEMO_TRANSACTIONS: Array<{ date: string; description: string; amount: string; category: string }> = [
  // Income - biweekly paycheck
  { date: '2026-05-01', description: 'PAYROLL DEPOSIT - ACME CORP', amount: '1850.00', category: 'Income' },
  { date: '2026-05-15', description: 'PAYROLL DEPOSIT - ACME CORP', amount: '1850.00', category: 'Income' },
  { date: '2026-05-29', description: 'PAYROLL DEPOSIT - ACME CORP', amount: '1850.00', category: 'Income' },
  { date: '2026-06-12', description: 'PAYROLL DEPOSIT - ACME CORP', amount: '1850.00', category: 'Income' },
  { date: '2026-06-26', description: 'PAYROLL DEPOSIT - ACME CORP', amount: '1850.00', category: 'Income' },
  { date: '2026-07-10', description: 'PAYROLL DEPOSIT - ACME CORP', amount: '1850.00', category: 'Income' },

  // Rent - monthly recurring
  { date: '2026-05-01', description: 'RENT PAYMENT - MAPLE ST APARTMENTS', amount: '-1450.00', category: 'Rent' },
  { date: '2026-06-01', description: 'RENT PAYMENT - MAPLE ST APARTMENTS', amount: '-1450.00', category: 'Rent' },
  { date: '2026-07-01', description: 'RENT PAYMENT - MAPLE ST APARTMENTS', amount: '-1450.00', category: 'Rent' },

  // Bills - monthly insurance
  { date: '2026-05-05', description: 'GEICO INSURANCE', amount: '-85.00', category: 'Bills' },
  { date: '2026-06-05', description: 'GEICO INSURANCE', amount: '-85.00', category: 'Bills' },
  { date: '2026-07-05', description: 'GEICO INSURANCE', amount: '-85.00', category: 'Bills' },

  // Utilities - monthly electric, amount varies (realistic, not perfectly recurring)
  { date: '2026-05-03', description: 'ONTARIO HYDRO ELECTRIC', amount: '-98.42', category: 'Utilities' },
  { date: '2026-06-03', description: 'ONTARIO HYDRO ELECTRIC', amount: '-112.17', category: 'Utilities' },
  { date: '2026-07-03', description: 'ONTARIO HYDRO ELECTRIC', amount: '-104.83', category: 'Utilities' },

  // Entertainment - Netflix monthly recurring + one-offs
  { date: '2026-05-08', description: 'NETFLIX.COM', amount: '-16.99', category: 'Entertainment' },
  { date: '2026-06-08', description: 'NETFLIX.COM', amount: '-16.99', category: 'Entertainment' },
  { date: '2026-07-08', description: 'NETFLIX.COM', amount: '-16.99', category: 'Entertainment' },
  { date: '2026-06-14', description: 'CINEPLEX CINEMAS', amount: '-24.50', category: 'Entertainment' },
  { date: '2026-07-19', description: 'TICKETMASTER - CONCERT', amount: '-89.00', category: 'Entertainment' },

  // Food & Drink - 11 ordinary charges + 1 deliberate outlier
  { date: '2026-05-02', description: "STARBUCKS STORE #4521", amount: '-6.75', category: 'Food & Drink' },
  { date: '2026-05-06', description: 'CHIPOTLE MEXICAN GRILL', amount: '-13.20', category: 'Food & Drink' },
  { date: '2026-05-11', description: 'TIM HORTONS', amount: '-4.85', category: 'Food & Drink' },
  { date: '2026-05-14', description: "DOMINO'S PIZZA", amount: '-22.40', category: 'Food & Drink' },
  { date: '2026-05-19', description: "STARBUCKS STORE #4521", amount: '-5.95', category: 'Food & Drink' },
  { date: '2026-05-24', description: "MCDONALD'S", amount: '-9.10', category: 'Food & Drink' },
  { date: '2026-06-02', description: 'SUSHI SHOP', amount: '-18.75', category: 'Food & Drink' },
  { date: '2026-06-09', description: "STARBUCKS STORE #4521", amount: '-6.40', category: 'Food & Drink' },
  { date: '2026-06-17', description: 'CHIPOTLE MEXICAN GRILL', amount: '-14.05', category: 'Food & Drink' },
  { date: '2026-06-23', description: 'TIM HORTONS', amount: '-5.20', category: 'Food & Drink' },
  { date: '2026-07-02', description: 'KFC', amount: '-11.60', category: 'Food & Drink' },
  { date: '2026-07-15', description: 'THE KEG STEAKHOUSE - ANNIVERSARY DINNER', amount: '-164.75', category: 'Food & Drink' },

  // Groceries
  { date: '2026-05-04', description: 'COSTCO WHOLESALE', amount: '-142.36', category: 'Groceries' },
  { date: '2026-05-18', description: 'LOBLAWS', amount: '-87.54', category: 'Groceries' },
  { date: '2026-06-06', description: 'NO FRILLS', amount: '-63.20', category: 'Groceries' },
  { date: '2026-06-20', description: 'COSTCO WHOLESALE', amount: '-156.88', category: 'Groceries' },
  { date: '2026-07-12', description: 'LOBLAWS', amount: '-94.11', category: 'Groceries' },

  // Shopping - includes a second, clearly-visible outlier
  { date: '2026-05-09', description: 'AMAZON.CA', amount: '-45.99', category: 'Shopping' },
  { date: '2026-05-27', description: 'WALMART', amount: '-38.20', category: 'Shopping' },
  { date: '2026-06-15', description: 'H&M CLOTHING', amount: '-72.40', category: 'Shopping' },
  { date: '2026-07-01', description: 'AMAZON.CA', amount: '-29.99', category: 'Shopping' },
  { date: '2026-07-22', description: 'BEST BUY - NEW LAPTOP', amount: '-899.00', category: 'Shopping' },

  // Transport
  { date: '2026-05-05', description: 'UBER TRIP', amount: '-14.30', category: 'Transport' },
  { date: '2026-05-16', description: 'SHELL GAS STATION', amount: '-52.10', category: 'Transport' },
  { date: '2026-06-01', description: 'UBER TRIP', amount: '-11.75', category: 'Transport' },
  { date: '2026-06-22', description: 'SHELL GAS STATION', amount: '-48.60', category: 'Transport' },
  { date: '2026-07-14', description: 'LYFT RIDE', amount: '-16.90', category: 'Transport' },

  // Travel
  { date: '2026-06-18', description: 'AIR CANADA FLIGHT', amount: '-612.00', category: 'Travel' },
  { date: '2026-06-18', description: 'MARRIOTT HOTEL - DOWNTOWN', amount: '-238.50', category: 'Travel' },

  // Services
  { date: '2026-05-12', description: 'GOOGLE CLOUD PLATFORM', amount: '-22.14', category: 'Services' },
  { date: '2026-06-12', description: 'ADOBE CREATIVE CLOUD', amount: '-54.99', category: 'Services' },
  { date: '2026-07-12', description: 'LINKEDIN PREMIUM', amount: '-39.99', category: 'Services' },

  // Other
  { date: '2026-05-21', description: 'E-TRANSFER TO J SMITH', amount: '-100.00', category: 'Other' },
  { date: '2026-06-25', description: 'ATM WITHDRAWAL', amount: '-60.00', category: 'Other' },
  { date: '2026-07-08', description: 'BANK SERVICE FEE', amount: '-4.95', category: 'Other' },
];

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

    // Find or create the demo user
    let demoUser = await User.findOne({ email: "demo@finflow.com" });

    if (demoUser) {
      console.log("\n⚠️  Demo user already exists — reusing it.");
    } else {
      console.log("🔄 Creating demo user...");
      const hashedPassword = await bcrypt.hash("demo123", 10);
      demoUser = await User.create({
        name: "Demo User",
        email: "demo@finflow.com",
        password: hashedPassword,
      });
      console.log("✅ Demo user created.");
    }

    console.log("📧 Email: demo@finflow.com");
    console.log("🔑 Password: demo123");
    console.log("🆔 User ID:", demoUser._id);

    // Reseed transactions so the script is idempotent - safe to re-run.
    console.log("\n🔄 Clearing existing demo transactions...");
    const deleted = await Transaction.deleteMany({ userId: demoUser._id });
    console.log(`✅ Removed ${deleted.deletedCount} old transaction(s).`);

    console.log(`🔄 Inserting ${DEMO_TRANSACTIONS.length} sample transactions...`);
    await Transaction.insertMany(
      DEMO_TRANSACTIONS.map((t) => ({ ...t, userId: demoUser!._id }))
    );
    console.log(`✅ Inserted ${DEMO_TRANSACTIONS.length} transactions spanning 2026-05-01 to 2026-07-22.`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedDemoUser();
