import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  mobile: String,
  password: String,
  avatar: String,
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Number,
}, { timestamps: true });

export default mongoose.model("User", userSchema);