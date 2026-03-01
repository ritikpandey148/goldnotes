// ================= LOAD ENV FIRST =================
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= SERVE FRONTEND =================
// Serve all HTML/CSS/JS files from project root
app.use(express.static(path.join(__dirname, "..")));

// ================= SERVE PDF FILES =================
app.use("/files", express.static(path.join(__dirname, "uploads")));

console.log("Frontend Path:", path.join(__dirname, ".."));
console.log("Uploads Path:", path.join(__dirname, "uploads"));

// ================= DEFAULT ROUTE =================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
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

// ================= UPDATE PROFILE =================
app.post("/update-profile", (req, res) => {

    const { id, first_name, last_name, gender, dob, year } = req.body;

    const sql = `
        UPDATE users 
        SET first_name=?, last_name=?, gender=?, dob=?, year=?
        WHERE id=?
    `;

    db.query(sql, [first_name, last_name, gender, dob, year, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Update Failed" });
        }

        res.json({ message: "Profile Updated Successfully" });
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

// ================= GET DOWNLOADS =================
app.get("/get-downloads/:id", (req, res) => {

    const userId = req.params.id;

    const sql = `
        SELECT subject, file_name, year, semester, type, file_path, downloaded_at
        FROM downloads
        WHERE user_id = ?
        ORDER BY downloaded_at DESC
    `;

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error fetching downloads" });
        }

        res.json(result);
    });

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

// ================= SERVER START =================
app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});