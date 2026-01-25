import Listing from "../models/listing.js";

const index = async (req, res) => {
  const allListing = await Listing.find({});
  res.render("listing/index", { allListing });
}

const newRoute = async (req,res)=>{

  res.render("listing/new.ejs")
}


const create = async (req,res, next)=>{
    // 1️⃣ Forward geocoding: place name → coordinates
  const geoRes = await fetch(
    `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      req.body.listing.location
    )}&apiKey=${process.env.GEOAPIFY_KEY}`
  );

  const geoData = await geoRes.json();

  if (!geoData.features || geoData.features.length === 0) {
    req.flash("error", "Location not found");
    return res.redirect("/listings/new");
  }

  const coordinates = geoData.features[0].geometry.coordinates;

  let url = req.file.path;
  let filename = req.file.filename;
  const newListing=new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = {url, filename}
  newListing.geometry = {type: "Point", coordinates};
  let geotude=await newListing.save();
  console.log(geotude)
  req.flash("success", "Listing created successfully!")
  return res.redirect("/listings")
}


const showListing = async (req,res)=>{
    let {id}= req.params;
    const listing=await Listing.findById(id).
    populate({path :"reviews", populate:{path:"author"}}).populate("owner");
    if(!listing){
    req.flash("error", "Listing does not exist")
    return res.redirect("/listings")
    }
    res.render("listing/show.ejs",{listing});
}


const edit = async (req,res)=>{
  let {id}= req.params;
  const listing=await Listing.findById(id);
  if(!listing){
    req.flash("error", "Listing does not exist")
    return res.redirect("/listings")

  }
  let originalImage = listing.image.url;
  let originalImageUrl = originalImage.replace("/upload", "/upload/w_250")
  res.render("listing/edit.ejs",{listing, originalImageUrl})
}


const update = async (req,res)=>{
  let {id}= req.params;
    // 👉 IMPLEMENTATION: forward geocoding (place → coordinates)
  const geoRes = await fetch(
    `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      req.body.listing.location
    )}&apiKey=${process.env.GEOAPIFY_KEY}`
  );

  const geoData = await geoRes.json();

  if (!geoData.features || geoData.features.length === 0) {
    req.flash("error", "Location not found");
    return res.redirect(`/listings/${id}/edit`);
  }

  // attach geometry to update payload
  req.body.listing.geometry = {
    type: "Point",
    coordinates: geoData.features[0].geometry.coordinates
  };
  let listing = await Listing.findByIdAndUpdate(id,{...req.body.listing});

  if(typeof req.file !== "undefined"){
  let url = req.file.path;
  let filename = req.file.filename;
  listing.image = {url, filename}
  await listing.save();
  }
  


  req.flash("success", "Listing updated successfully!")
  res.redirect(`/listings/${id}`);
}

const deleteRoute = async (req,res)=>{
  let {id}= req.params;
  let delListing= await Listing.findByIdAndDelete(id);
  console.log(delListing);
  req.flash("success", "Listing deleted successfully!")
  res.redirect("/listings")
}



export {index, newRoute, create, showListing, edit, update, deleteRoute}