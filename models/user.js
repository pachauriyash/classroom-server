import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

// Create a Mongoose schema and model
const userSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    username: String,
    password: String,
    classowned: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    classenrolled: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  {timestamps:true}
  );
  userSchema.plugin(passportLocalMongoose);
  const User = mongoose.model('User', userSchema);
  export default User;