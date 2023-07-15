import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";

// Define the schema for the "classes" collection
const classSchema = new mongoose.Schema({
  createdByName: {
    type: String,
    required: true
  },
  createdByID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  createdByusername: {
    type: String,
    required: true,
  },
  classTitle: {
    type: String,
    required: true
  },
  classYear: {
    type: Number,
    required: true
  },
  classSection: {
    type: String,
    required: true
  },
  classDesc: {
    type: String,
    required: true
  },
  classCode: {
    type: String,
    required: true,
    unique: true
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  userAccepting: {
    type: Boolean,
    default: true
  }
});

// Create the "classes" model

classSchema.plugin(passportLocalMongoose);
const Class = mongoose.model('Class', classSchema);
export default Class;

