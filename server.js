import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

import User from "./User.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

/* ================= DB CONNECTION ================= */
mongoose.set("bufferCommands", false);

mongoose.connect(process.env.MONGO_URI, {
  family: 4
})
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error:", err));
  console.log(mongoose.connection.readyState);

/* ================= MAIL SETUP ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

/* ================= OTP FUNCTION ================= */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ================= SIGNUP ================= */
app.post("/signup", async (req, res) => {
  const { name, username, email, mobile, password, avatar } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiry = Date.now() + 5 * 60 * 1000;

    const newUser = new User({
      name,
      username,
      email,
      mobile,
      password: hashedPassword,
      avatar,
      otp,
      otpExpiry: expiry,
    });

    await newUser.save();

    transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "ZenTalk Email Verification",
      text: `Your OTP is ${otp}`,
    });

    res.json({ message: "OTP sent 📧" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ================= VERIFY OTP ================= */
app.post("/verify", async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user) return res.status(400).json({ error: "User not found" });

  if (user.otp !== otp || Date.now() > user.otpExpiry) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  user.isVerified = true;
  user.otp = null;

  await user.save();

  res.json({ message: "Email verified ✅" });
});
/* ================= LOGIN ================= */
app.post("/login", async (req, res) => {
  const { emailOrUsername, password } = req.body;

  const user = await User.findOne({
    $or: [
      { email: emailOrUsername },
      { username: emailOrUsername }
    ]
  });

  if (!user) return res.status(400).json({ error: "User not found" });

  if (!user.isVerified) {
    return res.status(400).json({ error: "Verify email first" });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(400).json({ error: "Wrong password" });
  }

  res.json({ message: "Login successful ✅", user });
});
/* ================= START SERVER ================= */
app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});