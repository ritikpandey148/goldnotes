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
  methods: ["GET", "POST", "DELETE"],
  credentials: true
}))

app.use(express.json())

// ================= CLOUDINARY MULTER =================

// Profile Photo
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "goldnotes/profile",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
})

const uploadProfile = multer({ storage: profileStorage })

// Notes PDF
const pdfStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
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

// ================= REGISTER =================
app.post("/register", uploadProfile.single("profile_photo"), async (req, res) => {

  const { first_name, last_name, gender, dob, year, username, password } = req.body

  if (!first_name || !last_name || !gender || !dob || !year || !username || !password) {
    return res.status(400).json({ message: "All fields required" })
  }

  try {

    const hashedPassword = await bcrypt.hash(password, 10)

    let photoPath = null

    if (req.file) {
      photoPath = req.file.path   // CLOUDINARY URL
    }

    const sql = `INSERT INTO users
    (first_name,last_name,gender,dob,year,username,password,profile_photo)
    VALUES(?,?,?,?,?,?,?,?)`

    db.query(sql,
      [first_name, last_name, gender, dob, year, username, hashedPassword, photoPath],
      (err) => {

        if (err) {
          return res.status(400).json({ message: "Username exists" })
        }

        res.json({ message: "User Registered Successfully" })
      })

  } catch (err) {
    res.status(500).json({ message: "Server Error" })
  }

})

// ================= LOGIN =================
app.post("/login", (req, res) => {

  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: "All fields required" })
  }

  // ADMIN LOGIN
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {

    return res.json({
      message: "Admin Login Success",
      user: {
        id: 0,
        username: "ritik030",
        role: "admin"
      }
    })

  }

  db.query(
    `SELECT id,username,password,first_name,last_name,gender,dob,year,profile_photo 
    FROM users 
    WHERE username=? 
    LIMIT 1`,
    [username],
    async (err, result) => {

      if (err) {
        return res.status(500).json({ message: "Server Error" })
      }

      if (!result || result.length === 0) {
        return res.status(404).json({ message: "User Not Found" })
      }

      const user = result[0]

      const match = await bcrypt.compare(password, user.password)

      if (!match) {
        return res.status(400).json({ message: "Invalid Password" })
      }

      res.json({
        message: "Login Success",
        user: {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          gender: user.gender,
          dob: user.dob,
          year: user.year,
          profile_photo: user.profile_photo,
          role: "user"
        }
      })

    })

})

// ================= UPDATE PROFILE =================
app.post("/update-profile", (req, res) => {

  const { id, first_name, last_name, gender, dob, year } = req.body

  const sql = `UPDATE users 
  SET first_name=?,last_name=?,gender=?,dob=?,year=? 
  WHERE id=?`

  db.query(sql,
    [first_name, last_name, gender, dob, year, id],
    (err) => {

      if (err) {
        return res.status(500).json({ message: "Update failed" })
      }

      res.json({ message: "Profile updated" })
    })

})

// ================= UPDATE PROFILE PHOTO =================
app.post("/update-profile-photo", uploadProfile.single("photo"), (req, res) => {

  const user_id = req.body.user_id

  if (!req.file) {
    return res.status(400).json({ message: "No photo uploaded" })
  }

  const newPhoto = req.file.path   // CLOUDINARY URL

  db.query(
    "UPDATE users SET profile_photo=? WHERE id=?",
    [newPhoto, user_id],
    (err) => {

      if (err) {
        return res.status(500).json({ message: "Photo update failed" })
      }

      res.json({
        message: "Photo updated",
        photo: newPhoto
      })

    })

})

// ================= REMOVE PROFILE PHOTO =================
app.post("/remove-profile-photo", (req, res) => {

  const { user_id } = req.body

  db.query(
    "UPDATE users SET profile_photo=NULL WHERE id=?",
    [user_id],
    () => {
      res.json({ message: "Photo removed" })
    })

})

// ================= ADMIN UPLOAD NOTES =================
app.post("/admin/upload", upload.single("pdf"), (req, res) => {

  const { year, semester, subject, type, title } = req.body

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" })
  }

  const fileUrl = req.file.path   // CLOUDINARY URL

  const sql = `INSERT INTO materials
  (year,semester,subject,type,title,file_path,file_name)
  VALUES(?,?,?,?,?,?,?)`

  db.query(sql,
    [year, semester, subject, type, title, fileUrl, req.file.originalname],
    (err) => {

      if (err) {
        return res.status(500).json({ message: "Upload failed" })
      }

      res.json({
        message: "File uploaded successfully",
        url: fileUrl
      })

    })

})

// ================= FETCH MATERIALS =================
app.get("/materials", (req, res) => {

  const { year, semester, subject, type } = req.query

  db.query(
    "SELECT * FROM materials WHERE year=? AND semester=? AND subject=? AND type=?",
    [year, semester, subject, type],
    (err, result) => {

      if (err) {
        return res.status(500).json({ message: "Fetch error" })
      }

      res.json(result)

    })

})

// ================= SERVER =================
const PORT = process.env.PORT || 5000

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`)
})