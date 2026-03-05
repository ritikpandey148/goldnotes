// ================= LOAD ENV =================
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

// ================= FILE STORAGE =================
const storage=multer.diskStorage({

destination:(req,file,cb)=>{
cb(null,"uploads/")
},

filename:(req,file,cb)=>{
cb(null,Date.now()+"_"+file.originalname)
}

})

const upload=multer({storage})

// ================= SERVE FILES =================
const uploadsPath=path.join(__dirname,"uploads")
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

const sql=`
INSERT INTO users
(first_name,last_name,gender,dob,year,username,password)
VALUES(?,?,?,?,?,?,?)
`

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
app.post("/login",(req,res)=>{

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

const sql="SELECT * FROM users WHERE username=?"

db.query(sql,[username],async(err,result)=>{

if(err){
return res.status(500).json({message:"Server Error"})
}

if(result.length===0){
return res.status(404).json({message:"User Not Found"})
}

const user=result[0]

const match=await bcrypt.compare(password,user.password)

if(!match){
return res.status(400).json({message:"Invalid Password"})
}

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

})


// ================= ADMIN UPLOAD =================
app.post("/admin/upload",upload.single("pdf"),(req,res)=>{

const {year,semester,subject,type,title}=req.body

if(!req.file){
return res.status(400).json({message:"No file uploaded"})
}

const folder=`uploads/${year}/${semester}`

if(!fs.existsSync(folder)){
fs.mkdirSync(folder,{recursive:true})
}

const filename=Date.now()+"_"+req.file.originalname
const newPath=`${folder}/${filename}`

fs.renameSync(req.file.path,newPath)

const sql=`
INSERT INTO materials
(year,semester,subject,type,title,file_path,file_name)
VALUES(?,?,?,?,?,?,?)
`

db.query(sql,
[year,semester,subject,type,title,newPath,filename],
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

const sql=`
SELECT * FROM materials
WHERE year=? AND semester=? AND subject=? AND type=?
`

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

const sql=`
INSERT INTO materials
(year,semester,subject,type,yt_link)
VALUES(?,?,?,'yt',?)
`

db.query(sql,
[year,semester,subject,link],
(err)=>{

if(err){
return res.status(500).json({message:"YT Add Failed"})
}

res.json({message:"YT Playlist Added"})

})

})


// ================= REPLACE FILE =================
app.post("/admin/replace",upload.single("pdf"),(req,res)=>{

const {id}=req.body

const file=req.file

const sql="SELECT file_path FROM materials WHERE id=?"

db.query(sql,[id],(err,result)=>{

if(result.length===0){
return res.status(404).json({message:"Material not found"})
}

const oldFile=result[0].file_path

if(fs.existsSync(oldFile)){
fs.unlinkSync(oldFile)
}

const newPath=`uploads/${file.filename}`

fs.renameSync(file.path,newPath)

db.query(
"UPDATE materials SET file_path=?, file_name=? WHERE id=?",
[newPath,file.filename,id]
)

res.json({message:"File replaced successfully"})

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

const file=result[0].file_path

if(fs.existsSync(file)){
fs.unlinkSync(file)
}

db.query("DELETE FROM materials WHERE id=?", [id])

res.json({message:"Material deleted successfully"})

})

})


// ================= DOWNLOAD TRACK =================
app.post("/download",(req,res)=>{

const {user_id,subject,file_name,year,semester,type,file_path}=req.body

const sql=`
INSERT INTO downloads
(user_id,subject,file_name,year,semester,type,file_path)
VALUES(?,?,?,?,?,?,?)
`

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

const sql=`
SELECT file_name,COUNT(*) AS downloads
FROM downloads
GROUP BY file_name
ORDER BY downloads DESC
`

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

const sql=`
INSERT INTO votes (user_id,subject)
VALUES (?,?)
`

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