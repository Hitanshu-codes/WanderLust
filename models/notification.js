import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
    index: true,
  },
  searchRequest: {
    type: Schema.Types.ObjectId,
    ref: "SearchRequest",
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
