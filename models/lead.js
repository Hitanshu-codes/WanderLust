import mongoose from "mongoose";
const { Schema } = mongoose;
import Listing from "./listing.js";

const leadSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
    index: true,
  },
  name: {
    type: String,
    trim: true,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  message: {
    type: String,
    trim: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

leadSchema.post("save", async function () {
  const listing = await Listing.findById(this.listing);
  if (listing && !listing.leads.includes(this._id)) {
    listing.leads.push(this._id);
    await listing.save();
  }
});

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
