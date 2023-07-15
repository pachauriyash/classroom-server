import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

// Define the schema for the "post" collection
const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


// Create the "post" model
//postSchema.plugin(passportLocalMongoose);
const Post = mongoose.model('Post', postSchema);
export default Post;
