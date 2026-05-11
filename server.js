require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cron = require("node-cron");

const app = express();
const PORT = 3000;

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/job_tracker")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    reset_token: { type: String, default: null },
    reset_expires: { type: Number, default: null },
  },
  { timestamps: true }
);

const profileSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    github: { type: String, default: "" },
    bio: { type: String, default: "" },
    desiredRole: { type: String, default: "" },
    jobType: { type: String, default: "" },
    prefLocation: { type: String, default: "" },
    workStyle: { type: String, default: "" },
    salary: { type: String, default: "" },
    availability: { type: String, default: "" },
    industries: { type: String, default: "" },
    skills: { type: [String], default: [] },
    resume: { type: Object, default: null },
  },
  { timestamps: true }
);

const jobSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: String, default: "Applied" },
    date_applied: { type: String, default: null },
    deadline: { type: String, default: null },
    reminder_sent: { type: Boolean, default: false },
    location: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Profile = mongoose.model("Profile", profileSchema);
const Job = mongoose.model("Job", jobSchema);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "job-tracker-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

// AUTH
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({ error: "An account with that email already exists." });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed });

    await Profile.create({
      user_id: user._id,
      name: user.name,
      email: user.email,
    });

    req.session.userId = user._id;
    req.session.userName = user.name;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    req.session.userId = user._id;
    req.session.userName = user.name;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    name: req.session.userName,
  });
});

app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 60;

    await User.updateOne(
      { email },
      {
        reset_token: token,
        reset_expires: expires,
      }
    );

    const resetLink = `http://localhost:${PORT}/reset.html?token=${token}`;

    await transporter.sendMail({
      from: `"Job Tracker" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your Job Tracker password",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#1a1d27;color:#e8eaf0;border-radius:12px;"><h2 style="color:#6c63ff;">Password Reset</h2><p style="color:#7a7f9a;margin-bottom:24px;">Click below to reset your password. Expires in 1 hour.</p><a href="${resetLink}" style="display:inline-block;background:#6c63ff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></div>`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const user = await User.findOne({
      reset_token: token,
      reset_expires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or expired." });
    }

    const hashed = await bcrypt.hash(password, 12);

    await User.updateOne(
      { _id: user._id },
      {
        password: hashed,
        reset_token: null,
        reset_expires: null,
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

// PROFILE
app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user_id: req.session.userId });

    if (!profile) {
      return res.json({});
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

app.post("/api/profile", requireAuth, async (req, res) => {
  try {
    await Profile.findOneAndUpdate(
      { user_id: req.session.userId },
      {
        ...req.body,
        user_id: req.session.userId,
      },
      {
        upsert: true,
        new: true,
      }
    );

    if (req.body.name) {
      req.session.userName = req.body.name;
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save profile." });
  }
});

// SAVED JOBS
app.get("/api/jobs", requireAuth, async (req, res) => {
  try {
    const jobs = await Job.find({ user_id: req.session.userId }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs." });
  }
});

app.post("/api/jobs", requireAuth, async (req, res) => {
  const { company, role, status, date_applied, deadline, location, notes } = req.body;

  if (!company || !role) {
    return res.status(400).json({ error: "Company and role are required." });
  }

  try {
    const job = await Job.create({
      user_id: req.session.userId,
      company,
      role,
      status: status || "Applied",
      date_applied: date_applied || null,
      deadline: deadline || null,
      reminder_sent: false,
      location: location || null,
      notes: notes || null,
    });

    res.json({
      success: true,
      id: job._id,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save job." });
  }
});

app.put("/api/jobs/:id", requireAuth, async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.body.deadline) {
      updateData.reminder_sent = false;
    }

    const job = await Job.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: req.session.userId,
      },
      { $set: updateData },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ error: "Job not found." });
    }

    res.json({
      success: true,
      job,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update job." });
  }
});

app.delete("/api/jobs/:id", requireAuth, async (req, res) => {
  try {
    await Job.deleteOne({
      _id: req.params.id,
      user_id: req.session.userId,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete job." });
  }
});

// EXTERNAL JOBS FROM ADZUNA
app.get("/api/external-jobs", async (req, res) => {
  try {
    const role = req.query.role || "software intern";
    const location = req.query.location || "New Mexico";

    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(
      role
    )}&where=${encodeURIComponent(location)}&results_per_page=10`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({ error: "Adzuna API failed" });
    }

    const data = await response.json();

    res.json(data.results || []);
  } catch (error) {
    console.error("API ERROR:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// EMAIL DEADLINE REMINDER
// Checks every 1 minute.
// If a job deadline is within the next 24 hours, it sends one email reminder
// to the email address used by the user when creating the account.
cron.schedule("* * * * *", async () => {
  console.log("Checking 24-hour deadline reminders...");

  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    const jobs = await Job.find({
      deadline: { $ne: null },
      reminder_sent: false,
    }).populate("user_id");

    console.log(`Found ${jobs.length} jobs with unsent reminders.`);

    for (const job of jobs) {
      const deadlineTime = new Date(job.deadline + "T23:59:59");

      console.log(
        `Checking job: ${job.role} at ${job.company}, deadline: ${job.deadline}`
      );

      if (deadlineTime > now && deadlineTime <= next24Hours) {
        const user = job.user_id;

        if (!user || !user.email) {
          console.log("No user email found for this job.");
          continue;
        }

        await transporter.sendMail({
          from: `"Job Tracker" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: "Deadline Reminder: Due Today",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f4f6f8;border-radius:10px;">
              <h2 style="color:#333;">Deadline Alert</h2>
              <p>This job application is due today.</p>
              <p><strong>Company:</strong> ${job.company}</p>
              <p><strong>Role:</strong> ${job.role}</p>
              <p><strong>Deadline:</strong> ${job.deadline}</p>
            </div>
          `,
        });

        job.reminder_sent = true;
        await job.save();

        console.log(`Reminder email sent to ${user.email} for ${job.role} at ${job.company}`);
      }
    }
  } catch (err) {
    console.error("Deadline reminder error:", err);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});