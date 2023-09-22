import dotenv from 'dotenv';
import express from 'express';
import mongoose from "mongoose";
import path from 'path';
import  session from "express-session";
import  passport from "passport";
import ejs from "ejs";
import User from "./models/user.js";
import Class from "./models/class.js";
import Post from "./models/post.js"
import Feed from "./models/feed.js"
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import { extname } from 'path';
import fs from 'fs';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 9000;
//app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
// app.use(
//     cors({
//          origin: 'http://localhost:3000', // Allow requests from any origin
//          methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//          credentials: true, // allow session cookie from browser to pass through
//    })
// );
//allowing cross origin requests
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
//   res.setHeader(
//     'Access-Control-Allow-Methods',
//     'GET, POST, PUT, PATCH, DELETE'
//   );
//   res.setHeader(
//     'Access-Control-Allow-Headers',
//     'Content-Type, Authorization'
//   );
//   res.setHeader('Access-Control-Allow-Credentials', 'true');
//   next();
// });
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Connect to MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Passport configuration
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Express session middleware
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//multer file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/files'); // Specify the destination folder
  },
  filename: (req, file, cb) => {
    // Define how files should be named
    cb(null, `${file.fieldname}-${Date.now()}${extname(file.originalname)}`);
  },
});

const upload = multer({ storage });



// Define routes

//get routes
app.get('/', async (req, res) => {
  try {
    // Retrieve all users from the database
    if(req.isAuthenticated()){
        const users = await User.find();
        res.json(users);
    }
    else{
        res.json({message: "notloggedin"});
      }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/register",function(req,res){
  res.json({message: "Display the register page"});
  });
  app.get("/createclass",function(req,res){
    //res.render("createclass");
    res.json({message: "Display the create class page"});
  });
app.get("/login",function(req,res){
    if(req.isAuthenticated()){
      res.redirect("/");
    }else{
      //res.render("adminlogin");
      res.json({message: "Display the login page"});
    }
  });
app.get("/logout",function(req,res){
    req.logout(function(err) {
      if (err) { console.log(err); }
      console.log("logged out");
      res.json({message: "not logged in"});

    });
});


//Getting all the classes a user is Enrolled and owned into
app.get('/enrolledclasses', async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        // Retrieve the classEnrolled field from the authenticated user
        const classids = req.user.classenrolled;
  
        // Find all classes with the class codes in the classEnrolled field
        const enrolledClasses = await Class.find({ _id: { $in: classids } });
  
        res.json(enrolledClasses);
      } else {
        res.json({ message: 'Not logged in' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  app.get('/ownedclasses', async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        // Retrieve the classowned field from the authenticated user
        const classids = req.user.classowned;
  
        // Find all classes with the class ids in the owned array
        const classowned = await Class.find({ _id: { $in: classids } });

        res.json(classowned);
      } else {
        res.json({ message: 'Not logged in' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

//Creating a class and joining a class
app.post('/createclass', async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      console.log(req.body); // Log the entire request body
      console.log(req.user.username);

      // Check if class code already exists
      const existingClass = await Class.findOne({ classCode: req.body.classCode });
      if (existingClass) {
        // Class code already exists, send an error response
        return res.status(400).json({ error: 'Class code already exists' });
      }

      // Create a new class
      const clas = new Class({
        createdByName: req.user.firstName,
        createdByID: req.user._id,
        createdByusername: req.user.username,
        classTitle: req.body.classTitle,
        classYear: req.body.classYear,
        classSection: req.body.classSection,
        classDesc: req.body.classDesc,
        classCode: req.body.classCode
      });

      await clas.save();
      console.log(clas._id);

      // Create a new feed for the class
      const feed = new Feed({
        classId: clas._id,
        posts: [],
      });

      await feed.save();

      // Add the class to the user's classowned array
      await User.findByIdAndUpdate(
        { _id: req.user._id },
        { $push: { classowned: clas._id } }
      );

      console.log("Class created successfully");
      return res.json({ message: "Class created successfully" });
    } else {
      return res.json({ message: "Not logged in" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/joinclass', async (req, res) => {
    try {
      if (req.isAuthenticated()) {
        const classCode = req.body.classCode;
        
        const userId = req.user._id;
        // Find the class based on the class code
        const classToJoin = await Class.findOne({ classCode: classCode });
        //console.log(classToJoin);
        if (!classToJoin) {
          return res.status(404).json({ message: 'Class not found' });
        }
         // Check if the class is accepting users
        if (!classToJoin.userAccepting) {
          return res.status(400).json({ message: 'Class is not accepting new users' });
        }
  
        // Check if the user is already a participant in the class
        const isParticipant = classToJoin.participants.includes(userId);
        if (isParticipant) {
          return res.status(400).json({ message: 'Already joined the class' });
        }
        // Check if the user is the creator of the class
        if (classToJoin.createdByID.equals(userId)) {
        return res.status(400).json({ message: 'User is the creator of the class' });
       }
  
        // Add the user to the participants array
        classToJoin.participants.push(userId);
        await classToJoin.save();
        
         // Update the classEnrolled array in the user document
         await User.updateOne(
            { _id: userId },
            { $push: { classenrolled: classToJoin._id } }
         );

        res.json({ message: 'Successfully joined the class' });
      } else {
        res.json({ message: 'Not logged in' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
});
//getting data from the class and maybe changing in it aswell


// GET route to fetch class data
app.get("/class/:classId", async (req, res) => {
  const { classId } = req.params;
  const { user } = req;

  // Check if the user is authenticated
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Find the class and check if the user is enrolled
    const foundClass = await Class.findOne({
      _id: classId,
      participants: user._id
    }).exec();

    // Check if the class exists and the user is enrolled
    if (!foundClass) {
      console.log("User is not enrolled in the class");
      return res.status(403).json({ message: "User is not enrolled in the class" });
    }
    // Find participant details
    const participantIds = foundClass.participants;
    const participantDetails = await User.find(
      { _id: { $in: participantIds } },
      "firstName lastName username"
    ).exec();

    // //Return the class data
    // console.log(foundClass);
    // res.json(foundClass);
    // Return the class data and participant details
    res.json({ classData: foundClass, participants: participantDetails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//post route to get the data for feed post

// app.post("/class/:classId/feed", async (req, res) => {
//   if (req.isAuthenticated()) {
//     const { classId } = req.params;
//     const { content } = req.body;
//     const authorId = req.user._id;

//     try {
//       // Check if the class exists and the user is authorized
//       const foundClass = await Class.findById(classId);
//       if (!foundClass) {
//         return res.status(404).json({ message: "Class not found" });
//       }

//       // Create a new post
//       const newPost = new Post({
//         content,
//         author: authorId,
//         classId: classId,
//       });
//       await newPost.save();

//       // Save the post to the class-specific feed
//       const foundFeed = await Feed.findOneAndUpdate(
//         { classId },
//         { $push: { posts: newPost._id } },
//         { new: true }
//       );
//       const tempost= {
//         _id: newPost._id,
//         author:{
//           firstName: req.user.firstName,
//           lastName: req.user.lastName,
//           username: req.user.username
//         },
//         content: content,
//         createdAt: newPost.createdAt,
//       }
//       console.log("Post added successfully");
//       console.log(newPost);

//       res.json({ message: "Post added successfully", post: tempost });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: "Internal Server Error" });
//     }
//   } else {
//     res.status(401).json({ message: "Unauthorized" });
//   }
// });

app.post("/class/:classId/feed", upload.single('file'), async (req, res) => {
  if (req.isAuthenticated()) {
    const { classId } = req.params;
    const { content } = req.body;
    const authorId = req.user._id;
    const fileName = req.file ? req.file.filename : null; // Get the file name from the uploaded file

    try {
      // Check if the class exists and the user is authorized
      const foundClass = await Class.findById(classId);
      if (!foundClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Create a new post
      const newPost = new Post({
        content,
        author: authorId,
        classId: classId,
        fileName, // Save the file name in the post
      });
      await newPost.save();

      // Save the post to the class-specific feed
      const foundFeed = await Feed.findOneAndUpdate(
        { classId },
        { $push: { posts: newPost._id } },
        { new: true }
      );
      
      const tempost = {
        _id: newPost._id,
        author: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          username: req.user.username
        },
        content: content,
        fileName: fileName, // Include the file name in the response
        createdAt: newPost.createdAt,
      }

      console.log("Post added successfully");
      console.log(newPost);

      res.json({ message: "Post added successfully", post: tempost });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

//get route to get the posts and send to client
// app.get('/class/:classId/feed', async (req, res) => {
//   try {
//     const { classId } = req.params;

//     // Find the feed for the specified classId
//     const foundFeed = await Feed.findOne({ classId });

//     if (!foundFeed) {
//       return res.status(404).json({ message: 'Feed not found' });
//     }

//     // Retrieve the post details for each post ID in the feed, sorted by createdAt in descending order
//     const postDetails = [];

//     for (let i = foundFeed.posts.length - 1; i >= 0; i--) {
//       const postId = foundFeed.posts[i];
//       const post = await Post.findById(postId)
//         .populate('author', 'firstName lastName username')
//         .select('content createdAt');
//       postDetails.push(post);
//     }

//     console.log(postDetails);
//     res.json({ posts: postDetails });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

app.get('/class/:classId/feed', async (req, res) => {
  try {
    const { classId } = req.params;

    // Find the feed for the specified classId
    const foundFeed = await Feed.findOne({ classId });

    if (!foundFeed) {
      return res.status(404).json({ message: 'Feed not found' });
    }

    // Retrieve the post details for each post ID in the feed, sorted by createdAt in descending order
    const postDetails = [];

    for (let i = foundFeed.posts.length - 1; i >= 0; i--) {
      const postId = foundFeed.posts[i];
      const post = await Post.findById(postId)
        .populate('author', 'firstName lastName username')
        .select('content fileName createdAt'); // Include 'fileName' in the selection

      postDetails.push(post);
    }

    console.log(postDetails);
    res.json({ posts: postDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
//serving files with conditions
app.get('/files/:filename', (req, res) => {
  // This route is protected and can only be accessed by logged-in users
  const { filename } = req.params;
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  } else {
    res.sendFile(__dirname + '/public/files/' + filename);
  }
});



//delete route to delete a specific post
app.delete('/posts/:classId/feed/:postId', async (req, res) => {
  try {
    const { classId, postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    // Delete the file from the "public/files" folder
    if (post.fileName) {
      const filePath = path.join(__dirname, 'public', 'files', post.fileName);
      fs.unlinkSync(filePath); // Delete the file
    }

    // Delete the post from the "post" collection
    await Post.findByIdAndDelete(postId);

    // Remove the post ID from the "posts" array in the "feed" collection
    await Feed.findOneAndUpdate(
      { classId },
      { $pull: { posts: postId } }
    );

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
//
//now some routes for class owner and special functions for it
//
app.get("/class/owner/:classId", async (req, res) => {
  const { classId } = req.params;
  const { user } = req;

  // Check if the user is authenticated
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Find the class and check if the user is the creator
    const foundClass = await Class.findOne({
      _id: classId,
      createdBy: user._id
    }).exec();

    // Check if the class exists and the user is the creator
    if (!foundClass) {
      console.log("User is not the creator of the class");
      return res.status(403).json({ message: "User is not the creator of the class" });
    }

    // Find participant details
    const participantIds = foundClass.participants;
    const participantDetails = await User.find(
      { _id: { $in: participantIds } },
      "firstName lastName username"
    ).exec();

    // Return the class data and participant details
    res.json({ classData: foundClass, participants: participantDetails });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
 
  //owner of class removing a user
  app.delete("/class/:classId/participants/:userId", async (req, res) => {
    if (req.isAuthenticated()) {
      const { classId, userId } = req.params;
      const classOwner = req.user._id;
      
      try {
        // Check if the authenticated user is the class owner
        const foundClass = await Class.findById(classId);
        if (!foundClass) {
          return res.status(404).json({ message: "Class not found" });
        }
  
        if (classOwner.toString() !== foundClass.createdByID.toString()) {
          console.log(classId, classOwner, foundClass.createdByID);
          return res.status(403).json({ message: "Only the class owner can remove participants" });
        }
  
  
        // Remove the user from the participant list of the class
        await Class.findByIdAndUpdate(classId, { $pull: { participants: userId } });
  
        // Remove the class from the classEnrolled list of the user
        await User.findByIdAndUpdate(userId, { $pull: { classenrolled: classId } });
        
        // Remove the class from the classEnrolled list of the user
        await User.findByIdAndUpdate(userId, { $pull: { classEnrolled: classId } });

        // // Delete the posts where authorId and classId match
        // await Post.deleteMany({ author: userId, classId: classId });

        // Find the feed for the specified classId
     // Find and delete the posts where the author is the userId and classId matches
     const deletedPosts = await Post.find({ author: userId, classId });
     await Post.deleteMany({ author: userId, classId });

     // Remove the deleted post IDs from the posts array of the foundFeed
     const foundFeed = await Feed.findOne({ classId });
     foundFeed.posts = foundFeed.posts.filter(
       (postId) => !deletedPosts.map((post) => post._id.toString()).includes(postId.toString())
     );
     await foundFeed.save();

        res.json({ message: "Participant removed successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });
  
  //owner changing the state of user accpetance in a class
  // Get user acceptance state for a class
app.get('/class/:classId/user-acceptance', async (req, res) => {
  try {
    const { classId } = req.params;
    // Fetch the class document from the database
    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    // Retrieve the userAccepting property from the class document
    const { userAccepting } = foundClass;
    res.json({ userAccepting });
  } catch (error) {
    console.error('Error fetching user acceptance state:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Toggle user acceptance state for a class
app.put("/class/:classId/useracceptance", async (req, res) => {
  if (req.isAuthenticated()) {
    const { classId } = req.params;
    const { userAccepting } = req.body;
    const classOwner = req.user._id;

    try {
      // Check if the authenticated user is the class owner
      const foundClass = await Class.findById(classId);
      if (!foundClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      if (classOwner.toString() !== foundClass.createdByID.toString()) {
        return res.status(403).json({ message: "Only the class owner can toggle user acceptance" });
      }

      // Update the user acceptance state for the class
      const updatedClass = await Class.findByIdAndUpdate(
        classId,
        { userAccepting },
        { new: true }
      );

      res.json({ userAccepting: updatedClass.userAccepting });
    } catch (error) {
      console.error('Error toggling user acceptance state:', error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});
//owner changing the details of the class
app.patch('/class/:classId', async (req, res) => {
  if (req.isAuthenticated()) {
    const { classId } = req.params;
    const { classTitle, classYear, classSection, classDesc } = req.body;
    const userId = req.user._id;

    try {
      // Check if the authenticated user is the creator of the class
      const foundClass = await Class.findById(classId);
      if (!foundClass) {
        return res.status(404).json({ message: 'Class not found' });
      }

      if (!foundClass.createdByID.equals(userId)) {
        return res.status(403).json({ message: 'Only the class owner can update class details' });
      }

      // Update the class details
      const updatedClass = await Class.findByIdAndUpdate(
        classId,
        {
          classTitle: classTitle || foundClass.classTitle,
          classYear: classYear || foundClass.classYear,
          classSection: classSection || foundClass.classSection,
          classDesc: classDesc || foundClass.classDesc,
        },
        { new: true }
      );

      res.json({ updatedClass });
    } catch (error) {
      console.error('Error updating class details:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});



//check login status
app.get("/auth", function(req, res) {
  if (req.isAuthenticated()) {
    const userdata ={
      fname: req.user.firstName,
      lname: req.user.lastName,
      username: req.user.username,
  };
    res.json({ isLoggedIn: true, user: userdata });
  } else {
    res.json({ isLoggedIn: false, user: null });
  }
});

//Authentication routes
app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      if (!user) {
        // Authentication failed
        console.log('Authentication failed');
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      req.logIn(user, function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal server error' });
        }
  
        // Authentication succeeded
        console.log('User authenticated successfully');
        const userdata ={
            fname: req.user.firstName,
            lname: req.user.lastName,
            username: req.user.username,
        };
        return res.status(200).json(userdata);
      });
    })(req, res, next);
  });
// app.post('/login', passport.authenticate('local'), (req, res) => {
//     // Authentication succeeded
//     console.log('User authenticated successfully');
    
//     const userData = {
//       fname: req.user.firstName,
//       lname: req.user.lastName,
//       username: req.user.username,
//     };
//     res.status(200).json({user: userData ,cookies: req.cookies});
//   });
  

app.post('/register', async (req, res) => {
  try {
    console.log(req.body); // Log the entire request body
    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
    });
    
    User.register(user, req.body.password, function (err) {
      if (err) {
        console.log(err);
        return res.status(400).json({ error: 'User registration failed' });
      }
      passport.authenticate('local')(req, res, function () {
        console.log('User created successfully');
        res.json({ message: 'User created successfully' });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// // Serve static files
// app.use(express.static(path.join(__dirname, '../client/public')));
// app.get('*', (req, res) => {
//   //console.log(path.join(__dirname, '../client/public/index.html'));
//   res.sendFile(path.join(__dirname, '../client/public/index.html'));
// });

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
