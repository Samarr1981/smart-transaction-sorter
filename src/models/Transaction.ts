import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  userId: {
  type: mongoose.Schema.Types.ObjectId,
  required: true,
},
  date: { 
    type: String,
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  amount: {
    type: String,
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

export const Transaction = 
  mongoose.models.Transaction || 
  mongoose.model("Transaction", TransactionSchema);