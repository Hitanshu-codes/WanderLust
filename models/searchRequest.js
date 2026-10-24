import mongoose from "mongoose";

const { Schema } = mongoose;

const searchRequestSchema = new Schema({
  query: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
    default: "",
  },
  email: {
    type: String,
    trim: true,
    default: "",
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  name: {
    type: String,
    trim: true,
    default: "",
  },
  status: {
    type: String,
    enum: ["open", "notified"],
    default: "open",
  },
  notifiedAt: {
    type: Date,
    default: null,
  },
  matches: [{
    type: Schema.Types.ObjectId,
    ref: "Listing",
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SearchRequest = mongoose.model("SearchRequest", searchRequestSchema);
export default SearchRequest;
