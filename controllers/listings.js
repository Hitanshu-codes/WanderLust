import Listing from "../models/listing.js";
import Lead from "../models/lead.js";
import SearchRequest from "../models/searchRequest.js";
import Notification from "../models/notification.js";

const normalizeText = (value = "") => String(value).toLowerCase().trim();

const saveSearchRequest = async (req, query) => {
  const searchTerm = normalizeText(query);
  if (!searchTerm) return;

  const existingRequest = await SearchRequest.findOne({
    query: searchTerm,
    status: "open",
  });

  if (existingRequest) return;

  await SearchRequest.create({
    query: searchTerm,
    location: normalizeText(req.query.location || ""),
    email: req.user?.email || "",
    phone: req.user?.phone || "",
    name: req.user?.username || "",
  });
};

const matchingListingFound = (listing, request) => {
  if (!listing) return false;

  const listingText = normalizeText(
    `${listing.title || ""} ${listing.location || ""} ${listing.country || ""}`
  );
  const searchText = normalizeText(
    `${request.query || ""} ${request.location || ""}`
  );

  if (!listingText || !searchText) return false;

  const exactQueryMatch = listingText.includes(searchText) || searchText.includes(listingText);
  const tokenOverlap = searchText
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => token.length > 2 && listingText.includes(token));

  return exactQueryMatch || tokenOverlap;
};

const notifyMatchingSearchRequests = async (listing) => {
  if (!listing || listing.isAvailable === false) return;

  const openRequests = await SearchRequest.find({ status: "open" });

  for (const request of openRequests) {
    if (!matchingListingFound(listing, request)) continue;

    const alreadyNotified = await Notification.findOne({
      listing: listing._id,
      searchRequest: request._id,
    });

    if (alreadyNotified) continue;

    await Notification.create({
      listing: listing._id,
      searchRequest: request._id,
      message: `A new listing matching "${request.query}" is now available: ${listing.title}.`,
    });

    request.status = "notified";
    request.notifiedAt = new Date();
    request.matches.push(listing._id);
    await request.save();
  }
};

const index = async (req, res) => {
  const searchQuery = req.query.search || req.query.q || "";

  let allListing = [];

  if (searchQuery) {
    const regex = new RegExp(searchQuery, "i");
    allListing = await Listing.find({
      $or: [{ title: regex }, { location: regex }, { country: regex }],
    });

    if (!allListing.length) {
      await saveSearchRequest(req, searchQuery);
    }
  } else {
    allListing = await Listing.find({});
  }

  res.render("listing/index", { allListing, searchQuery });
};

const newRoute = async (req,res)=>{
  res.render("listing/new.ejs")
}

const create = async (req,res, next)=>{
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
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  newListing.geometry = { type: "Point", coordinates };
  newListing.isAvailable = req.body.listing.isAvailable === "true" || req.body.listing.isAvailable === true;

  await newListing.save();
  await notifyMatchingSearchRequests(newListing);

  req.flash("success", "Listing created successfully!");
  return res.redirect("/listings");
};

const showListing = async (req,res)=>{
  let {id}= req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");

  if(!listing){
    req.flash("error", "Listing does not exist");
    return res.redirect("/listings");
  }

  res.render("listing/show.ejs", {listing});
};

const edit = async (req,res)=>{
  let {id}= req.params;
  const listing=await Listing.findById(id);
  if(!listing){
    req.flash("error", "Listing does not exist");
    return res.redirect("/listings");
  }

  let originalImage = listing.image.url;
  let originalImageUrl = originalImage.replace("/upload", "/upload/w_250")
  res.render("listing/edit.ejs", {listing, originalImageUrl})
};

const update = async (req,res)=>{
  let {id}= req.params;
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

  const updatePayload = { ...req.body.listing };
  updatePayload.geometry = {
    type: "Point",
    coordinates: geoData.features[0].geometry.coordinates,
  };
  updatePayload.isAvailable = req.body.listing.isAvailable === "true" || req.body.listing.isAvailable === true;

  let listing = await Listing.findByIdAndUpdate(id, updatePayload, { new: true });

  if(typeof req.file !== "undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url, filename};
    await listing.save();
  }

  await notifyMatchingSearchRequests(listing);

  req.flash("success", "Listing updated successfully!");
  res.redirect(`/listings/${id}`);
};

const deleteRoute = async (req,res)=>{
  let {id}= req.params;
  let delListing= await Listing.findByIdAndDelete(id);
  console.log(delListing);
  req.flash("success", "Listing deleted successfully!");
  res.redirect("/listings");
};

const createLead = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
  }

  const { name, email, phone, message } = req.body.lead || req.body;

  if (!name || !email || !message) {
    req.flash("error", "Please fill in your name, email, and message.");
    return res.redirect(`/listings/${id}`);
  }

  const lead = new Lead({
    listing: listing._id,
    name,
    email,
    phone: phone || "",
    message,
  });

  await lead.save();
  req.flash("success", "Thanks! We have captured your interest for this listing.");
  return res.redirect(`/listings/${id}`);
};

export {index, newRoute, create, showListing, edit, update, deleteRoute, createLead, saveSearchRequest, notifyMatchingSearchRequests};
