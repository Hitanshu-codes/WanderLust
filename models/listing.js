import mongoose from "mongoose";
const { Schema } = mongoose;
import Review from "./review.js";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1765673801268-3be01e61d383?q=80&w=687&auto=format&fit=crop";

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },

  description: String,

  image: {
    filename :String,
    url: String,
    
  },
  price: {
    type:Number,
    required:true,
    min:0,
  },
  location: String,
  country: String,

  reviews: [{
    type: Schema.Types.ObjectId,
    ref:"Review"
 }],
 owner :{
  type : Schema.Types.ObjectId,
  ref : "User"
 },
 geometry: {
  type: {
    type: String,
    enum: ["Point"],
    required: true
  },
  coordinates: {
    type: [Number], // [lng, lat]
    required: true
  }
}

});

listingSchema.post("findOneAndDelete", async (listing)=>{

  if(listing){
    await Review.deleteMany({_id: {$in:listing.reviews}});
  }
  
})

const Listing = mongoose.model("Listing", listingSchema);
export default Listing;
