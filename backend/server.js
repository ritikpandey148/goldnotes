// ================= LOAD ENV =================
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();

// ================= CORS CONFIG =================
app.use(cors({
    origin: [
        "https://goldnotes.vercel.app",
        "http://localhost:3000",
        "http://localhost:5000"
    ],
    credentials: true
}));

app.use(express.json());

// ================= SERVE FRONTEND (optional) =================
app.use(express.static(path.join(__dirname, "..")));

// ================= SERVE PDF FILES =================
// 🔥 Make sure your PDFs are inside backend/uploads folder
const uploadsPath = path.join(__dirname, "uploads");
app.use("/files", express.static(uploadsPath));

console.log("Uploads Path:", uploadsPath);

// ================= ROOT =================
app.get("/", (req, res) => {
    res.send("GoldNotes Backend Running 🚀");
});

// ================= REGISTER =================
app.post("/register", async (req, res) => {

    const { first_name, last_name, gender, dob, year, username, password } = req.body;

    if (!first_name || !last_name || !gender || !dob || !year || !username || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users 
            (first_name, last_name, gender, dob, year, username, password)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql,
            [first_name, last_name, gender, dob, year, username, hashedPassword],
            (err) => {
                if (err) {
                    console.log(err);
                    return res.status(400).json({ message: "Username already exists" });
                }

                res.json({ message: "User Registered Successfully" });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// ================= LOGIN =================
app.post("/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "All fields required" });
    }

    const sql = "SELECT * FROM users WHERE username = ?";

    db.query(sql, [username], async (err, result) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Server Error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "User Not Found" });
        }

        const user = result[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Password" });
        }

        res.json({
            message: "Login Success",
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                gender: user.gender,
                dob: user.dob,
                year: user.year,
                username: user.username
            }
        });

    });
});

// ================= DOWNLOAD TRACK =================
app.post("/download", (req, res) => {

    const { user_id, subject, file_name, year, semester, type, file_path } = req.body;

    if (!user_id || !subject || !file_name) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const sql = `
        INSERT INTO downloads 
        (user_id, subject, file_name, year, semester, type, file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql,
        [user_id, subject, file_name, year || null, semester || null, type || null, file_path || null],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Download Failed" });
            }

            res.json({ message: "Download Recorded Successfully" });
        }
    );
});

// ================= VOTE =================
app.post("/vote", (req, res) => {

    const { user_id, subject } = req.body;

    const sql = `
        INSERT INTO votes (user_id, subject)
        VALUES (?, ?)
    `;

    db.query(sql, [user_id, subject], (err) => {
        if (err) {
            return res.status(400).json({ message: "Already Voted" });
        }

        res.json({ message: "Vote Added" });
    });

});

// ================= ERROR HANDLER =================
app.use((req, res) => {
    res.status(404).json({ message: "Route Not Found" });
});

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});