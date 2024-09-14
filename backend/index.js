const express = require('express');
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "s3cr3t";

// define mongoose schema
const userSchema = new mongoose.Schema({
    username : String,
    password : String,
    purchasedCourses : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "Course"
    }]
});

const adminSchema = new mongoose.Schema({
    username : String,
    password : String
});

const courseSchema = new mongoose.Schema({
    title : String,
    description : String,
    price : Number,
    imageLink : String,
    published : Boolean
});



// define mongoose models
const User = mongoose.model("User",userSchema);
const Admin = mongoose.model("Admin",adminSchema);
const Course = mongoose.model("Course",courseSchema);


// authenticate middleware
const authenticateJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(authHeader){
      const token = authHeader.split(' ')[1];
      jwt.verify(token, SECRET, (err, user) => {
        if(err) {
          return res.status(403).json({message:"Error Occured"});
        }
        req.user = user;
        next();
      });
    }
    else{
      return res.status(401).json({message:"Error Occured"});
    }
};


// connect to mongodb
mongoose.connect("mongodb+srv://kashu19march:DRIf9ty8DknUokbx@cluster0.7j0rfyb.mongodb.net/courses");


// admin routes
app.post("/admin/signup", async(req,res)=>{
    const {username,password} = req.body;
    const admin = await Admin.findOne({username});
    if(admin){
        return res.status(403).json({message : "Admin already exists"});
    }
    const newAdmin = new Admin({
        username : username,
        password : password
    });
    await newAdmin.save();
    const token = jwt.sign({username, role : "admin"}, SECRET, {expiresIn : "1h"});
    return res.status(201).json({message : "Admin created successfully", token});
})


app.post("/admin/login", async(req,res)=>{
    const {username, password} = req.body;
    const admin = await Admin.findOne({username,password});
    if(admin){
        const token = jwt.sign({username, role : "admin"}, SECRET, {expiresIn : "1h"});
        return res.status(200).json({message : "Logged in successfully", token}); 
    }
    else{
        return res.status(403).json({message : "Invalid username or password"});
    }
})

app.get("/admin/me",authenticateJwt, async(req,res)=>{
  const admin = await Admin.findOne({username:req.user.username});
  if(!admin){
    return res.status(403).json({message : "Admin doesn't exist"});
  }
  return res.status(200).json({
    username : admin.username
  })
});


app.post("/admin/courses", authenticateJwt, async(req,res)=>{
    const course = new Course(req.body);
    await course.save();
    res.status(201).json({message:"Course created successfully", courseId: course.id});
})


app.put("/admin/courses/:courseId", authenticateJwt, async(req,res)=>{
    const course = await Course.findByIdAndUpdate(req.params.courseId,req.body,{new:true});
    if(course){
      res.json({message: 'Course updated successfully'});
    } 
    else{
      res.status(404).json({message: 'Course not found'});
    }
})


app.get("/admin/courses", authenticateJwt, async(req,res)=>{
    const courses = await Course.find();
    res.status(200).json(courses);
})




// users routes
app.post("/users/signup", async(req,res)=>{
    const {username, password} = req.body;
    const user = await User.findOne({username});
    if(user) {
      res.status(403).json({message: 'User already exists'});
    } 
    else{
      const newUser = new User({username, password});
      await newUser.save();
      const token = jwt.sign({username, role:'user'}, SECRET, {expiresIn: '1h'});
      res.json({message: 'User created successfully', token});
    }
})


app.post("/users/login", async(req,res)=>{
    const {username, password} = req.body;
    const user = await User.findOne({username, password});
    if(user){
      const token = jwt.sign({username, role: 'user'}, SECRET, {expiresIn: '1h'});
      res.json({message: 'Logged in successfully', token});
    }
    else{
      res.status(403).json({message: 'Invalid username or password'});
    }
})


app.get("/users/courses", authenticateJwt, async(req,res)=>{
    const courses = await Course.find({published: true});
    res.json({courses});
})


app.post("/users/courses/:courseId", authenticateJwt, async(req,res)=>{
    const course = await Course.findById(req.params.courseId);
    console.log(course);
    if(course){
      const user = await User.findOne({username: req.user.username});
      if(user){
        user.purchasedCourses.push(course);
        await user.save();
        res.json({message: 'Course purchased successfully'});
      } 
      else{
        res.status(403).json({message: 'User not found'});
      }
    } 
    else{
      res.status(404).json({message:'Course not found'});
    }
})

  
app.get("/users/purchasedCourses", authenticateJwt, async(req,res)=>{
    const user = await User.findOne({username: req.user.username}).populate('purchasedCourses');
    if(user){
      res.json({purchasedCourses: user.purchasedCourses || []});
    } 
    else{
      res.status(403).json({message: 'User not found'});
    }
})



app.listen(3000, ()=>{
    console.log("server running at 3000");
})