const express    = require("express"),
      router     = express.Router(),
      NationalPark = require("../models/nationalPark"),
      middleware = require("../middleware"), // automatically looks for index.js
      NodeGeocoder = require('node-geocoder');
      multer     = require('multer'),
      cloudinary = require('cloudinary');

// =========== Image Upload Configuration =============
//multer config
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = (req, file, cb) => {
// accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter});
//GOOGLE Map
var options = {
	provider: 'google',
	httpAdapter: 'https',
	apiKey: 'AIzaSyCq2EmNYzMLwmN1irQ7XCquetiJkKUTih8',
	formatter: null
};
var geocoder = NodeGeocoder(options);
// cloudinary config
cloudinary.config({ 
  cloud_name: 'livesfall', 
  api_key: 11111111111111, 
  api_secret: "a60tdmLxN-SgFemx-fhK43B--GE"
});

// ============= ROUTES ==============
// Define escapeRegex function to avoid regex DDoS attack
const escapeRegex = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

// INDEX -show all nationalParks
router.get("/", (req, res) => {
  let noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    NationalPark.find({name: regex}, function(err, allNationalParks) {
      if (err) { console.log(err); }
      else {
        if (allNationalParks.length < 1) {
          noMatch = "No nationalParks found, please try again.";
        }
        res.render("nationalParks/index", { nationalParks: allNationalParks, page: "nationalParks", noMatch: noMatch });  
      }
    });
  } else {
    // Get all camgrounds from DB
    NationalPark.find({}, function(err, allNationalParks) {
      if (err) { console.log(err); }
      else {
        res.render("nationalParks/index", { nationalParks: allNationalParks, page: "nationalParks", noMatch: noMatch });  
      }
    }); 
  }
});

// CREATE - add new nationalPark to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
  // cloudinary
  cloudinary.uploader.upload(req.file.path, (result) => {
     // get data from the form
    let { name, image, price, description, author } = { 
      name: req.body.name,
      image: {
        // add cloudinary public_id for the image to the nationalPark object under image property
        id: result.public_id,
        // add cloudinary url for the image to the nationalPark object under image property
        url: result.secure_url
      },
      price: req.body.price,
      description: req.body.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
  
    // geocoder for Google Maps
    geocoder.geocode(req.body.location, (err, data) => {
      if (err) throw err;
      console.log(data);
      let lat = data[0].latitude,
          lng = data[0].longitude,
          location = data[0].streetNumber+" "+data[0].streetName+", "+data[0].city+", "+data[0].country;
      let newNationalPark = { name, image, price, description, author, location, lat, lng };
    
      // create a new nationalPark and save to DB
      NationalPark.create(newNationalPark, (err, newlyCreated) => {
        if (err) { console.log(err); }
        else {
          // redirect back to nationalPark page
          res.redirect("/nationalParks");
        }
      });
    });
  });
});

// NEW
router.get("/new", middleware.isLoggedIn, (req, res) => res.render("nationalParks/new"));

// SHOW - shows more info about one nationalPark
router.get("/:id", (req, res) => {
  //find the nationalPark with provided id in DB
      NationalPark.findById(req.params.id).populate("comments").exec((err, foundNationalPark) => {
      if (err || !foundNationalPark) {
      req.flash("error", "NationalPark not found");
      res.redirect("back");
      } else {

//      console.log("EnterShowPage: ");
//      console.log("found: "+foundNationalPark);
//      console.log("EndPrint");

      //render show template with that nationalPark
      res.render("nationalParks/show", { nationalPark: foundNationalPark });
    }
  });
});

// edit nationalPark route
// store original image id and url
let imageId, imageUrl;
router.get("/:id/edit", middleware.checknationalParkOwenership, (req, res) => {
  NationalPark.findById(req.params.id, (err, foundNationalPark) => {
    imageId = foundNationalPark.image.id;
    imageUrl = foundNationalPark.image.url;
    if (err) { res.redirect("/nationalParks") }
    else { res.render("nationalParks/edit", { nationalPark: foundNationalPark }); } 
  });
});

// update nationalPark route
router.put("/:id", middleware.checknationalParkOwenership, upload.single('image'), (req, res) => {
  // if no new image to upload
  if (!req.file) {
    let { name, image, price, description, author } = { 
      name: req.body.nationalPark.name,
      image: {
        // add cloudinary public_id for the image to the nationalPark object under image property
        id: imageId,
        // add cloudinary url for the image to the nationalPark object under image property
        url: imageUrl
      },
      price: req.body.nationalPark.price,
      description: req.body.nationalPark.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
    geocoder.geocode(req.body.nationalPark.location, (err, data) => {
      if (err) throw err;
      let lat = data[0].latitude,
          lng = data[0].longitude,
          location = data[0].streetNumber+" "+data[0].streetName+", "+data[0].city+", "+data[0].country;
      let newData = { name, image, price, description, author, location, lat, lng };
      //find and update the correct nationalPark
      NationalPark.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedNationalPark) => {
        if (err) {
          req.flash("error", err.message);
          res.redirect("/nationalParks");
        } else {
          //redirect somewhere(show page)
          req.flash("success","NationalPark Updated!");
          res.redirect("/nationalParks/" + req.params.id);
        }
      });
    });
  } else {
    // cloudinary
    cloudinary.uploader.upload(req.file.path, (result) => {
      let { name, image, price, description, author } = { 
        name: req.body.nationalPark.name,
        image: {
          // add cloudinary public_id for the image to the nationalPark object under image property
          id: result.public_id,
          // add cloudinary url for the image to the nationalPark object under image property
          url: result.secure_url
        },
        price: req.body.nationalPark.price,
        description: req.body.nationalPark.description,
        // get data from the currenly login user
        author: {
          id: req.user._id,
          username: req.user.username
        }
      };
      
      // remove original/old nationalPark image on cloudinary
      cloudinary.uploader.destroy(imageId, (result) => { console.log(result) });
      
      geocoder.geocode(req.body.nationalPark.location, (err, data) => {
        if (err) throw err;
        let lat = data[0].latitude,
            lng = data[0].longitude,
            location = data[0].streetNumber+" "+data[0].streetName+", "+data[0].city+", "+data[0].country;
        let newData = { name, image, price, description, author, location, lat, lng };
        
        //find and update the correct nationalPark
        NationalPark.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedNationalPark) => {
          if (err) {
            req.flash("error", err.message);
            res.redirect("/nationalParks");
          } else {
            //redirect somewhere(show page)
            req.flash("success","NationalPark Updated!");
            res.redirect("/nationalParks/" + req.params.id);
          }
        });
      });
    });
  }
});

// destroy nationalPark route
router.delete("/:id", middleware.checknationalParkOwenership, (req, res) => {
  NationalPark.findByIdAndRemove(req.params.id, err => {
    if (err) { res.redirect("/nationalParks"); }
    else {
      req.flash("success", "NationalPark removed!");
      res.redirect("/nationalParks"); }
  });
});

module.exports = router;
