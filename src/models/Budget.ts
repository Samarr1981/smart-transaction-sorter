import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique budget per user per category
BudgetSchema.index({ userId: 1, category: 1 }, { unique: true });

export const Budget = 
  mongoose.models.Budget || 
  mongoose.model("Budget", BudgetSchema);