require("dotenv").config()

const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const multer = require("multer")
const db = require("./db")

// CLOUDINARY
const cloudinary = require("./cloudinary")
const { CloudinaryStorage } = require("multer-storage-cloudinary")

const app = express()

// ================= ADMIN LOGIN =================
const ADMIN_USERNAME = "ritik030"
const ADMIN_PASSWORD = "ritikgn030"

// ================= CORS =================
app.use(cors({
  origin: [
    "https://goldnotes.vercel.app",
    "http://localhost:3000",
    "http://localhost:5000"
  ],
  credentials: true
}))

app.use(express.json())

// ================= CLOUDINARY =================
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "goldnotes/profile",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
})

const uploadProfile = multer({ storage: profileStorage })

const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "goldnotes/notes",
    resource_type: "auto",
  },
})

const upload = multer({ storage: pdfStorage })

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("GoldNotes Backend Running 🚀")
})

// ================= TEST DB =================
app.get("/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()")
    res.json(result.rows)
  } catch (err) {
    console.log(err)
    res.status(500).json("DB Error")
  }
})

// ================= REGISTER =================
app.post("/register", uploadProfile.single("profile_photo"), async (req, res) => {
  try {
    const { first_name, last_name, gender, dob, year, username, password } = req.body

    if (!first_name || !last_name || !gender || !dob || !year || !username || !password) {
      return res.status(400).json({ message: "All fields required" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const photoPath = req.file ? req.file.path : null

    await db.query(
      `INSERT INTO users 
      (first_name,last_name,gender,dob,year,username,password,profile_photo)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [first_name, last_name, gender, dob, year, username, hashedPassword, photoPath]
    )

    res.json({ message: "User Registered Successfully" })

  } catch (err) {
    console.log(err)
    res.status(400).json({ message: "Username exists or DB error" })
  }
})

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: "All fields required" })
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return res.json({
        message: "Admin Login Success",
        user: { id: 0, username: "ritik030", role: "admin" }
      })
    }

    const result = await db.query(
      `SELECT * FROM users WHERE username=$1 LIMIT 1`,
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User Not Found" })
    }

    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password)

    if (!match) return res.status(400).json({ message: "Invalid Password" })

    res.json({
      message: "Login Success",
      user: { ...user, role: "user" }
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Server Error" })
  }
})

// ================= MATERIALS =================
app.get("/materials", async (req, res) => {
  try {
    const { year, semester, subject, type } = req.query

    let sql = "SELECT * FROM materials WHERE year=$1 AND semester=$2 AND subject=$3"
    let values = [year, semester, subject]

    if (type && type !== "all") {
      sql += " AND type=$4"
      values.push(type)
    }

    const result = await db.query(sql, values)
    res.json(result.rows)

  } catch (err) {
    console.log(err)
    res.json([])
  }
})

// ================= UPLOAD =================
app.post("/admin/upload", upload.single("pdf"), async (req, res) => {
  try {
    const { year, semester, subject, type, title } = req.body
    const fileUrl = req.file.path

    await db.query(
      `INSERT INTO materials (year,semester,subject,type,title,file_path,file_name)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [year, semester, subject, type, title, fileUrl, req.file.originalname]
    )

    res.json({ message: "File uploaded successfully", url: fileUrl })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Upload failed" })
  }
})

// ================= SERVER =================
const PORT = process.env.PORT || 5000

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`)
})