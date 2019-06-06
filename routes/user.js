const express    = require("express"),
      router     = express.Router(),
      User       = require("../models/user"),
      nationalPark = require("../models/nationalPark"),
      middleware = require("../middleware");
      
// User profile
router.get("/:id", middleware.isLoggedIn, (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err || !foundUser) {
      req.flash("error", "Something went wrong...");
      res.redirect("/nationalParks");
    } else {
      nationalPark.find().where("author.id").equals(foundUser._id).exec((err, nationalParks) => {
        if (err) {
          req.flash("error", "Something went wrong...");
          res.redirect("/nationalParks");
        } else { res.render("users/show", { user: foundUser, nationalParks }); }
      });
    }
  });
});

// show edit form
router.get("/:id/edit", middleware.isLoggedIn, (req, res) => {
  User.findById(req.params.id, (err, foundUser) => {
    if (err || !foundUser) { return res.redirect("back"); }
    if (foundUser._id.equals(req.user._id)) {
      res.render("users/edit", { user: foundUser }); 
    } else {
      req.flash("error", "You don't have permission to do that");
      res.redirect("back");
    } 
  });
});

// update profile
router.put("/:id", middleware.isLoggedIn, (req, res) => {
  User.findByIdAndUpdate(req.params.id, req.body.user, (err, updatedUser) => {
    if (err) {
      if (err.namcampgrounde === 'MongoError' && err.code === 11000) {
        // Duplicate email
        req.flash("error", "That email has already been registered.");
        return res.redirect("/users" + req.params.id);
      } 
      // Some other error
      req.flash("error", "Something went wrong...");
      return res.redirect("/users" + req.params.id);
    }
    if (updatedUser._id.equals(req.user._id)) {
      res.redirect("/users/" + req.params.id);
    } else {
      req.flash("error", "You don't have permission to do that");
      res.redirect("/nationalParks");
    }
  });
});

module.exports = router;