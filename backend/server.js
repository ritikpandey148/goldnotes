require("dotenv").config()

const express = require("express")
const cors = require("cors")
const path = require("path")
const bcrypt = require("bcrypt")
const multer = require("multer")
const fs = require("fs")
const db = require("./db")

const app = express()

// ================= ADMIN LOGIN =================
const ADMIN_USERNAME="ritik030"
const ADMIN_PASSWORD="ritikgn030"

// ================= CORS =================
app.use(cors({
origin:[
"https://goldnotes.vercel.app",
"http://localhost:3000",
"http://localhost:5000"
],
credentials:true
}))

app.use(express.json())

// ================= ENSURE UPLOADS FOLDER =================
const uploadsPath = path.join(__dirname,"uploads")

if(!fs.existsSync(uploadsPath)){
fs.mkdirSync(uploadsPath,{recursive:true})
}

// ================= FILE STORAGE =================
const storage = multer.diskStorage({

destination:(req,file,cb)=>{
cb(null,uploadsPath)
},

filename:(req,file,cb)=>{
cb(null,Date.now()+"_"+file.originalname)
}

})

const upload = multer({storage})

// ================= SERVE FILES =================
app.use("/uploads",express.static(uploadsPath))

// ================= ROOT =================
app.get("/",(req,res)=>{
res.send("GoldNotes Backend Running 🚀")
})

// ================= REGISTER =================
app.post("/register",async(req,res)=>{

const {first_name,last_name,gender,dob,year,username,password}=req.body

if(!first_name||!last_name||!gender||!dob||!year||!username||!password){
return res.status(400).json({message:"All fields required"})
}

try{

const hashedPassword=await bcrypt.hash(password,10)

const sql=`INSERT INTO users
(first_name,last_name,gender,dob,year,username,password)
VALUES(?,?,?,?,?,?,?)`

db.query(sql,
[first_name,last_name,gender,dob,year,username,hashedPassword],
(err)=>{

if(err){
return res.status(400).json({message:"Username exists"})
}

res.json({message:"User Registered Successfully"})
})

}catch(err){

res.status(500).json({message:"Server Error"})

}

})

// ================= LOGIN =================
app.post("/login",async(req,res)=>{

try{

const {username,password}=req.body

if(!username||!password){
return res.status(400).json({message:"All fields required"})
}

// ADMIN LOGIN
if(username===ADMIN_USERNAME && password===ADMIN_PASSWORD){

return res.json({
message:"Admin Login Success",
user:{
id:0,
username:"ritik030",
role:"admin"
}
})

}

// FIND USER
db.query(
"SELECT id,username,password,first_name,last_name,gender,dob,year FROM users WHERE username=? LIMIT 1",
[username],
async (err,result)=>{

if(err){
return res.status(500).json({message:"Server Error"})
}

if(result.length===0){
return res.status(404).json({message:"User Not Found"})
}

const user=result[0]

// PASSWORD CHECK
const isMatch = await bcrypt.compare(password,user.password)

if(!isMatch){
return res.status(400).json({message:"Invalid Password"})
}

// SUCCESS RESPONSE
res.json({
message:"Login Success",
user:{
id:user.id,
username:user.username,
first_name:user.first_name,
last_name:user.last_name,
gender:user.gender,
dob:user.dob,
year:user.year,
role:"user"
}
})

})

}catch(error){

console.error(error)
res.status(500).json({message:"Login Error"})

}

})

// ================= ADMIN UPLOAD =================
app.post("/admin/upload",upload.single("pdf"),(req,res)=>{

const {year,semester,subject,type,title}=req.body

if(!req.file){
return res.status(400).json({message:"No file uploaded"})
}

const folder = path.join(uploadsPath,year,semester)

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true})
}

const filename = Date.now()+"_"+req.file.originalname
const newPath = path.join(folder,filename)

fs.renameSync(req.file.path,newPath)

const dbPath=`uploads/${year}/${semester}/${filename}`

const sql=`INSERT INTO materials
(year,semester,subject,type,title,file_path,file_name)
VALUES(?,?,?,?,?,?,?)`

db.query(sql,
[year,semester,subject,type,title,dbPath,filename],
(err)=>{

if(err){
return res.status(500).json({message:"DB Save Failed"})
}

res.json({message:"File uploaded successfully"})

})

})

// ================= FETCH MATERIALS =================
app.get("/materials",(req,res)=>{

const {year,semester,subject,type}=req.query

const sql=`SELECT * FROM materials
WHERE year=? AND semester=? AND subject=? AND type=?`

db.query(sql,
[year,semester,subject,type],
(err,result)=>{

if(err){
return res.status(500).json({message:"Fetch error"})
}

res.json(result)

})

})

// ================= ADD YT PLAYLIST =================
app.post("/admin/add-yt",(req,res)=>{

const {year,semester,subject,link}=req.body

const sql=`INSERT INTO materials
(year,semester,subject,type,yt_link)
VALUES(?,?,?,'yt',?)`

db.query(sql,
[year,semester,subject,link],
(err)=>{

if(err){
return res.status(500).json({message:"YT Add Failed"})
}

res.json({message:"YT Playlist Added"})

})

})

// ================= DELETE MATERIAL =================
app.delete("/admin/delete",(req,res)=>{

const {id}=req.body

const sql="SELECT file_path FROM materials WHERE id=?"

db.query(sql,[id],(err,result)=>{

if(result.length===0){
return res.status(404).json({message:"Material not found"})
}

const filePath = path.join(__dirname,result[0].file_path)

if(fs.existsSync(filePath)){
fs.unlinkSync(filePath)
}

db.query("DELETE FROM materials WHERE id=?", [id])

res.json({message:"Material deleted successfully"})

})

})

// ================= DOWNLOAD TRACK =================
app.post("/download",(req,res)=>{

const {user_id,subject,file_name,year,semester,type,file_path}=req.body

const sql=`INSERT INTO downloads
(user_id,subject,file_name,year,semester,type,file_path)
VALUES(?,?,?,?,?,?,?)`

db.query(sql,
[user_id,subject,file_name,year||null,semester||null,type||null,file_path||null],
(err)=>{

if(err){
return res.status(500).json({message:"Download Failed"})
}

res.json({message:"Download Recorded"})

})

})

// ================= ANALYTICS =================
app.get("/admin/analytics",(req,res)=>{

const sql=`SELECT file_name,COUNT(*) AS downloads
FROM downloads
GROUP BY file_name
ORDER BY downloads DESC`

db.query(sql,(err,result)=>{

if(err){
return res.status(500).json({message:"Analytics Error"})
}

res.json(result)

})

})

// ================= VOTE =================
app.post("/vote",(req,res)=>{

const {user_id,subject}=req.body

const sql=`INSERT INTO votes (user_id,subject)
VALUES (?,?)`

db.query(sql,[user_id,subject],(err)=>{

if(err){
return res.status(400).json({message:"Already Voted"})
}

res.json({message:"Vote Added"})

})

})

// ================= ERROR =================
app.use((req,res)=>{
res.status(404).json({message:"Route Not Found"})
})

// ================= SERVER =================
const PORT=process.env.PORT||5000

app.listen(PORT,"0.0.0.0",()=>{
console.log(`🚀 Server running on port ${PORT}`)
})
